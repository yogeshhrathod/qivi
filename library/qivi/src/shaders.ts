// Ashima Arts / Stefan Gustavson 3D simplex noise (MIT).
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float hash11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
`;

/**
 * Every particle position is a pure function of its home point, seed and the (smoothed) uniforms.
 * Because uniforms are continuously damped on the CPU, any state change is a seamless morph.
 *
 * Pipeline: morph silhouette -> body deform -> organic noise -> 3D rotation (view space)
 *           -> behaviours (orbit, stream, grid, burst, glitch, dissolve) -> shiver -> lighting.
 */
export const particleVertex = /* glsl */ `
${SIMPLEX}
attribute vec3 aHome;
attribute vec4 aSeed;
attribute float aClass;

uniform vec2 uCenter;
uniform float uSize;
uniform float uDpr;
uniform vec4 uShape;      // width, height, lean, stretch
uniform vec3 uBreath;     // amp, phase, density
uniform vec4 uNoise;      // amp, loose, time, unused
uniform vec4 uFree;       // spread, time, chaos, motion
uniform vec3 uOrbit;      // weight, time, unused
uniform vec4 uStream;     // weight, time, dir, unused
uniform vec2 uStreamTarget;
uniform vec4 uFx;         // grid, burst, dissolve, glitch
uniform float uGlitchY;
uniform vec2 uAttend;
uniform vec2 uVel;
uniform vec4 uHover;      // xyz point-light position (unit view space), strength
uniform vec4 uPoke;       // xyz poked surface point (unit view space), age in seconds
uniform vec4 uThink;      // amount, swirl angle, time, unused
uniform vec4 uVoice;      // level, low, mid, high
uniform vec4 uVoice2;     // pitch, onset, listening weight, talking weight
uniform vec4 uVoice3;     // mouth position (unit view space), wave phase
uniform vec4 uEyeL;       // xy unit, radius, open
uniform vec4 uEyeR;
uniform vec3 uLook;       // pointSize, opacity, warm
uniform vec2 uStatus;     // statusMix, dark
uniform vec4 uRot;        // yaw, pitch, light strength, real time
uniform vec4 uMorph;      // heart, shield, hex, star
uniform vec4 uShapes[${128}];
uniform vec4 uOrb;        // xyz (unit view space), light intensity
uniform vec3 uOrbCol;
uniform vec4 uSweep;      // light angle, strength, global shiver, unused
uniform vec3 uColDeep;
uniform vec3 uColMid;
uniform vec3 uColPale;
uniform vec3 uColWarm;
uniform vec3 uColHi;
uniform vec3 uColStatus;

varying vec3 vColor;
varying float vAlpha;
varying float vGlint;

vec3 rotateView(vec3 v){
  float cy = cos(uRot.x), sy = sin(uRot.x);
  v = vec3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
  float cp = cos(uRot.y), sp = sin(uRot.y);
  return vec3(v.x, v.y * cp - v.z * sp, v.y * sp + v.z * cp);
}

void main(){
  float isSurf = step(0.5, aClass) * (1.0 - step(1.5, aClass));
  float isFree = step(1.5, aClass);
  float r0 = length(aHome);
  float edge = smoothstep(0.5, 1.12, r0);
  float motion = uFree.w;
  float alpha = 1.0;

  vec3 p = aHome;

  // morph: per-angle radial rescale toward a silhouette table (face region barely moves)
  float wSum = dot(uMorph, vec4(1.0));
  float W = min(wSum, 1.0);
  if (W > 0.001) {
    float fi = (atan(p.y, p.x) / 6.2831853 + 0.5) * 128.0;
    float f0 = floor(fi);
    vec4 rr = mix(uShapes[int(mod(f0, 128.0))], uShapes[int(mod(f0 + 1.0, 128.0))], fi - f0);
    float rs = dot(rr, uMorph) / max(wSum, 1e-4);
    p.xy *= mix(1.0, rs, W * (1.0 - isFree * 0.4));
    p.z *= mix(1.0, 0.82, W);
  }

  // silhouette: soft dome, weighted base (relaxes while morphed)
  float dome = 1.0 - W;
  if (p.y < 0.0) { p.y *= mix(1.0, 0.86, dome); p.x *= 1.0 + (-p.y) * 0.2 * dome; }
  else { p.x *= 1.0 - p.y * 0.07 * dome; }

  float br = 1.0 + uBreath.x * sin(uBreath.y - r0 * 1.4) * (0.6 + edge);
  p.x *= uShape.x * (1.0 - uShape.w * 0.5) * br;
  p.y *= uShape.y * (1.0 + uShape.w) * br;
  p.z *= uShape.x * br;
  p.y += uShape.w * 0.25;
  p.x += (p.y + 0.6) * uShape.z;
  p.xy += uAttend * (0.25 + edge) * 0.12;

  // organic noise
  float tn = uNoise.z;
  vec3 q = aHome * 1.7 + aSeed.xyz * 0.35;
  vec3 n = vec3(
    snoise(q + vec3(tn, 0.0, 0.0)),
    snoise(q + vec3(17.1, tn, 3.3)),
    snoise(q + vec3(5.2, 9.7, tn))
  );
  float chaosAsym = uFree.z * (0.5 + 0.5 * sin(aSeed.x * 40.0 + tn * 2.0));
  float amp = uNoise.x * (0.01 + edge * edge * uNoise.y * 0.07 + isFree * 0.22 * uNoise.y + chaosAsym * 0.08);
  p += n * amp * motion;

  // free particles: atmospheric dust that leaves the body all around and is endlessly re-emitted
  float life = fract(aSeed.x + uFree.y * (0.035 + aSeed.y * 0.03));
  vec3 outward = normalize(aHome + 1e-4);
  vec3 wind = outward * 0.3 + vec3(-0.3, 0.08 + (aSeed.z - 0.5) * 0.3, 0.0) + n * 0.3;
  p = mix(p, p * (0.75 + 0.25 * uFree.x) + wind * life * uFree.x * motion, isFree);
  alpha *= mix(1.0, sin(life * 3.14159) * 0.9 + 0.1, isFree);

  // thinking: inner layers circulate around the vertical axis (core turns faster than the shell)
  float swirlA = uThink.y * (1.25 - r0 * 0.7) * (1.0 - isFree * 0.7);
  float cs = cos(swirlA), ss = sin(swirlA);
  p.xz = vec2(p.x * cs - p.z * ss, p.x * ss + p.z * cs);
  // colour is sampled in space (not per particle) so the dual tone stays put while matter flows through it
  vec3 ph = p;

  // 3D: rotate the body volume (turns toward the pointer, slow sway) + mild perspective
  vec3 body = rotateView(p);
  p = body;
  p.xy *= 1.0 + p.z * 0.07;
  vec3 N = normalize(body + 1e-4);

  // orbit: two thin counter-rotating rings that live in 3D around the body (hidden when behind it)
  float orbTh = fract(aSeed.w * 7.31) * 0.8;
  float orbW = smoothstep(orbTh, orbTh + 0.18, uOrbit.x) * max(isFree, isSurf * step(aSeed.y, 0.5));
  float ringRim = 0.0;
  if (orbW > 0.001) {
    float ring = step(0.5, aSeed.z);
    float R = mix(1.36, 1.5, ring) + (fract(aSeed.z * 13.7) - 0.5) * 0.05;
    float a = uOrbit.y * mix(1.0, -0.8, ring) * (0.9 + aSeed.w * 0.1) + aSeed.x * 6.2831;
    vec3 o = vec3(cos(a) * R, (fract(aSeed.y * 31.0) - 0.5) * 0.03, sin(a) * R);
    float tx = mix(0.3, 0.42, ring);
    o = vec3(o.x, o.y * cos(tx) - o.z * sin(tx), o.y * sin(tx) + o.z * cos(tx));
    float roll = mix(0.28, -0.36, ring);
    o.xy = vec2(o.x * cos(roll) - o.y * sin(roll), o.x * sin(roll) + o.y * cos(roll));
    o = rotateView(o);
    float behind = smoothstep(0.05, -0.2, o.z) * (1.0 - smoothstep(0.82, 1.02, length(o.xy / vec2(uShape.x, uShape.y))));
    p = mix(p, o, orbW);
    alpha *= mix(1.0, (1.0 - behind * 0.94) * (0.75 + 0.25 * o.z), orbW);
    ringRim = orbW * (1.0 - behind);
  }

  // streams toward / from the UI target
  float stTh = fract(aSeed.w * 3.17 + 0.37) * 0.8;
  float stW = smoothstep(stTh, stTh + 0.18, uStream.x) * max(isFree, isSurf * step(aSeed.y, 0.5));
  if (stW > 0.001) {
    float pr = fract(uStream.y * (0.35 + aSeed.z * 0.5) + aSeed.x);
    float prd = mix(1.0 - pr, pr, uStream.z);
    vec3 s0 = p * 0.55;
    vec3 s2 = vec3(uStreamTarget + (aSeed.yz - 0.5) * 0.4, 0.0);
    vec3 s1 = mix(s0, s2, 0.5) + vec3(0.0, 0.55 + (aSeed.w - 0.5) * 1.3, (aSeed.y - 0.5));
    vec3 b = mix(mix(s0, s1, prd), mix(s1, s2, prd), prd);
    b += n * 0.07 * (1.0 + sin(prd * 3.14159) * 2.0);
    p = mix(p, b, stW);
    alpha *= mix(1.0, smoothstep(0.0, 0.08, prd) * smoothstep(0.95, 0.68, prd), stW);
  }

  // structured analysis: snap into lattice lines
  float gW = uFx.x * (1.0 - isFree) * step(0.35, fract(aSeed.z * 5.7));
  vec3 g = floor(p * 9.0 + 0.5) / 9.0;
  vec3 gl = mix(vec3(g.x, p.y, p.z), vec3(p.x, g.y, p.z), step(0.5, aSeed.y));
  p = mix(p, gl + n * 0.004, gW);

  // burst / contraction impulse
  p += N * uFx.y * (0.12 + edge * 0.5 + isFree * 0.8) * (0.5 + aSeed.w);

  // localized glitch band
  float band = smoothstep(0.22, 0.0, abs(p.y - uGlitchY));
  p.x += uFx.w * band * (hash11(floor(uNoise.z * 40.0) + floor(p.y * 14.0)) - 0.5) * 0.45;
  p += N * uFx.w * 0.08 * edge * (hash11(aSeed.x * 91.0 + floor(uNoise.z * 25.0)));

  // dissolve: periphery first, face last
  float faceD = min(length(aHome.xy - uEyeL.xy), length(aHome.xy - uEyeR.xy));
  float th = 1.0 - (edge * 0.6 + aSeed.w * 0.3) + smoothstep(0.55, 0.0, faceD) * 0.25;
  float k = smoothstep(th - 0.25, th + 0.05, uFx.z * 1.6 - 0.15);
  vec3 drift = N + vec3(0.9, 0.5, 0.0) + n * 0.9;
  p += drift * k * (0.6 + aSeed.z * 2.4) * motion;
  alpha *= 1.0 - smoothstep(mix(0.0, 0.55, motion), 1.0, k);

  // poke: a real dent at the touched 3D surface point that springs back,
  // followed by a pressure wave that travels through the volume along the surface normals
  float age = uPoke.w;
  float dk = length(body - uPoke.xyz);
  float dent = exp(-dk * dk / 0.08) * exp(-age * 5.5) * cos(age * 19.0) * 0.17;
  float front = age * 2.4;
  float wave = sin((dk - front) * 15.0) * exp(-pow((dk - front) / 0.24, 2.0)) * exp(-age * 2.6) * (1.0 - isFree * 0.5);
  p -= normalize(uPoke.xyz + 1e-4) * dent * motion;
  p += N * wave * 0.04 * motion * (0.3 + edge);

  // voice. listening: the speaker's voice washes over the surface as a 3D spectrum (lows at the base,
  // highs at the crown) with waves travelling inward. talking: waves leave the mouth across the body.
  float vl = uVoice.x;
  float hgt = clamp(body.y * 0.55 + 0.5, 0.0, 1.0);
  float bandE = mix(mix(uVoice.y, uVoice.z, smoothstep(0.15, 0.5, hgt)), uVoice.w, smoothstep(0.55, 0.9, hgt));
  // long, slow, coherent waves (no per-particle phase): reads as one breathing surface, not shimmer
  float inWave = 0.5 + 0.5 * sin(r0 * 6.0 + uVoice3.w * 2.2);
  float dm = length(body - uVoice3.xyz);
  float outWave = 0.5 + 0.5 * sin(dm * 6.5 - uVoice3.w * 2.4);
  float listenD = uVoice2.z * (bandE * 0.7 + vl * 0.3) * inWave;
  float talkD = uVoice2.w * vl * outWave * exp(-dm * 0.8);
  p += N * (listenD * 0.045 + talkD * 0.05) * motion * (0.3 + edge * 0.7) * (1.0 - isFree);
  // loose dust is drawn in while listening and projected outward while talking
  p *= 1.0 + isFree * (uVoice2.w * vl * 0.1 - uVoice2.z * vl * 0.12) * motion;

  // hover: a real point light in front of the body, lighting it by its surface normals
  vec3 toH = uHover.xyz - body;
  vec3 Hd = normalize(toH);
  float hl = uHover.w * max(dot(N, Hd), 0.0) / (1.0 + dot(toH, toH) * 2.0);
  float shiver = (uSweep.z + hl * 0.5) * motion;
  vec3 jit = vec3(sin(uRot.w * 47.0 + aSeed.x * 90.0), sin(uRot.w * 53.0 + aSeed.y * 90.0), sin(uRot.w * 41.0 + aSeed.z * 90.0));
  p += jit * 0.016 * shiver * (0.35 + edge);

  vec2 wp = uCenter + p.xy * uSize;
  wp -= uVel * (edge * 0.6 + isFree) * 0.06 * uSize;

  // negative-space eyes
  float dl = length(p.xy - uEyeL.xy) / max(uEyeL.z, 1e-3);
  float dr2 = length(p.xy - uEyeR.xy) / max(uEyeR.z, 1e-3);
  float hole = min(smoothstep(0.8, 1.35, dl) + (1.0 - uEyeL.w), 1.0) * min(smoothstep(0.8, 1.35, dr2) + (1.0 - uEyeR.w), 1.0);
  alpha *= mix(1.0, hole, step(-0.1, p.z) * (1.0 - isFree));

  // ---- color field (object space, so the warm side turns with the body) ----
  float warmK = smoothstep(0.15, 0.95, ph.x * 0.76 + ph.y * 0.32 + n.x * 0.16);
  vec3 c = mix(uColDeep, uColMid, clamp(smoothstep(0.05, 0.85, r0) * 0.95 + n.y * 0.15 + ph.y * 0.2 + ph.z * 0.15, 0.0, 1.0));
  c = mix(c, uColPale, smoothstep(0.95, 1.5, r0) * (1.0 - warmK * 0.6));
  c = mix(c, uColWarm, warmK * uLook.z * (0.2 + 0.8 * edge));
  c = mix(c, uColHi, smoothstep(0.95, 1.35, r0) * warmK * uLook.z);
  float chaosSplash = uFree.z * step(0.86, aSeed.w) * edge;
  c = mix(c, uColWarm, chaosSplash);
  vec3 statusShade = mix(uColStatus * 0.38, mix(uColStatus, vec3(1.0, 0.85, 0.8), 0.35), smoothstep(0.1, 1.3, r0 + warmK * 0.3));
  c = mix(c, statusShade, uStatus.x);

  // ---- lighting: light travels through the density ----
  float Lk = uRot.z;
  vec3 L = normalize(vec3(-0.5, 0.72, 0.55));
  float surf = smoothstep(0.2, 0.95, r0) * (1.0 - isFree * 0.6);
  float diff = dot(N, L) * 0.5 + 0.5;
  c *= mix(1.0, mix(0.48, 1.32, diff), Lk * mix(0.55, 1.0, surf));
  float ao = smoothstep(0.1, -0.95, N.y) * 0.25 * surf;
  c *= 1.0 - ao * Lk;
  // light colors follow the status ramp so warnings stay crimson instead of turning purple
  vec3 statusLight = mix(uColStatus, vec3(1.0, 0.9, 0.86), 0.45);
  vec3 rimCol = mix(uColPale * 1.15 + 0.06, statusLight, uStatus.x);
  float rim = pow(1.0 - clamp(N.z, 0.0, 1.0), 2.6) * surf;
  c = mix(c, rimCol, rim * 0.42 * Lk);
  // specular sheen only on the outer shell (interior normals are meaningless -> speckle)
  float shell = smoothstep(0.82, 1.0, r0) * (1.0 - isFree);
  float spec = pow(max(dot(reflect(-L, N), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * shell;
  c += vec3(1.0, 0.97, 0.94) * spec * 0.5 * Lk;
  // warm fill light from the right: the peach/coral side glows like light passing through it
  float fill = pow(max(dot(N, normalize(vec3(0.85, 0.25, 0.45))), 0.0), 1.5) * surf;
  vec3 fillCol = mix(uColWarm * 1.08 + uColHi * 0.12, uColStatus * 1.1, uStatus.x);
  c = mix(c, fillCol, fill * 0.42 * Lk * uLook.z);
  // transmitted warm glow through the thin side
  c += uColHi * pow(warmK, 2.0) * (1.0 - surf) * 0.12 * Lk * uLook.z;

  // accent orb casts colored light onto the body
  vec3 toO = uOrb.xyz - body;
  float od2 = dot(toO, toO);
  float ol = uOrb.w * (0.3 + 0.7 * max(dot(N, normalize(toO)), 0.0)) / (1.0 + od2 * 3.5);
  c = mix(c, uOrbCol * 1.15 + 0.05, clamp(ol * 0.7, 0.0, 0.6));

  // hover point light (diffuse + specular)
  vec3 lightCol = mix(mix(uColPale, statusLight, uStatus.x), vec3(1.0), 0.55);
  float hspec = pow(max(dot(reflect(-Hd, N), vec3(0.0, 0.0, 1.0)), 0.0), 20.0) * shell * uHover.w;
  c = mix(c, lightCol, clamp(hl * (0.35 + 0.4 * surf), 0.0, 0.6));
  c += vec3(1.0, 0.97, 0.94) * hspec * 0.45;
  // poke wave crests catch the key light
  c *= 1.0 + wave * 0.22 * Lk;

  // sweep: a light that glides around the body in 3D (success / found / morph)
  vec3 Ls = normalize(vec3(sin(uSweep.x), 0.35, cos(uSweep.x)));
  float sl = pow(max(dot(N, Ls), 0.0), 5.0) * (0.25 + 0.75 * surf) * uSweep.y;
  float sspec = pow(max(dot(reflect(-Ls, N), vec3(0.0, 0.0, 1.0)), 0.0), 26.0) * shell * uSweep.y;
  c = mix(c, vec3(1.0, 0.97, 0.93), clamp(sl * 0.45 + sspec * 0.7, 0.0, 0.8));

  // thinking: synapse sparks twinkle in the head, soft thought-waves rise through the volume
  float think = uThink.x;
  float headMask = smoothstep(-0.05, 0.45, body.y) * (1.0 - isFree);
  float tw = fract(uThink.z * (0.45 + aSeed.y * 0.6) + aSeed.x * 17.0);
  float spark = step(0.962, aSeed.w) * pow(max(sin(tw * 3.14159), 0.0), 14.0) * headMask * think;
  float tWave = pow(0.5 + 0.5 * sin(body.y * 6.0 - uThink.z * 2.2 + r0 * 2.5), 12.0) * think * (1.0 - isFree) * surf;
  c = mix(c, mix(uColHi, vec3(1.0), 0.55), clamp(spark + tWave * 0.22, 0.0, 0.92));
  // voice light: the rim catches the incoming voice; speech glows from inside around the mouth
  float voiceRim = uVoice2.z * vl * rim;
  c = mix(c, rimCol * 1.1 + 0.08, clamp(voiceRim * 0.8 + listenD * 0.25, 0.0, 0.6));
  float voiceGlow = uVoice2.w * vl * (0.35 + 0.65 * outWave) * exp(-dm * 1.1);
  c = mix(c, mix(uColHi, vec3(1.0), 0.4), clamp(voiceGlow * 0.55, 0.0, 0.6));
  // ring particles read as fine bright filaments
  c = mix(c, mix(uColPale, uColHi, 0.35) * 1.1, ringRim * 0.55);

  c = mix(c, pow(max(c, 0.0), vec3(0.65)) + 0.05, uStatus.y);
  vColor = c;
  vGlint = clamp(spec * 0.6 + hl * 0.35 + sl * 0.6 + sspec + spark + max(wave, 0.0) * 0.4 + voiceGlow * 0.5 + voiceRim * 0.4, 0.0, 1.0);

  float base = mix(mix(0.72, 0.5, isSurf), 0.55, isFree);
  base *= mix(1.0, uBreath.z, 1.0 - edge) * (1.0 + (1.0 - edge) * 0.35);
  base *= 1.0 - warmK * (1.0 - edge) * 0.45;
  alpha *= base * uLook.y * (1.0 - smoothstep(1.05, 1.7, r0) * 0.45);
  alpha *= mix(0.62, 1.0, body.z * 0.5 + 0.5);
  alpha *= 1.0 + vGlint * 0.35;
  alpha *= mix(1.0, 0.55, uStatus.y);
  vAlpha = alpha;

  float sz = clamp(uSize / 150.0, 0.62, 1.5);
  float depthSize = (1.0 + body.z * 0.2 * (1.0 - stW) * (1.0 - orbW) + orbW * p.z * 0.25) * (1.0 - orbW * 0.25) * (1.0 + spark * 1.6);
  gl_PointSize = uLook.x * uDpr * sz * (0.55 + aSeed.y * 0.9) * (1.0 + isFree * 0.25 + chaosSplash * 0.8) * depthSize * (1.0 + vGlint * 0.4);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, p.z * uSize, 1.0);
}
`;

export const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vGlint;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vAlpha;
  if (a < 0.003) discard;
  // tiny sphere shading per grain: bright core, softer rim
  vec3 col = vColor * (1.12 - d * 0.55) + vec3(1.0) * vGlint * smoothstep(0.3, 0.0, d) * 0.25;
  gl_FragColor = vec4(col, a);
}
`;

/** Shared vertex shader for quads expressed in Qivi unit space (vUnit). */
export const unitQuadVertex = /* glsl */ `
uniform vec2 uCenter;
uniform float uSize;
uniform float uExtent;
varying vec2 vUnit;
void main(){
  vUnit = position.xy * uExtent;
  vec2 wp = uCenter + vUnit * uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 0.0, 1.0);
}
`;

export const faceFragment = /* glsl */ `
uniform vec4 uEyeL;    // xy, radius, open
uniform vec4 uEyeR;
uniform vec4 uEyeLB;   // arc, lid, x-foreshortening, scale
uniform vec4 uEyeRB;
uniform vec4 uFaceA;   // lidTilt, xMix, sparkle, pupil
uniform vec4 uFaceB;   // lookX, lookY, ring, opacity
uniform vec4 uMouth;   // x, y, alpha, curve
uniform vec4 uMouth2;  // talking: open 0..1, width 0..1, alpha, unused
uniform float uPx;     // unit per pixel
uniform float uDark;
uniform vec3 uRingCol;
uniform vec3 uMouthCol;  // chosen on the CPU to contrast with the body behind the mouth
varying vec2 vUnit;

const vec3 WHITE = vec3(1.0, 0.99, 0.97);
const vec3 PUPIL = vec3(0.035, 0.06, 0.16);

float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }

// returns premultiplied rgba
vec4 eye(vec2 p, vec4 A, vec4 B, float side){
  vec2 c = A.xy; float R = A.z; float open = A.w; float arc = B.x; float lid = B.y;
  vec2 q = p - c;
  q.x /= max(B.z, 0.35); // foreshortening as the body turns in 3D
  float aa = uPx * 1.3;
  float ry = R * max(open, 0.05);
  float dE = (length(vec2(q.x, q.y * R / ry)) - R) * min(1.0, ry / R + 0.25);
  float yl = q.y - q.x * uFaceA.x * side;
  float dDisk = max(dE, yl - lid * R);
  float openK = smoothstep(0.12, 0.35, open);
  float sclera = (1.0 - smoothstep(-aa, aa, dDisk)) * openK * (1.0 - uFaceA.y);

  vec2 look = vec2(uFaceB.x, uFaceB.y);
  vec2 pq = q - (look * R * 0.28 + vec2(0.17 * R, 0.0));
  pq.y *= R / ry;
  float dP = length(pq) - R * 0.8 * uFaceA.w;
  float pupil = (1.0 - smoothstep(-aa, aa, dP)) * sclera;

  vec2 hq = pq - vec2(0.3 * R, 0.32 * R);
  float hl = (1.0 - smoothstep(-aa, aa, length(hq) - R * 0.13)) * pupil;
  vec2 sq = abs(pq - vec2(0.05 * R, 0.05 * R)) / (R * 0.55);
  float star = (1.0 - smoothstep(0.9 - aa / R, 0.9 + aa / R, sqrt(sq.x) + sqrt(sq.y))) * pupil * uFaceA.z;
  float hl2 = (1.0 - smoothstep(-aa, aa, length(pq + vec2(0.32 * R, 0.38 * R)) - R * 0.06)) * pupil;

  vec3 col = mix(WHITE, PUPIL, pupil);
  col = mix(col, WHITE, max(max(hl, star), hl2 * 0.8));
  float a = sclera;

  // closed-eye arc: happy (light ∩) / sleepy & blink (dark ∪)
  float closedK = (1.0 - smoothstep(0.08, 0.32, open)) * (1.0 - uFaceA.y);
  float x = clamp(q.x / R, -0.95, 0.95);
  float fy = (arc * (1.0 - x * x) * 0.55 - arc * 0.15) * R;
  float dA = length(vec2(q.x - x * R, q.y - fy)) - R * 0.14;
  float arcA = (1.0 - smoothstep(-aa, aa, dA)) * closedK;
  vec3 arcCol = mix(PUPIL, WHITE, smoothstep(-0.1, 0.4, arc));
  col = mix(col, arcCol, arcA);
  a = max(a, arcA);

  // error X
  float L = R * 0.72;
  float dX = min(sdSeg(q, vec2(-L, -L), vec2(L, L)), sdSeg(q, vec2(-L, L), vec2(L, -L))) - R * 0.17;
  float xA = (1.0 - smoothstep(-aa, aa, dX)) * uFaceA.y;
  col = mix(col, WHITE, xA);
  a = max(a, xA);

  // analyst ring
  float dR = abs(length(q) - R * 1.32) - R * 0.07;
  float ringA = (1.0 - smoothstep(-aa, aa, dR)) * uFaceB.z * 0.85;
  col = mix(col, uRingCol, ringA * (1.0 - a));
  a = max(a, ringA);

  // luminous halo makes the eye feel embedded in the particle field
  float halo = exp(-max(dDisk, 0.0) / (R * 0.3)) * 0.22 * openK * (1.0 - uFaceA.y) * (1.0 - sclera);
  vec3 outc = col * a + WHITE * halo * (1.0 - a);
  return vec4(outc, a + halo * (1.0 - a));
}

void main(){
  vec2 p = vUnit;
  vec4 l = eye(p, vec4(uEyeL.xy, uEyeL.z * uEyeLB.w, uEyeL.w), uEyeLB, -1.0);
  vec4 r = eye(p, vec4(uEyeR.xy, uEyeR.z * uEyeRB.w, uEyeR.w), uEyeRB, 1.0);
  vec4 c = l + r * (1.0 - l.a);

  // bridge for analyst glasses
  float aa = uPx * 1.3;
  vec2 bl = uEyeL.xy + vec2(uEyeL.z * uEyeLB.w * 1.32, 0.0);
  vec2 brp = uEyeR.xy - vec2(uEyeR.z * uEyeRB.w * 1.32, 0.0);
  float dB = sdSeg(p, bl, brp) - uEyeL.z * 0.07;
  float bA = (1.0 - smoothstep(-aa, aa, dB)) * uFaceB.z * 0.85;
  c = c + vec4(uRingCol * bA, bA) * (1.0 - c.a);

  // tiny smile
  float mw = 0.07;
  vec2 mq = p - uMouth.xy;
  float mx = clamp(mq.x / mw, -1.0, 1.0);
  float my = -uMouth.w * (1.0 - mx * mx) * 0.04 + uMouth.w * 0.015;
  float dMc = length(vec2(mq.x - mx * mw, mq.y - my));
  float openK = smoothstep(0.03, 0.16, uMouth2.x) * uMouth2.z;
  float mA = (1.0 - smoothstep(-aa, aa, dMc - 0.018)) * min(uMouth.z * 1.3, 1.0) * (1.0 - openK);
  // soft contrasting halo keeps the smile legible on any palette
  vec3 haloCol = vec3(1.0) - uMouthCol;
  float mHalo = (1.0 - smoothstep(0.0, 0.028, dMc - 0.018)) * uMouth.z * 0.35 * (1.0 - mA) * (1.0 - openK);
  c = c + vec4(haloCol * mHalo, mHalo) * (1.0 - c.a);
  c = c + vec4(uMouthCol * mA, mA) * (1.0 - c.a);

  // talking mouth: opens with vowel energy; flatter upper lip, warm tongue hint, contrasting rim
  vec2 oq = p - (uMouth.xy + vec2(0.0, -0.01));
  float orx = mw * (0.62 + 0.55 * uMouth2.y);
  float ory = 0.014 + uMouth2.x * 0.085;
  oq.y *= oq.y > 0.0 ? 1.7 : 1.0;
  float dO = (length(oq / vec2(orx, ory)) - 1.0) * min(orx, ory);
  float oA = (1.0 - smoothstep(-aa, aa, dO)) * openK;
  vec3 inner = mix(vec3(0.07, 0.03, 0.11), vec3(0.85, 0.36, 0.42), smoothstep(-0.25, -0.9, oq.y / ory) * 0.7);
  float lip = (1.0 - smoothstep(-aa, aa, abs(dO) - 0.0045)) * openK * 0.8;
  c = c + vec4(uMouthCol * lip, lip) * (1.0 - c.a);
  c = c + vec4(inner * oA, oA) * (1.0 - c.a);

  c *= uFaceB.w;
  if (c.a < 0.002) discard;
  gl_FragColor = c;
}
`;

export const auraFragment = /* glsl */ `
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uShadow;
uniform float uAlpha;
uniform float uDark;
uniform float uWarmAmt;
uniform float uGround;
varying vec2 vUnit;
void main(){
  vec2 p = vUnit;
  float r = length(p * vec2(0.9, 1.0));
  float cool = exp(-r * r * 0.9) * 0.22;
  float warm = exp(-dot(p - vec2(0.75, 0.4), p - vec2(0.75, 0.4)) * 3.2) * 0.14 * uWarmAmt;
  vec2 sp = (p - vec2(0.0, uGround)) * vec2(0.9, 5.5);
  float shadow = exp(-dot(sp, sp)) * 0.2;
  float fadeEdge = smoothstep(2.4, 1.6, length(p));
  cool *= fadeEdge; warm *= fadeEdge; shadow *= fadeEdge;
  vec3 c = uCool * cool + uWarm * warm + uShadow * shadow;
  float a = (cool + warm + shadow) * uAlpha * mix(1.0, 1.6, uDark);
  if (a < 0.002) discard;
  gl_FragColor = vec4(c / max(cool + warm + shadow, 1e-3) * a, a);
}
`;

export const glyphFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uAlpha;
uniform vec3 uTint;
varying vec2 vUnit;
uniform vec4 uRect; // x, y, halfW, halfH in unit space (relative to quad center)
void main(){
  vec2 uv = (vUnit - uRect.xy) / (uRect.zw * 2.0) + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  vec4 t = texture2D(uMap, uv);
  float a = t.a * uAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uTint * a, a);
}
`;

/**
 * Accent "moon": a small cluster of real particles with a comet trail. In signalling states it
 * hovers near the head; while thinking it orbits Qivi in true 3D (smaller + hidden behind the body,
 * larger in front), lagging trail particles sampling earlier points on the same orbit.
 */
export const moonVertex = /* glsl */ `
attribute vec4 aSeed;    // radius, angle, trail position, type
uniform vec2 uCenter;
uniform float uSize;
uniform float uDpr;
uniform vec4 uMoonStatic; // xyz rest position (unit view space), orbit weight
uniform vec4 uMoonOrbit;  // angle, radius, scale, alpha
uniform vec4 uRotM;       // yaw, pitch, time, pulse
uniform vec2 uBodyWH;
uniform vec3 uColor;
varying vec3 vColor;
varying float vAlpha;

vec3 rotV(vec3 v){
  float cy = cos(uRotM.x), sy = sin(uRotM.x);
  v = vec3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
  float cp = cos(uRotM.y), sp = sin(uRotM.y);
  return vec3(v.x, v.y * cp - v.z * sp, v.y * sp + v.z * cp);
}
vec3 orbitAt(float a){
  float R = uMoonOrbit.y;
  vec3 o = vec3(cos(a) * R, 0.32 + sin(a) * R * 0.2, sin(a) * R);
  return rotV(o);
}

void main(){
  float isTrail = step(0.62, aSeed.w);
  float isGlow = step(0.5, aSeed.w) * (1.0 - isTrail);
  float lag = aSeed.z * aSeed.z * 1.1 * isTrail;
  vec3 restTrail = vec3(-0.18, -0.06, 0.0) * aSeed.z * isTrail;
  vec3 center = mix(uMoonStatic.xyz + restTrail, orbitAt(uMoonOrbit.x - lag), uMoonStatic.w);

  float scale = uMoonOrbit.z * uRotM.w;
  float r = pow(aSeed.x, 1.6) * 0.075 * scale * (1.0 + isTrail * aSeed.z * 0.6) * (1.0 + isGlow * 0.6);
  float th = aSeed.y * 6.2831 + uRotM.z * (0.7 + aSeed.x * 0.8);
  float ph = acos(2.0 * fract(aSeed.y * 7.13) - 1.0);
  vec3 p = center + vec3(sin(ph) * cos(th), sin(ph) * sin(th), cos(ph)) * r;

  float persp = 1.0 + p.z * 0.12;
  vec2 xy = p.xy * persp;
  float inside = 1.0 - smoothstep(0.8, 1.0, length(xy / uBodyWH));
  float occl = 1.0 - inside * smoothstep(0.0, -0.25, p.z) * 0.95;
  float depthK = clamp(1.0 + p.z * 0.4, 0.55, 1.5);

  float core = (1.0 - smoothstep(0.0, 0.45, aSeed.x)) * (1.0 - isTrail) * (1.0 - isGlow);
  vColor = mix(uColor, vec3(1.0, 0.95, 0.9), core * 0.75);
  float a = mix(0.9, 0.5, aSeed.x) * (1.0 - isTrail * smoothstep(0.0, 1.0, aSeed.z) * 0.75);
  a = mix(a, 0.07, isGlow);
  vAlpha = a * uMoonOrbit.w * occl * mix(0.6, 1.0, clamp(depthK - 0.4, 0.0, 1.0));
  float sz = clamp(uSize / 150.0, 0.6, 1.5);
  gl_PointSize = uDpr * sz * depthK * mix(mix(2.4, 2.0, isTrail) + core * 2.4, 12.0 * scale, isGlow);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(uCenter + xy * uSize, 0.0, 1.0);
}
`;

export const moonFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * (1.15 - d * 0.6), a);
}
`;
