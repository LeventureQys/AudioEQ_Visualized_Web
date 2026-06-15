import { evaluateBandGainDb, makeLowPassBiquad, makeHighPassBiquad, evaluateBiquadGainDb } from './filter/ButterworthIIR.js';

export class CurveEngine {
  constructor({ pointCount = 500, freqMin = 1, freqMax = 24000 } = {}) {
    this._pointCount = pointCount;
    this._freqMin = freqMin;
    this._freqMax = freqMax;
  }

  setPointCount(count) { this._pointCount = count; }
  setFreqRange(min, max) { this._freqMin = min; this._freqMax = max; }

  static generateLogFrequencyPoints(freqMin, freqMax, count) {
    const points = new Array(count);
    const ratio = Math.log(freqMax / freqMin);
    for (let i = 0; i < count; i++) {
      points[i] = freqMin * Math.exp(ratio * i / (count - 1));
    }
    return points;
  }

  computeTotalCurve(model) {
    const freqs = CurveEngine.generateLogFrequencyPoints(this._freqMin, this._freqMax, this._pointCount);
    const result = new Array(this._pointCount);
    const bands = model.allBands();
    const sampleRate = model.sampleRate();
    const lpf = model.getLpf();
    const hpf = model.getHpf();

    for (let i = 0; i < this._pointCount; i++) {
      const freq = freqs[i];
      let totalGain = 0;

      for (const band of bands) {
        totalGain += evaluateBandGainDb(band, freq, sampleRate);
      }

      if (lpf.enabled) {
        const coeff = makeLowPassBiquad(lpf.frequency, sampleRate);
        totalGain += evaluateBiquadGainDb(coeff, freq, sampleRate);
      }

      if (hpf.enabled) {
        const coeff = makeHighPassBiquad(hpf.frequency, sampleRate);
        totalGain += evaluateBiquadGainDb(coeff, freq, sampleRate);
      }

      result[i] = { freq, gainDb: totalGain };
    }
    return result;
  }

  computeSingleBandCurve(bandIndex, model) {
    const band = model.bandAt(bandIndex);
    if (!band) return [];

    const freqs = CurveEngine.generateLogFrequencyPoints(this._freqMin, this._freqMax, this._pointCount);
    const result = new Array(this._pointCount);
    const sampleRate = model.sampleRate();

    for (let i = 0; i < this._pointCount; i++) {
      result[i] = {
        freq: freqs[i],
        gainDb: evaluateBandGainDb(band, freqs[i], sampleRate),
      };
    }
    return result;
  }
}
