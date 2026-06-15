/**
 * @typedef {Object} Viewport
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

export class CoordinateMapper {
  /**
   * @param {Object} options
   * @param {Viewport} options.viewport
   * @param {number} options.freqMin
   * @param {number} options.freqMax
   * @param {number} options.gainMin
   * @param {number} options.gainMax
   */
  constructor({ viewport, freqMin, freqMax, gainMin, gainMax }) {
    this._vp = { ...viewport };
    this._freqMin = freqMin;
    this._freqMax = freqMax;
    this._gainMin = gainMin;
    this._gainMax = gainMax;
    this._logFreqRatio = Math.log(freqMax / freqMin);
  }

  /** @param {number} freqHz @returns {number} */
  freqToX(freqHz) {
    const clamped = Math.max(this._freqMin, Math.min(this._freqMax, freqHz));
    return this._vp.x
      + this._vp.width * Math.log(clamped / this._freqMin) / this._logFreqRatio;
  }

  /** @param {number} x @returns {number} */
  xToFreq(x) {
    const ratio = (x - this._vp.x) / this._vp.width;
    const freq = this._freqMin * Math.exp(ratio * this._logFreqRatio);
    return Math.max(this._freqMin, Math.min(this._freqMax, freq));
  }

  /** @param {number} gainDb @returns {number} */
  gainToY(gainDb) {
    const clamped = Math.max(this._gainMin, Math.min(this._gainMax, gainDb));
    return this._vp.y
      + this._vp.height * (this._gainMax - clamped) / (this._gainMax - this._gainMin);
  }

  /** @param {number} y @returns {number} */
  yToGain(y) {
    const gain = this._gainMax - (y - this._vp.y) * (this._gainMax - this._gainMin) / this._vp.height;
    return Math.max(this._gainMin, Math.min(this._gainMax, gain));
  }

  /** @param {Viewport} vp */
  setViewport({ x, y, width, height }) {
    this._vp = { x, y, width, height };
  }

  /** @param {number} min @param {number} max */
  setFreqRange(min, max) {
    this._freqMin = min;
    this._freqMax = max;
    this._logFreqRatio = Math.log(max / min);
  }

  /** @param {number} min @param {number} max */
  setGainRange(min, max) {
    this._gainMin = min;
    this._gainMax = max;
  }

  /** @returns {number} */
  get freqMin() { return this._freqMin; }
  /** @returns {number} */
  get freqMax() { return this._freqMax; }
  /** @returns {number} */
  get gainMin() { return this._gainMin; }
  /** @returns {number} */
  get gainMax() { return this._gainMax; }
  /** @returns {Readonly<Viewport>} */
  get viewport() { return { ...this._vp }; }

  /**
   * Generate nice 1-2-5 freq ticks within [freqMin, freqMax].
   * @param {number} freqMin
   * @param {number} freqMax
   * @returns {number[]}
   */
  static generateFreqTicks(freqMin, freqMax) {
    const ticks = [];
    const steps = [1, 2, 5];
    let decade = 1;
    while (decade <= freqMax) {
      for (const step of steps) {
        const val = step * decade;
        if (val >= freqMin && val <= freqMax) {
          ticks.push(val);
        }
      }
      decade *= 10;
    }
    return ticks;
  }
}
