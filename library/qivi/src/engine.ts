import * as THREE from "three";
import {
  BASE,
  EXPRESSIONS,
  SPRING_KEYS,
  STATES,
  composeTarget,
  personalityFor,
  dominantShape,
  paletteFor,
  tauFor,
  type ParamKey,
  type Params,
} from "./presets";
import { auraFragment, faceFragment, glyphFragment, moonFragment, moonVertex, particleFragment, particleVertex, unitQuadVertex } from "./shaders";
import { SHAPE_SAMPLES, buildShapeTable, type QiviShape } from "./shapes";
import { QiviVoice, SILENT, type VoiceFrame } from "./voice";
import { DEFAULT_CONFIG, type Palette, type QiviConfig, type QiviExpression, type QiviImpulse } from "./types";

// A canvas can be reused by React StrictMode's synchronous effect replay.
// Ownership prevents a retired renderer from losing its replacement's context.
const contextOwners = new WeakMap<HTMLCanvasElement, symbol>();

const EYE_R = 0.19;
const EYE_DX = 0.34;
const KEYS = Object.keys(BASE) as ParamKey[];
const COLOR_KEYS = ["deep", "mid", "pale", "warm", "hi", "accent"] as const;

type V2 = { x: number; y: number };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const damp = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function buildParticles(n: number) {
  const home = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  const cls = new Float32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    const c = roll < 0.64 ? 0 : roll < 0.86 ? 1 : 2;
    v.randomDirection();
    if (c === 0) v.multiplyScalar(Math.pow(Math.random(), 0.42));
    else if (c === 1) v.multiplyScalar(0.88 + Math.random() * 0.22);
    else {
      if (v.x > 0 && Math.random() < 0.25) v.x *= -1;
      v.multiplyScalar(1.0 + Math.pow(Math.random(), 1.6) * 0.7);
    }
    home.set([v.x, v.y, v.z], i * 3);
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    cls[i] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aHome", new THREE.BufferAttribute(home, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  g.setAttribute("aClass", new THREE.BufferAttribute(cls, 1));
  return g;
}

function glyphTexture(kind: "?" | "!" | "z") {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (kind === "z") {
    ctx.font = "800 54px Outfit, system-ui, sans-serif";
    ctx.fillText("z", 44, 82);
    ctx.font = "800 72px Outfit, system-ui, sans-serif";
    ctx.fillText("Z", 86, 44);
  } else {
    ctx.font = "800 104px Outfit, system-ui, sans-serif";
    ctx.save();
    ctx.translate(64, 66);
    ctx.rotate(kind === "!" ? 0.25 : 0.12);
    ctx.fillText(kind, 0, 0);
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function quadMaterial(fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extent: number) {
  return new THREE.ShaderMaterial({
    vertexShader: unitQuadVertex,
    fragmentShader,
    uniforms: { uCenter: { value: new THREE.Vector2() }, uSize: { value: 100 }, uExtent: { value: extent }, ...uniforms },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    premultipliedAlpha: true,
  });
}

function buildMoon(n: number) {
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) seed[i] = Math.random();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  return g;
}

let shapeTable: THREE.Vector4[] | null = null;
function shapeUniform() {
  if (!shapeTable) {
    const t = buildShapeTable();
    shapeTable = Array.from({ length: SHAPE_SAMPLES }, (_, i) => new THREE.Vector4(t[i * 4], t[i * 4 + 1], t[i * 4 + 2], t[i * 4 + 3]));
  }
  return shapeTable;
}

export interface QiviEngineOptions {
  /** Called when the user clicks/taps on Qivi itself. */
  onPoke?: () => void;
}

/**
 * Renders one Qivi into a canvas. Coordinates are canvas-relative, so the same engine powers a
 * full-viewport layer (Qivi can travel across the UI) or a contained avatar canvas.
 */
export class QiviEngine {
  private renderer: THREE.WebGLRenderer;
  private contextOwner = Symbol("qivi-renderer");
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10000, 10000);
  private geometry: THREE.BufferGeometry;
  private points: THREE.Points;
  private pMat: THREE.ShaderMaterial;
  private faceMat: THREE.ShaderMaterial;
  private moonMat: THREE.ShaderMaterial;
  private moonGeo = buildMoon(420);
  private auraMat: THREE.ShaderMaterial;
  private glyphs: { mat: THREE.ShaderMaterial; key: ParamKey; off: V2; tex: THREE.Texture }[] = [];
  private quad = new THREE.PlaneGeometry(2, 2);
  private resizeObs: ResizeObserver;
  private raf = 0;
  private active = true;
  private last = performance.now();
  private disposed = false;

  private cfg: QiviConfig = { ...DEFAULT_CONFIG };
  private cur: Params = { ...BASE };
  private tgt: Params = { ...BASE };
  private vel: Partial<Record<ParamKey, number>> = {};
  private col = Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color()])) as Record<(typeof COLOR_KEYS)[number], THREE.Color>;
  private colTgt = Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color()])) as Record<(typeof COLOR_KEYS)[number], THREE.Color>;
  private status = new THREE.Color("#e8473a");
  private statusTgt = new THREE.Color("#e8473a");
  private orbCol = new THREE.Color();
  private tmpCol = new THREE.Color();

  private anchorEl: HTMLElement | null = null;
  private streamEl: HTMLElement | null = null;
  /** Canvas layout size plus its on-screen origin and scale (sx/sy differ from 1 under ancestor CSS transforms). */
  private rect = { left: 0, top: 0, width: 1, height: 1, sx: 1, sy: 1 };
  private pos: V2 = { x: -1, y: -1 };
  private posVel: V2 = { x: 0, y: 0 };
  private size = 120;

  private t = { noise: 0, orbit: 0, stream: 0, free: 0, breath: 0, real: 0, swirl: 0, moon: 0, voice: 0 };
  private burst = 0;
  private burstVel = 0;
  private freeze = 0;
  private shiver = 0;
  private sweepStart = -10;
  private pending: { at: number; fn: () => void }[] = [];
  private glitchY = 0;
  private nextGlitch = 0;

  private blinkStart = -1;
  private nextBlink = rand(1.4, 4.2);
  private saccade: V2 = { x: 0, y: 0 };
  private nextSaccade = rand(0.6, 2.2);
  private look: V2 = { x: 0, y: 0 };
  private pointer = { cx: 0, cy: 0, active: false, strength: 0 };
  private poke = { x: 0, y: 0, z: 1, age: 10 };
  private streamW = 0;
  private voiceSrc: QiviVoice | null = null;
  private simVoice: QiviVoice | null = null;
  private simulateVoice = false;
  private vf: VoiceFrame = { ...SILENT };
  private listenW = 0;
  private talkW = 0;
  /** slow "breathing" voice envelope: drives body, eyes, head, moon (the fast frame only moves the mouth) */
  private ve = { level: 0, low: 0, mid: 0, high: 0, pitch: 0 };
  private mouthOpen = 0;
  private lastPointerMove = -1e9;
  private ptrAttn = 0;
  private lastActivity = performance.now();
  private sleeping = false;
  private override: { expr: QiviExpression; until: number } | null = null;
  private nextRandomBurst = 5;
  private probe = { start: -10, target: { x: 0, y: 0 } };
  private nextProbe = 6;
  private lastExpr: QiviExpression = "neutral";
  private lastState = "idle";
  private lastShape: QiviShape = "blob";
  private streamUnit: V2 = { x: 2, y: 0.3 };

  constructor(private canvas: HTMLCanvasElement, private opts: QiviEngineOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance", premultipliedAlpha: true });
    contextOwners.set(canvas, this.contextOwner);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.geometry = buildParticles(this.cfg.particleBudget);
    this.pMat = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uCenter: { value: new THREE.Vector2() },
        uSize: { value: 100 },
        uDpr: { value: 1 },
        uShape: { value: new THREE.Vector4() },
        uBreath: { value: new THREE.Vector3() },
        uNoise: { value: new THREE.Vector4() },
        uFree: { value: new THREE.Vector4() },
        uOrbit: { value: new THREE.Vector3() },
        uStream: { value: new THREE.Vector4() },
        uStreamTarget: { value: new THREE.Vector2() },
        uFx: { value: new THREE.Vector4() },
        uGlitchY: { value: 0 },
        uAttend: { value: new THREE.Vector2() },
        uVel: { value: new THREE.Vector2() },
        uHover: { value: new THREE.Vector4() },
        uPoke: { value: new THREE.Vector4(0, 0, 1, 10) },
        uThink: { value: new THREE.Vector4() },
        uVoice: { value: new THREE.Vector4() },
        uVoice2: { value: new THREE.Vector4() },
        uVoice3: { value: new THREE.Vector4() },
        uEyeL: { value: new THREE.Vector4() },
        uEyeR: { value: new THREE.Vector4() },
        uLook: { value: new THREE.Vector3() },
        uStatus: { value: new THREE.Vector2() },
        uRot: { value: new THREE.Vector4() },
        uMorph: { value: new THREE.Vector4() },
        uShapes: { value: shapeUniform().map(v => v.clone()) },
        uOrb: { value: new THREE.Vector4() },
        uOrbCol: { value: this.orbCol },
        uSweep: { value: new THREE.Vector4() },
        uColDeep: { value: this.col.deep },
        uColMid: { value: this.col.mid },
        uColPale: { value: this.col.pale },
        uColWarm: { value: this.col.warm },
        uColHi: { value: this.col.hi },
        uColStatus: { value: this.status },
      },
    });
    this.points = new THREE.Points(this.geometry, this.pMat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;

    this.auraMat = quadMaterial(auraFragment, {
      uCool: { value: this.col.mid },
      uWarm: { value: this.col.warm },
      uShadow: { value: this.col.deep },
      uAlpha: { value: 1 },
      uDark: { value: 0 },
      uWarmAmt: { value: 1 },
      uGround: { value: -0.95 },
    }, 2.4);
    this.faceMat = quadMaterial(faceFragment, {
      uEyeL: { value: new THREE.Vector4() },
      uEyeR: { value: new THREE.Vector4() },
      uEyeLB: { value: new THREE.Vector4() },
      uEyeRB: { value: new THREE.Vector4() },
      uFaceA: { value: new THREE.Vector4() },
      uFaceB: { value: new THREE.Vector4() },
      uMouth: { value: new THREE.Vector4() },
      uPx: { value: 0.01 },
      uDark: { value: 0 },
      uRingCol: { value: new THREE.Color("#eaf3ff") },
      uMouthCol: { value: new THREE.Color("#0b1230") },
      uMouth2: { value: new THREE.Vector4() },
    }, 1.4);
    this.moonMat = new THREE.ShaderMaterial({
      vertexShader: moonVertex,
      fragmentShader: moonFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uCenter: { value: new THREE.Vector2() },
        uSize: { value: 100 },
        uDpr: { value: 1 },
        uMoonStatic: { value: new THREE.Vector4() },
        uMoonOrbit: { value: new THREE.Vector4() },
        uRotM: { value: new THREE.Vector4() },
        uBodyWH: { value: new THREE.Vector2(1, 1) },
        uColor: { value: this.orbCol },
      },
    });

    const add = (mat: THREE.Material, order: number) => {
      const m = new THREE.Mesh(this.quad, mat);
      m.frustumCulled = false;
      m.renderOrder = order;
      this.scene.add(m);
    };
    add(this.auraMat, 0);
    this.scene.add(this.points);
    add(this.faceMat, 3);
    const moon = new THREE.Points(this.moonGeo, this.moonMat);
    moon.frustumCulled = false;
    moon.renderOrder = 4;
    this.scene.add(moon);
    for (const [kind, key, off] of [["?", "gQuestion", { x: 0.95, y: 1.0 }], ["!", "gExclaim", { x: 1.05, y: 0.82 }], ["z", "gZzz", { x: 0.92, y: 0.95 }]] as const) {
      const tex = glyphTexture(kind);
      const tint = key === "gZzz" ? this.col.mid : this.orbCol;
      const mat = quadMaterial(glyphFragment, { uMap: { value: tex }, uAlpha: { value: 0 }, uTint: { value: tint }, uRect: { value: new THREE.Vector4(0, 0, 1, 1) } }, 1);
      this.glyphs.push({ mat, key, off, tex });
      add(mat, 5);
    }

    this.applyPalette(true);
    this.retarget();
    for (const k of KEYS) this.cur[k] = this.tgt[k];
    this.cur.dissolve = 1; // first appearance: Qivi assembles out of the air
    this.cur.opacity = 0;

    this.resizeObs = new ResizeObserver(this.onResize);
    this.resizeObs.observe(canvas);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("keydown", this.onActivity, { passive: true });
    this.onResize();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ---------- public API ----------
  setConfig(next: Partial<QiviConfig>) {
    const prev = this.cfg;
    this.cfg = { ...this.cfg, ...next };
    if (next.particleBudget && next.particleBudget !== prev.particleBudget) {
      this.geometry.dispose();
      this.geometry = buildParticles(this.cfg.particleBudget);
      this.points.geometry = this.geometry;
    }
    if (next.dark !== undefined && next.dark !== prev.dark) {
      for (const m of [this.pMat, this.moonMat]) {
        m.blending = this.cfg.dark ? THREE.AdditiveBlending : THREE.NormalBlending;
        m.needsUpdate = true;
      }
    }
    if (next.state && next.state !== prev.state) this.lastActivity = performance.now();
    this.applyPalette(false);
    this.retarget();
  }

  setAnchor(el: HTMLElement | null) {
    this.anchorEl = el;
  }

  /**
   * Voice driving the listening (user's voice) and talking (Qivi's voice) states.
   * "simulate" uses built-in babble so previews animate without audio.
   */
  setVoice(src: QiviVoice | "simulate" | null) {
    this.voiceSrc = src instanceof QiviVoice ? src : null;
    this.simulateVoice = src === "simulate";
  }

  setStreamTarget(el: HTMLElement | null) {
    this.streamEl = el;
  }

  /** Pause rendering when offscreen (performance tiers: never animate invisible avatars). */
  setActive(active: boolean) {
    if (active === this.active || this.disposed) return;
    this.active = active;
    cancelAnimationFrame(this.raf);
    if (active) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  impulse(kind: QiviImpulse | QiviImpulse[]) {
    if (Array.isArray(kind)) return kind.forEach((k) => this.impulse(k));
    const reduced = this.cfg.reducedMotion;
    if (reduced && kind !== "glitch" && kind !== "sweep") return;
    const now = this.t.real;
    switch (kind) {
      case "bounce":
        this.vel.stretch = (this.vel.stretch ?? 0) + 1.4;
        this.burstVel += 0.5;
        break;
      case "burst":
        this.burstVel += 2.6;
        break;
      case "surprise":
        this.freeze = 0.22;
        this.burstVel -= 1.2;
        this.pending.push({ at: now + 0.22, fn: () => (this.burstVel += 3) });
        break;
      case "flick":
        this.vel.lean = (this.vel.lean ?? 0) + 1.6;
        this.burstVel += 0.9;
        break;
      case "anticipate":
        this.burstVel -= 1.6;
        this.vel.stretch = (this.vel.stretch ?? 0) - 0.8;
        this.pending.push({ at: now + 0.26, fn: () => { this.burstVel += 2.4; this.vel.stretch = (this.vel.stretch ?? 0) + 1.6; } });
        break;
      case "glitch":
        this.glitchY = rand(-0.4, 0.3);
        break;
      case "ripple":
        this.pokeAt(this.pointer.cx, this.pointer.cy, true);
        break;
      case "sweep":
        if (now - this.sweepStart > 0.6) this.sweepStart = now;
        break;
      case "shiver":
        this.shiver = Math.max(this.shiver, 1);
        break;
    }
  }

  /** Cancel queued one-off reactions when a host interrupts a performance. */
  resetReactions() {
    this.pending = [];
    this.vel = {};
    this.burst = this.burstVel = this.freeze = this.shiver = this.glitchY = 0;
    this.sweepStart = -10;
    this.poke.age = 10;
    this.override = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.simVoice?.dispose();
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("keydown", this.onActivity);
    this.geometry.dispose();
    this.quad.dispose();
    this.moonGeo.dispose();
    for (const m of [this.pMat, this.faceMat, this.moonMat, this.auraMat]) m.dispose();
    for (const g of this.glyphs) { g.mat.dispose(); g.tex.dispose(); }
    this.renderer.dispose();
    const { canvas, renderer, contextOwner } = this;
    // Defer until effect replay has had a chance to claim the same canvas.
    // renderer.dispose() alone does not release the browser's WebGL context slot.
    queueMicrotask(() => {
      if (contextOwners.get(canvas) !== contextOwner) return;
      contextOwners.delete(canvas);
      renderer.forceContextLoss();
    });
  }

  // ---------- internals ----------
  private activeExpression(): QiviExpression {
    if (this.override && this.override.until > this.t.real) return this.override.expr;
    if (this.sleeping) return "sleepy";
    return this.cfg.expression;
  }

  private retarget() {
    const expr = this.activeExpression();
    this.tgt = composeTarget(this.cfg, expr);
    if (this.cfg.reducedMotion) {
      this.tgt.orbit = 0;
      this.tgt.stream = 0;
      this.tgt.breath *= 0.4;
    }
    if (expr !== this.lastExpr) {
      const imp = (this.cfg.expressionDefinition ?? EXPRESSIONS[expr]).impulse;
      if (imp && this.cfg.autoEmote !== false) this.impulse(imp);
      this.lastExpr = expr;
    }
    if (this.cfg.state !== this.lastState) {
      const imp = STATES[this.cfg.state].impulse;
      if (imp && this.cfg.autoEmote !== false) this.impulse(imp);
      this.lastState = this.cfg.state;
      const s = STATES[this.cfg.state].status;
      if (s) this.statusTgt.set(s);
    }
    const shape = dominantShape(this.tgt);
    if (shape !== this.lastShape) {
      if (this.cfg.autoEmote !== false) this.impulse("sweep");
      this.lastShape = shape;
    }
  }

  private transitionScale() {
    const v = this.cfg.transitionSpeed;
    return Number.isFinite(v) ? Math.max(0.5, Math.min(4, v!)) : 1;
  }

  private applyPalette(instant: boolean) {
    const pal: Palette = paletteFor(this.cfg);
    for (const k of COLOR_KEYS) {
      this.colTgt[k].set(pal[k]);
      if (instant) this.col[k].copy(this.colTgt[k]);
    }
  }

  /** Layout size, which CSS transforms do not change; the camera and the per-frame rect must agree on it. */
  private layoutSize() {
    const r = this.canvas.getBoundingClientRect();
    return { r, w: Math.max(1, this.canvas.clientWidth || r.width), h: Math.max(1, this.canvas.clientHeight || r.height) };
  }

  /** Screen point -> canvas-local layout px. */
  private toLocal(clientX: number, clientY: number) {
    return { x: (clientX - this.rect.left) / this.rect.sx, y: (clientY - this.rect.top) / this.rect.sy };
  }

  private onResize = () => {
    const { w, h } = this.layoutSize();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
  };

  private onActivity = () => {
    this.lastActivity = performance.now();
    if (this.sleeping) {
      this.sleeping = false;
      this.override = { expr: "surprised", until: this.t.real + 0.8 };
      this.retarget();
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    this.pointer.cx = e.clientX;
    this.pointer.cy = e.clientY;
    this.pointer.active = true;
    this.lastPointerMove = performance.now() / 1000;
    this.onActivity();
  };

  private onPointerLeave = () => {
    this.pointer.active = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    this.onPointerMove(e);
    if (!this.cfg.interactive) return;
    const { x, y } = this.toLocal(e.clientX, e.clientY);
    if (Math.hypot(x - this.pos.x, y - this.pos.y) < this.size * 1.15) {
      this.pokeAt(e.clientX, e.clientY, true);
      this.vel.stretch = (this.vel.stretch ?? 0) - 0.6;
      if (this.cfg.state === "idle" || this.cfg.state === "listening") {
        this.override = { expr: Math.random() < 0.5 ? "happy" : "playful", until: this.t.real + 1.1 };
        this.retarget();
      }
      this.opts.onPoke?.();
    }
  };

  /** Press into Qivi's 3D surface at a screen point: dent + volumetric wave. */
  private pokeAt(clientX: number, clientY: number, force = false) {
    const S = this.size;
    const w = this.cur.width;
    const h = this.cur.height;
    const local = this.toLocal(clientX, clientY);
    let hx = (local.x - this.pos.x) / S;
    let hy = -(local.y - this.pos.y) / S;
    const r = Math.hypot(hx / w, hy / h);
    if (r > 1 && !force) return;
    if (r > 0.98) { hx *= 0.98 / r; hy *= 0.98 / r; }
    const rr = Math.min(0.98, Math.hypot(hx / w, hy / h));
    this.poke = { x: hx, y: hy, z: Math.sqrt(1 - rr * rr) * 0.95, age: 0 };
  }

  /** Anchor centre/size in canvas-local px. */
  private readAnchor() {
    if (!this.anchorEl) return null;
    const r = this.anchorEl.getBoundingClientRect();
    const c = this.toLocal(r.left + r.width / 2, r.top + r.height / 2);
    const m = Math.min(r.width / this.rect.sx, r.height / this.rect.sy);
    return { x: c.x, y: c.y, size: m * (m < 140 ? 0.44 : 0.34) };
  }

  private frame = (now: number) => {
    if (this.disposed || !this.active) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { r, w, h } = this.layoutSize();
    this.rect = { left: r.left, top: r.top, width: w, height: h, sx: r.width / w || 1, sy: r.height / h || 1 };
    this.update(dt, now);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number, nowMs: number) {
    const T = this.t;
    T.real += dt;
    const pers = personalityFor(this.cfg);
    const reduced = this.cfg.reducedMotion;
    const motion = reduced ? 0.12 : 1;
    const vw = this.rect.width;
    const vh = this.rect.height;

    // behaviours that change the active expression
    if (this.override && this.override.until <= T.real) {
      this.override = null;
      this.retarget();
    }
    if (this.cfg.autoSleep && this.cfg.state === "idle" && !this.sleeping && nowMs - this.lastActivity > 40000) {
      this.sleeping = true;
      this.retarget();
    }
    if (this.sleeping && this.cfg.state !== "idle") {
      this.sleeping = false;
      this.retarget();
    }
    this.pending = this.pending.filter((p) => (p.at <= T.real ? (p.fn(), false) : true));

    if (!reduced && pers.randomBurst && T.real > this.nextRandomBurst) {
      this.burstVel += rand(0.8, 2);
      if (Math.random() < 0.4) this.vel.lean = (this.vel.lean ?? 0) + rand(-1.4, 1.4);
      this.nextRandomBurst = T.real + rand(pers.randomBurst * 0.5, pers.randomBurst * 1.5);
    }
    if (!reduced && pers.probe && this.cfg.state === "idle" && T.real > this.nextProbe) {
      const a = rand(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI);
      this.probe = { start: T.real, target: { x: Math.cos(a) * 1.9, y: Math.sin(a) * 1.2 + 0.3 } };
      this.nextProbe = T.real + rand(pers.probe * 0.7, pers.probe * 1.4);
    }

    // anchor follow (spring) -> Qivi can fly between placements seamlessly
    const anchor = this.readAnchor() ?? { x: vw / 2, y: vh / 2, size: Math.min(vw, vh) * 0.34 };
    if (this.pos.x < 0) {
      this.pos = { x: anchor.x, y: anchor.y };
      this.size = anchor.size;
    }
    const kPos = 70, cPos = 15;
    this.posVel.x += (kPos * (anchor.x - this.pos.x) - cPos * this.posVel.x) * dt;
    this.posVel.y += (kPos * (anchor.y - this.pos.y) - cPos * this.posVel.y) * dt;
    this.pos.x += this.posVel.x * dt;
    this.pos.y += this.posVel.y * dt;
    this.size += (anchor.size - this.size) * damp(dt, 0.3);
    const S = this.size;

    // stream target in unit space
    let streamTarget: V2 | null = null;
    if (this.streamEl) {
      const r = this.streamEl.getBoundingClientRect();
      const c = this.toLocal(r.left + r.width / 2, r.top + r.height / 2);
      streamTarget = { x: (c.x - this.pos.x) / S, y: -(c.y - this.pos.y) / S };
    }
    const probeAge = T.real - this.probe.start;
    const probeAmt = probeAge < 1.8 ? Math.sin((probeAge / 1.8) * Math.PI) : 0;
    const probing = probeAmt > 0.01 && this.cfg.state === "idle";
    const st = probing ? this.probe.target : streamTarget ?? this.streamUnit;
    // particles only ever stream toward a real target; without one they stay home
    this.streamW += ((streamTarget || probing ? 1 : 0) - this.streamW) * damp(dt, 0.3);
    this.streamUnit.x += (st.x - this.streamUnit.x) * damp(dt, 0.25);
    this.streamUnit.y += (st.y - this.streamUnit.y) * damp(dt, 0.25);

    // Per-instance radial shape customization, blended without mutating shared tables.
    const shapes = this.pMat.uniforms.uShapes.value as THREE.Vector4[];
    const radial = this.cfg.customShape;
    for (let i = 0; i < SHAPE_SAMPLES; i++) {
      let radius = shapeUniform()[i].x;
      if (radial && radial.length >= 3) {
        const at = i / SHAPE_SAMPLES * radial.length;
        const a = radial[Math.floor(at) % radial.length];
        const b = radial[(Math.floor(at) + 1) % radial.length];
        if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) radius = Math.max(0.1, Math.min(2, a + (b - a) * (at % 1)));
      }
      shapes[i].x += (radius - shapes[i].x) * damp(dt, 0.42 * this.transitionScale());
    }

    // smooth every parameter toward its target
    const tgt = this.tgt;
    for (const k of KEYS) {
      if (SPRING_KEYS.includes(k)) continue;
      this.cur[k] += (tgt[k] - this.cur[k]) * damp(dt, tauFor(k) * this.transitionScale());
    }
    if (probeAmt > 0) this.cur.stream = Math.max(this.cur.stream, probeAmt * 0.35);
    for (const k of SPRING_KEYS) {
      const scale = this.transitionScale();
      const v = (this.vel[k] ?? 0) + (140 / scale * (tgt[k] - this.cur[k]) - 13 / Math.sqrt(scale) * (this.vel[k] ?? 0)) * dt;
      this.vel[k] = v;
      this.cur[k] += v * dt * (reduced ? 0.5 : 1);
    }
    this.burstVel += (-60 * this.burst - 9 * this.burstVel) * dt;
    this.burst += this.burstVel * dt;
    if (reduced) this.burst *= 0.2;
    this.shiver *= Math.exp(-dt / 0.35);
    for (const k of COLOR_KEYS) this.col[k].lerp(this.colTgt[k], damp(dt, 0.45 * this.transitionScale()));
    this.status.lerp(this.statusTgt, damp(dt, 0.3));
    const c = this.cur;

    // time accumulators: integrating speed keeps motion continuous when speeds change
    this.freeze = Math.max(0, this.freeze - dt);
    const live = this.freeze > 0 ? 0.03 : 1;
    T.noise += dt * c.noiseSpeed * live * (reduced ? 0.25 : 1);
    T.orbit += dt * c.orbitSpeed * live * motion;
    T.stream += dt * c.streamSpeed * live * motion;
    T.free += dt * c.freeSpeed * live * (reduced ? 0.15 : 1);
    T.breath += (dt * Math.PI * 2) / Math.max(1.5, c.breathPeriod);
    T.swirl += dt * c.think * 0.85 * motion;
    T.moon += dt * 1.1 * live * motion;

    // ---- voice: smooth the raw frame like an audio meter (fast attack, slower release) ----
    const listenT = this.cfg.state === "listening" ? 1 : 0;
    const talkT = this.cfg.state === "talking" ? 1 : 0;
    this.listenW += (listenT - this.listenW) * damp(dt, 0.3);
    this.talkW += (talkT - this.talkW) * damp(dt, 0.3);
    if (this.simulateVoice && !this.voiceSrc) this.simVoice ??= QiviVoice.simulate();
    const vsrc = this.voiceSrc ?? (this.simulateVoice ? this.simVoice : null);
    const raw = vsrc && (listenT || talkT) ? vsrc.sample() : SILENT;
    const vf = this.vf;
    const meter = (cur: number, to: number, att: number, rel: number) => cur + (to - cur) * damp(dt, to > cur ? att : rel);
    // fast-but-smooth frame (mouth only)
    vf.level = meter(vf.level, raw.level, 0.05, 0.12);
    vf.low = meter(vf.low, raw.low, 0.06, 0.14);
    vf.mid = meter(vf.mid, raw.mid, 0.05, 0.11);
    vf.high = meter(vf.high, raw.high, 0.05, 0.11);
    vf.pitch += (raw.pitch - vf.pitch) * damp(dt, 0.15);
    vf.onset = 0;
    // slow envelope (everything else): follows the phrase, not individual syllables -> no twitching
    const ve = this.ve;
    ve.level = meter(ve.level, raw.level, 0.24, 0.55);
    ve.low = meter(ve.low, raw.low, 0.28, 0.6);
    ve.mid = meter(ve.mid, raw.mid, 0.28, 0.6);
    ve.high = meter(ve.high, raw.high, 0.28, 0.6);
    ve.pitch += (raw.pitch - ve.pitch) * damp(dt, 0.45);
    // mouth: critically smooth open/close (no snapping between syllables)
    const mouthTarget = clamp(vf.mid * 1.1 + vf.level * 0.45, 0, 1);
    this.mouthOpen += (mouthTarget - this.mouthOpen) * damp(dt, mouthTarget > this.mouthOpen ? 0.045 : 0.08);
    // constant wave speed: varying speed reads as jitter
    T.voice += dt * 1.6 * motion;
    this.poke.age += dt;

    // pointer in canvas-local px
    const { x: px, y: py } = this.toLocal(this.pointer.cx, this.pointer.cy);

    // gaze: pointer > stream target > idle saccades, plus expression bias
    // idle gaze: mostly straight ahead with small, occasional glances
    if (T.real > this.nextSaccade) {
      this.saccade = Math.random() < 0.55 ? { x: 0, y: 0 } : { x: rand(-0.14, 0.14), y: rand(-0.08, 0.1) };
      this.nextSaccade = T.real + rand(pers.saccade[0], pers.saccade[1]) * 1.6;
    }
    let gaze: V2 = this.saccade;
    // the cursor only holds attention while it moves; ~2.5s after it stops Qivi eases back to forward
    const moving = performance.now() / 1000 - this.lastPointerMove < 2.5;
    const attnT = this.pointer.active && this.cfg.interactive && !this.sleeping && moving ? 1 : 0;
    this.ptrAttn += (attnT - this.ptrAttn) * damp(dt, attnT > this.ptrAttn ? 0.12 : 0.9);
    const busy = ["searching", "analyzing", "answering", "found"].includes(this.cfg.state);
    if (busy && c.stream > 0.1 && streamTarget) {
      const l = Math.hypot(this.streamUnit.x, this.streamUnit.y) || 1;
      gaze = { x: this.streamUnit.x / l, y: this.streamUnit.y / l };
    } else if (this.ptrAttn > 0.001) {
      const dx = px - this.pos.x;
      const dy = -(py - this.pos.y);
      const l = Math.hypot(dx, dy) || 1;
      const m = clamp(l / (S * 2.2), 0, 1);
      const a = this.ptrAttn;
      gaze = { x: gaze.x * (1 - a) + (dx / l) * m * a, y: gaze.y * (1 - a) + (dy / l) * m * a };
    }
    // pondering: while thinking the gaze drifts slowly side to side under lifted lids
    const ponder = Math.sin(T.real * 0.55) * 0.38 * c.think * motion;
    const gx = clamp(gaze.x * 0.8 * (1 - c.think * 0.6) + c.lookX + ponder, -1, 1);
    const gy = clamp(gaze.y * 0.8 + c.lookY, -1, 1);
    this.look.x += (gx - this.look.x) * damp(dt, 0.1);
    this.look.y += (gy - this.look.y) * damp(dt, 0.1);

    // 3D orientation: Qivi turns its whole volume toward what it looks at
    const yaw = (this.look.x * 0.34 + Math.sin(T.real * 0.31) * 0.08 * motion) * (1 - c.dissolve * 0.5);
    const pitch = -this.look.y * 0.16 + Math.sin(T.real * 0.23 + 1.3) * 0.04 * motion - ve.pitch * 0.035 * this.talkW * motion;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rot = (x: number, y: number, z: number) => {
      const x1 = x * cyw + z * syw;
      const z1 = -x * syw + z * cyw;
      return { x: x1, y: y * cp - z1 * sp, z: y * sp + z1 * cp };
    };

    // blink
    let blink = 1;
    if (T.real > this.nextBlink && this.blinkStart < 0) {
      this.blinkStart = T.real;
      this.nextBlink = T.real + rand(pers.blink[0], pers.blink[1]) + (Math.random() < 0.15 ? -1e9 : 0);
    }
    if (this.blinkStart >= 0) {
      const p = (T.real - this.blinkStart) / 0.17;
      if (p >= 1) {
        this.blinkStart = -1;
        if (this.nextBlink < 0) this.nextBlink = T.real + 0.12;
      } else blink = 1 - Math.sin(p * Math.PI) * 0.97;
    }

    // hover light
    const near = this.pointer.active && this.cfg.interactive && Math.hypot(px - this.pos.x, py - this.pos.y) < S * 1.5;
    this.pointer.strength += ((near ? 1 : 0) - this.pointer.strength) * damp(dt, 0.25);

    if (c.glitch > 0.05 && T.real > this.nextGlitch) {
      this.glitchY = rand(-0.45, 0.35);
      this.nextGlitch = T.real + rand(0.15, 0.6);
    }

    // light sweep
    const sp01 = (T.real - this.sweepStart) / 1.1;
    const sweepOn = sp01 >= 0 && sp01 <= 1;
    const sweepPos = sweepOn ? -2.4 + 4.8 * ease(sp01) : 9;
    const sweepStrength = sweepOn ? Math.sin(sp01 * Math.PI) * c.light : 0;

    // ---- uniforms ----
    const cx = this.pos.x - vw / 2;
    const cy = vh / 2 - this.pos.y;
    const lean = c.lean + this.look.x * 0.02 + Math.sin(T.real * 0.8) * 0.035 * c.think * motion;
    const attendDir = Math.hypot(this.streamUnit.x, this.streamUnit.y) || 1;
    const attend = { x: (this.streamUnit.x / attendDir) * c.attend, y: (this.streamUnit.y / attendDir) * c.attend };
    const breathAmp = (c.breath + ve.level * 0.012 * (this.talkW + this.listenW)) * (reduced ? 0.4 : 1);

    // deform + rotate a face anchor exactly like the particle shader deforms the body
    const W = Math.min(1, c.morphHeart + c.morphShield + c.morphHex + c.morphStar);
    const dome = 1 - W;
    const deform = (x: number, y: number) => {
      const r0 = Math.hypot(x, y);
      const edge = THREE.MathUtils.smoothstep(r0, 0.5, 1.12);
      if (y < 0) { y *= 1 - 0.14 * dome; x *= 1 + -y * 0.2 * dome; } else x *= 1 - y * 0.07 * dome;
      const br = 1 + breathAmp * Math.sin(T.breath - r0 * 1.4) * (0.6 + edge);
      x *= c.width * (1 - c.stretch * 0.5) * br;
      y *= c.height * (1 + c.stretch) * br;
      y += c.stretch * 0.25;
      x += (y + 0.6) * lean;
      x += attend.x * (0.25 + edge) * 0.12;
      y += attend.y * (0.25 + edge) * 0.12;
      const z = Math.sqrt(Math.max(0.05, 1 - x * x - y * y)) * 0.92;
      const r = rot(x, y, z);
      const n0 = z / Math.hypot(x, y, z);
      const n1 = r.z / Math.hypot(r.x, r.y, r.z);
      const persp = 1 + r.z * 0.07;
      return { x: r.x * persp, y: r.y * persp, squash: clamp(n1 / n0, 0.4, 1.1), scale: persp };
    };
    const eL = deform(c.faceX - EYE_DX * c.spacing, c.faceY);
    const eR = deform(c.faceX + EYE_DX * c.spacing, c.faceY);
    const mo = deform(c.faceX + 0.01, c.faceY - 0.2);
    // small Qivis get proportionally larger eyes: the face is the identity anchor at every scale
    const eyeR = EYE_R * clamp(1 + ((70 - S) / 70) * 0.45, 1, 1.4) * (1 + ve.level * 0.04 * this.listenW);
    const faceFade = 1 - THREE.MathUtils.smoothstep(c.dissolve, 0.55, 0.95);
    const openL = c.openL * blink;
    const openR = c.openR * blink;

    // accent moon: only in signalling states; orbits in true 3D while thinking and lights the body
    const bob = Math.sin(T.real * 1.7) * 0.03 * motion;
    const ao = clamp(c.accentOrbit, 0, 1) * motion;
    const MOON_R = 1.5;
    const orb3 = rot(Math.cos(T.moon) * MOON_R, 0.32 + Math.sin(T.moon) * MOON_R * 0.2, Math.sin(T.moon) * MOON_R);
    const rest = { x: (c.accentX + this.look.x * 0.08) * c.width, y: c.accentY + bob + this.look.y * 0.05, z: 0.5 };
    const ax = THREE.MathUtils.lerp(rest.x, orb3.x, ao);
    const ay = THREE.MathUtils.lerp(rest.y, orb3.y, ao);
    const az = THREE.MathUtils.lerp(rest.z, orb3.z, ao);
    const accentA = clamp(c.accentAlpha, 0, 1);
    const pulse = (1 + c.accentPulse * 0.3 * Math.pow(Math.sin(T.real * 3.2), 2) * (reduced ? 0.3 : 1)) * (1 + ve.level * 0.3 * this.listenW);
    const orbFade = c.opacity * accentA * (1 - THREE.MathUtils.smoothstep(c.dissolve, 0.3, 0.8));
    this.orbCol.copy(this.col.accent).lerp(this.status, c.statusMix * 0.8);

    const u = this.pMat.uniforms;
    u.uCenter.value.set(cx, cy);
    u.uSize.value = S;
    u.uDpr.value = this.renderer.getPixelRatio();
    u.uShape.value.set(c.width, c.height, lean, c.stretch);
    u.uBreath.value.set(breathAmp, T.breath, c.density);
    u.uNoise.value.set(c.noise, c.loose, T.noise, 0);
    u.uFree.value.set(c.freeSpread, T.free, c.chaos, motion);
    u.uOrbit.value.set(c.orbit, T.orbit, 0);
    u.uStream.value.set(c.stream * this.streamW, T.stream, clamp(c.streamDir, 0, 1), 0);
    u.uStreamTarget.value.set(this.streamUnit.x, this.streamUnit.y);
    u.uFx.value.set(c.grid, this.burst * 0.35, c.dissolve, c.glitch);
    u.uGlitchY.value = this.glitchY;
    u.uAttend.value.set(attend.x, attend.y);
    u.uVel.value.set(clamp(this.posVel.x / S, -6, 6), clamp(-this.posVel.y / S, -6, 6));
    u.uHover.value.set((px - this.pos.x) / S, -(py - this.pos.y) / S, 1.25, this.pointer.strength * (this.sleeping ? 0.3 : 0.9) * (0.4 + 0.6 * c.light));
    u.uPoke.value.set(this.poke.x, this.poke.y, this.poke.z, reduced ? 10 : this.poke.age);
    u.uThink.value.set(c.think, T.swirl, T.real, 0);
    u.uEyeL.value.set(eL.x, eL.y, eyeR * c.scaleL, clamp(openL, 0, 1) * (1 - c.xMix));
    u.uEyeR.value.set(eR.x, eR.y, eyeR * c.scaleR, clamp(openR, 0, 1) * (1 - c.xMix));
    u.uLook.value.set(c.pointSize, c.opacity, c.warm);
    u.uStatus.value.set(c.statusMix, this.cfg.dark ? 1 : 0);
    u.uRot.value.set(yaw, pitch, c.light, T.real);
    u.uMorph.value.set(Math.max(0, c.morphHeart), Math.max(0, c.morphShield), Math.max(0, c.morphHex), Math.max(0, c.morphStar));
    u.uOrb.value.set(ax, ay, az, orbFade * 1.3 * (0.4 + 0.6 * c.light));
    u.uSweep.value.set(sweepPos, sweepStrength, this.shiver, 0);
    const budget = this.cfg.particleBudget;
    this.geometry.setDrawRange(0, Math.round(Math.min(budget, 38000 * clamp(Math.pow(S / 150, 1.4), 0.12, 1))));

    const setQuad = (m: THREE.ShaderMaterial, x: number, y: number, size: number) => {
      m.uniforms.uCenter.value.set(x, y);
      m.uniforms.uSize.value = size;
    };
    setQuad(this.auraMat, cx, cy, S);
    this.auraMat.uniforms.uAlpha.value = c.opacity * Math.pow(1 - c.dissolve, 1.5) * (1 - c.statusMix * 0.4);
    this.auraMat.uniforms.uDark.value = this.cfg.dark ? 1 : 0;
    this.auraMat.uniforms.uWarmAmt.value = c.warm;
    this.auraMat.uniforms.uGround.value = -0.86 * c.height * (1 + c.stretch) - 0.06;

    setQuad(this.faceMat, cx, cy, S);
    const f = this.faceMat.uniforms;
    f.uEyeL.value.set(eL.x, eL.y, eyeR * eL.scale, openL);
    f.uEyeR.value.set(eR.x, eR.y, eyeR * eR.scale, openR);
    f.uEyeLB.value.set(c.arcL, c.lidL, eL.squash, c.scaleL);
    f.uEyeRB.value.set(c.arcR, c.lidR, eR.squash, c.scaleR);
    f.uFaceA.value.set(c.lidTilt, clamp(c.xMix, 0, 1), c.sparkle, c.pupil);
    f.uFaceB.value.set(this.look.x, this.look.y, c.ring, faceFade * c.opacity);
    f.uMouth.value.set(mo.x, mo.y, clamp(c.mouth, 0, 1) * (1 - c.xMix), c.mouthCurve);
    const mouthOpen = this.talkW * this.mouthOpen;
    f.uMouth2.value.set(mouthOpen, clamp(0.5 + vf.low * 0.5 - vf.high * 0.35, 0, 1), 1 - c.xMix, 0);
    u.uVoice.value.set(ve.level, ve.low, ve.mid, ve.high);
    u.uVoice2.value.set(ve.pitch, 0, this.listenW, this.talkW);
    u.uVoice3.value.set(mo.x, mo.y, Math.sqrt(Math.max(0.05, 1 - mo.x * mo.x - mo.y * mo.y)) * 0.92, T.voice);
    f.uPx.value = 1 / S;
    f.uDark.value = this.cfg.dark ? 1 : 0;
    // mouth contrasts with the body colour behind it (light on dark palettes, dark on light ones)
    // the dense core behind the mouth is built from the deep colour, so that decides the contrast
    const behind = this.tmpCol.copy(this.col.deep).lerp(this.status, c.statusMix * 0.5);
    const lum = 0.2126 * behind.r + 0.7152 * behind.g + 0.0722 * behind.b;
    f.uMouthCol.value.set(lum < 0.2 || this.cfg.dark ? "#fbf8ff" : "#0b1230");

    const mu = this.moonMat.uniforms;
    mu.uCenter.value.set(cx, cy);
    mu.uSize.value = S;
    mu.uDpr.value = this.renderer.getPixelRatio();
    mu.uMoonStatic.value.set(rest.x, rest.y, rest.z, ao);
    mu.uMoonOrbit.value.set(T.moon, MOON_R, c.accentScale * (0.85 + 0.4 * accentA), orbFade);
    mu.uRotM.value.set(yaw, pitch, T.real, pulse);
    mu.uBodyWH.value.set(c.width, c.height);

    for (const g of this.glyphs) {
      const a = clamp(c[g.key], 0, 1) * faceFade;
      const wob = Math.sin(T.real * 2.4 + g.off.x * 7) * 0.04 * motion;
      const drift = g.key === "gZzz" ? ((T.real * 0.25) % 1) * 0.15 * motion : 0;
      setQuad(g.mat, cx + g.off.x * S * c.width, cy + (g.off.y + wob + drift) * S, S * 0.2);
      g.mat.uniforms.uAlpha.value = a;
    }
  }
}
