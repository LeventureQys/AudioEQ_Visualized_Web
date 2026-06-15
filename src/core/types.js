/**
 * @typedef {Object} Band
 * @property {number} index
 * @property {number} frequency
 * @property {number} gain
 * @property {number} q
 * @property {string} type
 * @property {boolean} bypass
 */

/** @enum {string} */
export const FilterType = Object.freeze({
  PEAK: 'peak',
  LOW_SHELF: 'lowShelf',
  HIGH_SHELF: 'highShelf',
  LOW_PASS: 'lowPass',
  HIGH_PASS: 'highPass',
  BAND_PASS: 'bandPass',
});

/** @enum {number} */
export const SampleRate = Object.freeze({
  SR_44100: 44100,
  SR_48000: 48000,
  SR_96000: 96000,
  SR_192000: 192000,
});

/** @enum {string} */
export const ErrorCode = Object.freeze({
  INDEX_OUT_OF_RANGE: 'IndexOutOfRange',
  INDEX_CONFLICT: 'IndexConflict',
  INVALID_PARAMETER: 'InvalidParameter',
  NOT_INITIALIZED: 'NotInitialized',
});

/**
 * Create a band object with defaults.
 * @param {Object} [params]
 * @param {number} [params.frequency=1000]
 * @param {number} [params.gain=0]
 * @param {number} [params.q=1.0]
 * @param {string} [params.type='peak']
 * @param {boolean} [params.bypass=false]
 * @returns {Band}
 */
export function createBand({
  frequency = 1000,
  gain = 0,
  q = 1.0,
  type = FilterType.PEAK,
  bypass = false,
} = {}) {
  return { index: -1, frequency, gain, q, type, bypass };
}

/** @type {Readonly<{BAND_COUNT: number, SAMPLE_RATE: number, GAIN_MIN: number, GAIN_MAX: number, FREQ_MIN: number, FREQ_MAX: number, POINT_COUNT: number, LPF_FREQ_DEFAULT: number, HPF_FREQ_DEFAULT: number, FREQ_TICKS: number[]}>} */
export const Defaults = Object.freeze({
  BAND_COUNT: 5,
  SAMPLE_RATE: 48000,
  GAIN_MIN: -24,
  GAIN_MAX: 12,
  FREQ_MIN: 20,
  FREQ_MAX: 20000,
  POINT_COUNT: 500,
  LPF_FREQ_DEFAULT: 20000,
  HPF_FREQ_DEFAULT: 20,
  FREQ_TICKS: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000],
});
