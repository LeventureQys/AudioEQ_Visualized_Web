import { AudioEQElement } from './element/AudioEQElement.js';

import { EqualizerModel } from './core/EqualizerModel.js';
import { CurveEngine } from './core/CurveEngine.js';
import { CoordinateMapper } from './core/CoordinateMapper.js';
import * as ButterworthIIR from './core/filter/ButterworthIIR.js';
import * as Types from './core/types.js';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  customElements.define('audio-eq', AudioEQElement);
}

export { AudioEQElement };
export { EqualizerModel, CurveEngine, CoordinateMapper };
export { ButterworthIIR, Types };

export const AudioEQCore = { EqualizerModel, CurveEngine, CoordinateMapper };
