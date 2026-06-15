/**
 * @typedef {Object} BiquadCoeff
 * @property {number} b0
 * @property {number} b1
 * @property {number} b2
 * @property {number} a1
 * @property {number} a2
 */

/**
 * @typedef {Object} Band
 * @property {number} index
 * @property {number} frequency
 * @property {number} gain
 * @property {number} q
 * @property {string} type
 * @property {boolean} bypass
 */

/**
 * @typedef {Object} QRange
 * @property {number} min
 * @property {number} max
 */

/**
 * Clamp frequency to just below Nyquist to avoid numerical issues.
 * @param {number} freq
 * @param {number} sampleRate
 * @returns {number}
 */
export function clampFreqBelowNyquist(freq, sampleRate) {
  return Math.min(freq, (sampleRate / 2) * (1 - 1e-3));
}

/**
 * RBJ peaking filter coefficients.
 * @param {number} freq
 * @param {number} q
 * @param {number} gainDb
 * @param {number} sampleRate
 * @returns {BiquadCoeff}
 */
export function makePeakBiquad(freq, q, gainDb, sampleRate) {
  freq = clampFreqBelowNyquist(freq, sampleRate);
  const A = Math.pow(10, gainDb / 40);
  const omega = (2 * Math.PI * freq) / sampleRate;
  const alpha = Math.sin(omega) / (2 * q);
  const coso = Math.cos(omega);
  const b0 = 1 + alpha * A;
  const b1 = -2 * coso;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * coso;
  const a2 = 1 - alpha / A;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/**
 * RBJ low shelf filter coefficients.
 * @param {number} freq
 * @param {number} q
 * @param {number} gainDb
 * @param {number} sampleRate
 * @returns {BiquadCoeff}
 */
export function makeLowShelfBiquad(freq, q, gainDb, sampleRate) {
  freq = clampFreqBelowNyquist(freq, sampleRate);
  const A = Math.pow(10, gainDb / 40);
  const omega = (2 * Math.PI * freq) / sampleRate;
  const coso = Math.cos(omega);
  const beta = (Math.sqrt(A) * Math.sin(omega)) / q;
  const am1 = A - 1;
  const ap1 = A + 1;
  const a0 = ap1 + am1 * coso + beta;
  const b0 = (A * (ap1 - am1 * coso + beta)) / a0;
  const b1 = (2 * A * (am1 - ap1 * coso)) / a0;
  const b2 = (A * (ap1 - am1 * coso - beta)) / a0;
  const a1 = (-2 * (am1 + ap1 * coso)) / a0;
  const a2 = (ap1 + am1 * coso - beta) / a0;
  return { b0, b1, b2, a1, a2 };
}

/**
 * RBJ high shelf filter coefficients.
 * @param {number} freq
 * @param {number} q
 * @param {number} gainDb
 * @param {number} sampleRate
 * @returns {BiquadCoeff}
 */
export function makeHighShelfBiquad(freq, q, gainDb, sampleRate) {
  freq = clampFreqBelowNyquist(freq, sampleRate);
  const A = Math.pow(10, gainDb / 40);
  const omega = (2 * Math.PI * freq) / sampleRate;
  const coso = Math.cos(omega);
  const beta = (Math.sqrt(A) * Math.sin(omega)) / q;
  const am1 = A - 1;
  const ap1 = A + 1;
  const a0 = ap1 - am1 * coso + beta;
  const b0 = (A * (ap1 + am1 * coso + beta)) / a0;
  const b1 = (-2 * A * (am1 + ap1 * coso)) / a0;
  const b2 = (A * (ap1 + am1 * coso - beta)) / a0;
  const a1 = (2 * (am1 - ap1 * coso)) / a0;
  const a2 = (ap1 - am1 * coso - beta) / a0;
  return { b0, b1, b2, a1, a2 };
}

/**
 * BLT Butterworth low-pass biquad with Q parameter.
 * @param {number} freq
 * @param {number} sampleRate
 * @param {number} [q=1/Math.SQRT2]
 * @returns {BiquadCoeff}
 */
export function makeLowPassBiquad(freq, sampleRate, q = 1 / Math.SQRT2) {
  freq = clampFreqBelowNyquist(freq, sampleRate);
  const C = 1 / Math.tan((Math.PI * freq) / sampleRate);
  const d0 = C * C + C / q + 1;
  const d1 = 2 * (1 - C * C);
  const d2 = C * C - C / q + 1;
  const b0 = 1 / d0;
  const b1 = 2 / d0;
  const b2 = 1 / d0;
  const a1 = d1 / d0;
  const a2 = d2 / d0;
  return { b0, b1, b2, a1, a2 };
}

/**
 * BLT Butterworth high-pass biquad with Q parameter.
 * @param {number} freq
 * @param {number} sampleRate
 * @param {number} [q=1/Math.SQRT2]
 * @returns {BiquadCoeff}
 */
export function makeHighPassBiquad(freq, sampleRate, q = 1 / Math.SQRT2) {
  freq = clampFreqBelowNyquist(freq, sampleRate);
  const C = 1 / Math.tan((Math.PI * freq) / sampleRate);
  const d0 = C * C + C / q + 1;
  const d1 = 2 * (1 - C * C);
  const d2 = C * C - C / q + 1;
  const C2 = C * C;
  const b0 = C2 / d0;
  const b1 = (-2 * C2) / d0;
  const b2 = C2 / d0;
  const a1 = d1 / d0;
  const a2 = d2 / d0;
  return { b0, b1, b2, a1, a2 };
}

/**
 * Evaluate the frequency response of a biquad filter at a given frequency.
 * @param {BiquadCoeff} coeff
 * @param {number} freq
 * @param {number} sampleRate
 * @returns {number} gain in dB
 */
export function evaluateBiquadGainDb(coeff, freq, sampleRate) {
  const w = (2 * Math.PI * freq) / sampleRate;
  const cosW = Math.cos(w);
  const cos2W = Math.cos(2 * w);
  const sinW = Math.sin(w);
  const sin2W = Math.sin(2 * w);
  const numRe = coeff.b0 + coeff.b1 * cosW + coeff.b2 * cos2W;
  const numIm = -coeff.b1 * sinW - coeff.b2 * sin2W;
  const denRe = 1 + coeff.a1 * cosW + coeff.a2 * cos2W;
  const denIm = -coeff.a1 * sinW - coeff.a2 * sin2W;
  const mag2 =
    (numRe * numRe + numIm * numIm) / (denRe * denRe + denIm * denIm);
  return 10 * Math.log10(mag2);
}

/**
 * Evaluate the gain in dB for a complete EQ band at a given frequency.
 * @param {Band} band
 * @param {number} freq
 * @param {number} sampleRate
 * @returns {number} gain in dB
 */
export function evaluateBandGainDb(band, freq, sampleRate) {
  if (band.bypass) return 0;
  let coeff;
  switch (band.type) {
    case 'peak':
      coeff = makePeakBiquad(band.frequency, band.q, band.gain, sampleRate);
      break;
    case 'lowShelf':
      coeff = makeLowShelfBiquad(band.frequency, band.q, band.gain, sampleRate);
      break;
    case 'highShelf':
      coeff = makeHighShelfBiquad(band.frequency, band.q, band.gain, sampleRate);
      break;
    case 'lowPass':
      coeff = makeLowPassBiquad(band.frequency, sampleRate, band.q);
      break;
    case 'highPass':
      coeff = makeHighPassBiquad(band.frequency, sampleRate, band.q);
      break;
    default:
      return 0;
  }
  return evaluateBiquadGainDb(coeff, freq, sampleRate);
}

/**
 * Return the valid Q range for a given filter type.
 * @param {string} filterType
 * @returns {QRange}
 */
export function qRangeFor(filterType) {
  switch (filterType) {
    case 'lowShelf':
    case 'highShelf':
      return { min: 0.4, max: 1.6 };
    case 'peak':
    case 'lowPass':
    case 'highPass':
    case 'bandPass':
    default:
      return { min: 0.4, max: 128.0 };
  }
}
