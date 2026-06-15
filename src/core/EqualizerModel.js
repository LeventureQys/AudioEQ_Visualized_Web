import { createBand, Defaults, FilterType } from './types.js';

export class EqualizerModel extends EventTarget {
  constructor() {
    super();
    this._bands = new Map();
    this._focusedIndex = -1;
    this._sampleRate = Defaults.SAMPLE_RATE;
    this._lpf = { frequency: Defaults.LPF_FREQ_DEFAULT, enabled: false };
    this._hpf = { frequency: Defaults.HPF_FREQ_DEFAULT, enabled: false };
    this._qRanges = new Map();

    for (const key of Object.keys(FilterType)) {
      const type = FilterType[key];
      let min = 0.4, max = 128.0;
      if (type === 'lowShelf' || type === 'highShelf') max = 1.6;
      this._qRanges.set(type, { min, max });
    }

    this._initDefaultBands();
  }

  _initDefaultBands() {
    const N = Defaults.BAND_COUNT;
    const freqs = this._computeBandFrequencies(N);
    for (let i = 0; i < N; i++) {
      const band = createBand({ frequency: freqs[i] });
      band.index = i;
      this._bands.set(i, band);
    }
  }

  _computeBandFrequencies(count, freqMin = Defaults.FREQ_MIN, freqMax = Defaults.FREQ_MAX) {
    if (count <= 0) return [];
    // Distribute bands geometrically within the range,
    // leaving one step of padding on each side for HPF/LPF handles
    const gaps = count + 1;
    const ratio = Math.pow(freqMax / freqMin, 1 / gaps);
    const freqs = new Array(count);
    for (let i = 0; i < count; i++) {
      freqs[i] = Math.round(freqMin * Math.pow(ratio, i + 1));
    }
    return freqs;
  }

  _cloneBand(band) {
    return { ...band };
  }

  // ===== Band Management =====
  bandCount() { return this._bands.size; }

  setBandCount(count) {
    const oldCount = this._bands.size;
    if (count === oldCount) return;
    if (count < 0) throw new Error('Invalid band count');

    this._bands.clear();
    const freqs = this._computeBandFrequencies(count);
    for (let i = 0; i < count; i++) {
      const band = createBand({ frequency: freqs[i] });
      band.index = i;
      this._bands.set(i, band);
    }
    this.dispatchEvent(new CustomEvent('model-reset', { detail: {} }));
    this.dispatchEvent(new CustomEvent('band-count-changed', { detail: { newCount: count } }));
  }

  addBand(band) {
    let idx = 0;
    while (this._bands.has(idx)) idx++;
    const newBand = createBand(band);
    newBand.index = idx;
    this._bands.set(idx, newBand);
    this.dispatchEvent(new CustomEvent('band-added', { detail: { index: idx, band: this._cloneBand(newBand) } }));
    return idx;
  }

  removeBand(index) {
    if (!this._bands.has(index)) return;
    this._bands.delete(index);
    this.dispatchEvent(new CustomEvent('band-removed', { detail: { index } }));
    if (this._focusedIndex === index) {
      this.setFocusedBandIndex(-1);
    }
  }

  bandAt(index) {
    const band = this._bands.get(index);
    return band ? this._cloneBand(band) : undefined;
  }

  setBandParams(index, params) {
    const band = this._bands.get(index);
    if (!band) {
      throw new Error('Band index out of range: ' + index, { cause: { code: 'IndexOutOfRange', index } });
    }
    let changed = false;
    if (params.frequency !== undefined && params.frequency !== band.frequency) {
      band.frequency = params.frequency; changed = true;
    }
    if (params.gain !== undefined && params.gain !== band.gain) {
      band.gain = params.gain; changed = true;
    }
    if (params.q !== undefined && params.q !== band.q) {
      band.q = params.q; changed = true;
    }
    if (params.type !== undefined && params.type !== band.type) {
      band.type = params.type; changed = true;
    }
    if (params.bypass !== undefined && params.bypass !== band.bypass) {
      band.bypass = params.bypass; changed = true;
    }
    if (changed) {
      this.dispatchEvent(new CustomEvent('band-changed', { detail: { index, band: this._cloneBand(band) } }));
    }
  }

  allBands() {
    const result = [];
    const sorted = [...this._bands.keys()].sort((a, b) => a - b);
    for (const idx of sorted) {
      result.push(this._cloneBand(this._bands.get(idx)));
    }
    return Object.freeze(result);
  }

  // ===== Focus =====
  focusedBandIndex() { return this._focusedIndex; }

  setFocusedBandIndex(index) {
    if (index !== -1 && !this._bands.has(index)) return;
    if (this._focusedIndex === index) return;
    this._focusedIndex = index;
    this.dispatchEvent(new CustomEvent('focused-band-changed', { detail: { index } }));
  }

  moveBandZOrder(fromIndex, toIndex) {
    if (!this._bands.has(fromIndex) || !this._bands.has(toIndex)) return;
    if (fromIndex === toIndex) return;
    const fromBand = this._bands.get(fromIndex);
    const toBand = this._bands.get(toIndex);
    fromBand.index = toIndex;
    toBand.index = fromIndex;
    this._bands.set(toIndex, fromBand);
    this._bands.set(fromIndex, toBand);
    this.dispatchEvent(new CustomEvent('band-changed', { detail: { index: toIndex, band: this._cloneBand(fromBand) } }));
    this.dispatchEvent(new CustomEvent('band-changed', { detail: { index: fromIndex, band: this._cloneBand(toBand) } }));
  }

  // ===== Sample Rate =====
  sampleRate() { return this._sampleRate; }

  setSampleRate(rate) {
    if (this._sampleRate === rate) return;
    this._sampleRate = rate;
    this.dispatchEvent(new CustomEvent('sample-rate-changed', { detail: { rate } }));
  }

  nyquistFrequency() { return this._sampleRate / 2; }

  // ===== LPF =====
  getLpf() { return { ...this._lpf }; }

  setLpf({ frequency, enabled }) {
    if (frequency !== undefined) {
      this._lpf.frequency = Math.max(Defaults.FREQ_MIN, Math.min(Defaults.FREQ_MAX, frequency));
    }
    if (enabled !== undefined) this._lpf.enabled = enabled;
    this.dispatchEvent(new CustomEvent('lpf-changed', { detail: { ...this._lpf } }));
  }

  setLpfFrequency(freq) {
    const clamped = Math.max(Defaults.FREQ_MIN, Math.min(Defaults.FREQ_MAX, freq));
    const atEdge = clamped >= Defaults.FREQ_MAX - 1;
    if (this._lpf.frequency === clamped && this._lpf.enabled === !atEdge) return;
    this._lpf.frequency = clamped;
    this._lpf.enabled = !atEdge;
    this.dispatchEvent(new CustomEvent('lpf-changed', { detail: { ...this._lpf } }));
  }

  setLpfEnabled(enabled) {
    if (this._lpf.enabled === enabled) return;
    this._lpf.enabled = enabled;
    this.dispatchEvent(new CustomEvent('lpf-changed', { detail: { ...this._lpf } }));
  }

  // ===== HPF =====
  getHpf() { return { ...this._hpf }; }

  setHpf({ frequency, enabled }) {
    if (frequency !== undefined) {
      this._hpf.frequency = Math.max(Defaults.FREQ_MIN, Math.min(Defaults.FREQ_MAX, frequency));
    }
    if (enabled !== undefined) this._hpf.enabled = enabled;
    this.dispatchEvent(new CustomEvent('hpf-changed', { detail: { ...this._hpf } }));
  }

  setHpfFrequency(freq) {
    const clamped = Math.max(Defaults.FREQ_MIN, Math.min(Defaults.FREQ_MAX, freq));
    const atEdge = clamped <= Defaults.FREQ_MIN + 1;
    if (this._hpf.frequency === clamped && this._hpf.enabled === !atEdge) return;
    this._hpf.frequency = clamped;
    this._hpf.enabled = !atEdge;
    this.dispatchEvent(new CustomEvent('hpf-changed', { detail: { ...this._hpf } }));
  }

  setHpfEnabled(enabled) {
    if (this._hpf.enabled === enabled) return;
    this._hpf.enabled = enabled;
    this.dispatchEvent(new CustomEvent('hpf-changed', { detail: { ...this._hpf } }));
  }

  // ===== Q Range =====
  setQRange(filterType, min, max) {
    this._qRanges.set(filterType, { min, max });
    for (const [idx, band] of this._bands) {
      if (band.type === filterType && (band.q < min || band.q > max)) {
        const oldQ = band.q;
        band.q = Math.max(min, Math.min(max, band.q));
        if (oldQ !== band.q) {
          this.dispatchEvent(new CustomEvent('band-changed', { detail: { index: idx, band: this._cloneBand(band) } }));
        }
      }
    }
  }

  qRange(filterType) {
    return this._qRanges.get(filterType) || { min: 0.4, max: 128.0 };
  }
}
