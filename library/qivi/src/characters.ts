import type { QiviCharacter } from './types';

/** Editable character identities. Presentation, behavioral personality and voice are independent. */
export const CHARACTERS = {
  qivi: { name: 'Qivi', personality: 'core', presentation: 'neutral', theme: 'default', shape: 'blob', behavior: { blink: [2.6, 6], saccade: [1, 2.8], probe: 8 } },
  female: {
    name: 'Nova', personality: 'spark', presentation: 'feminine', theme: 'lavender', shape: 'blob',
    params: { width: .94, height: 1.1, scaleL: 1.18, scaleR: 1.18, spacing: .9, lidTilt: -.12, mouth: .8, faceY: .1, breath: .04, breathPeriod: 2.8, freeSpeed: 1.6, freeSpread: 1.2, sparkle: .65, lean: -.06 },
    behavior: { blink: [1.8, 3.6], saccade: [.6, 1.5], randomBurst: 7, gridAffinity: .7 },
  },
  male: {
    name: 'Sol', personality: 'diplomat', presentation: 'masculine', theme: 'arctic', shape: 'blob',
    params: { width: 1.2, height: .9, scaleL: .9, scaleR: .9, spacing: 1.15, lidL: .88, lidR: .88, mouth: .35, faceY: .04, breath: .018, breathPeriod: 5.4, noiseSpeed: .18, freeSpeed: .55, freeSpread: .7 },
    behavior: { blink: [3.2, 6], saccade: [1.8, 3.8], gridAffinity: 1.1 },
  },
  ember: {
    name: 'Ember', personality: 'chaos', presentation: 'neutral', theme: 'amber', shape: 'star',
    params: { width: 1.08, height: .94, spacing: 1.08, scaleL: 1.08, scaleR: .9, mouth: .85, lean: .12, chaos: 1.2, loose: 1.3, freeSpeed: 2.1, freeSpread: 1.5, sparkle: .5, breathPeriod: 2.6 },
    behavior: { blink: [1.4, 3], saccade: [.4, 1], randomBurst: 3.8, gridAffinity: .4 },
  },
  sage: {
    name: 'Sage', personality: 'sage', presentation: 'neutral', theme: 'mint', shape: 'blob',
    params: { width: 1.05, height: 1.05, spacing: .95, lidL: .82, lidR: .55, mouth: .6, breath: .028, breathPeriod: 7.5, noiseSpeed: .12, freeSpeed: .35, freeSpread: 1.1, orbit: .15, orbitSpeed: .2 },
    behavior: { blink: [4.5, 8], saccade: [3.5, 6], gridAffinity: .5 },
  },
  atlas: {
    name: 'Atlas', personality: 'guardian', presentation: 'masculine', theme: 'midnight', shape: 'shield',
    params: { width: 1.18, height: 1.05, spacing: 1.12, scaleL: .95, scaleR: .95, mouth: .3, noise: .45, noiseSpeed: .16, density: 1.4, freeSpread: .45, freeSpeed: .5, ring: .8, breathPeriod: 6 },
    behavior: { blink: [3.5, 7], saccade: [2.5, 4.5], gridAffinity: 1.3 },
  },
} satisfies Record<string, QiviCharacter>;
