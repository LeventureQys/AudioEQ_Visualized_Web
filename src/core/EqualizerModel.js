import { createBand, Defaults, FilterType, ErrorCode } from './types.js';

const SUPPORTED_FILTER_TYPES = new Set([
  FilterType.PEAK,
  FilterType.LOW_SHELF,
  FilterType.HIGH_SHELF,
  FilterType.LOW_PASS,
  FilterType.HIGH_PASS,
]);

function invalidParameter(message) {
  return new Error(message, { cause: { code: ErrorCode.INVALID_PARAMETER } });
}

function indexOutOfRange(index) {
  return new Error('Band index out of range: ' + index, {
    cause: { code: ErrorCode.INDEX_OUT_OF_RANGE, index },
  });
}

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
      let min = 0.4,
        max = 128.0;
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

  _validateCutoffFrequency(frequency) {
    if (typeof frequency !== 'number' || !Number.isFinite(frequency) || frequency <= 0) {
      throw invalidParameter('Invalid cutoff frequency');
    }
  }

  _validatedBand(band) {
    if (
      typeof band.frequency !== 'number' ||
      !Number.isFinite(band.frequency) ||
      band.frequency <= 0
    ) {
      throw invalidParameter('Invalid band frequency');
    }
    if (typeof band.gain !== 'number' || !Number.isFinite(band.gain)) {
      throw invalidParameter('Invalid band gain');
    }
    if (typeof band.q !== 'number' || !Number.isFinite(band.q) || band.q <= 0) {
      throw invalidParameter('Invalid band Q');
    }
    if (!SUPPORTED_FILTER_TYPES.has(band.type)) {
      throw invalidParameter('Unsupported band type');
    }
    if (typeof band.bypass !== 'boolean') {
      throw invalidParameter('Invalid band bypass');
    }
    const { min, max } = this._qRanges.get(band.type);
    return { ...band, q: Math.max(min, Math.min(max, band.q)) };
  }

  reset() {
    const previousCount = this._bands.size;
    this._bands.clear();
    this._focusedIndex = -1;
    this._sampleRate = Defaults.SAMPLE_RATE;
    this._lpf = { frequency: Defaults.LPF_FREQ_DEFAULT, enabled: false };
    this._hpf = { frequency: Defaults.HPF_FREQ_DEFAULT, enabled: false };
    this._initDefaultBands();
    this.dispatchEvent(new CustomEvent('model-reset', { detail: {} }));
    if (previousCount !== this._bands.size) {
      this.dispatchEvent(
        new CustomEvent('band-count-changed', { detail: { newCount: this._bands.size } }),
      );
    }
    this.dispatchEvent(new CustomEvent('focused-band-changed', { detail: { index: -1 } }));
    this.dispatchEvent(new CustomEvent('lpf-changed', { detail: { ...this._lpf } }));
    this.dispatchEvent(new CustomEvent('hpf-changed', { detail: { ...this._hpf } }));
  }

  // ===== Band Management =====
  bandCount() {
    return this._bands.size;
  }

  setBandCount(count) {
    if (!Number.isInteger(count) || count < 0 || count > 128) {
      throw invalidParameter('Invalid band count');
    }
    const oldCount = this._bands.size;
    if (count === oldCount) return;
    const oldFocusedIndex = this._focusedIndex;

    this._bands.clear();
    this._focusedIndex = -1;
    const freqs = this._computeBandFrequencies(count);
    for (let i = 0; i < count; i++) {
      const band = createBand({ frequency: freqs[i] });
      band.index = i;
      this._bands.set(i, band);
    }
    this.dispatchEvent(new CustomEvent('model-reset', { detail: {} }));
    this.dispatchEvent(new CustomEvent('band-count-changed', { detail: { newCount: count } }));
    if (oldFocusedIndex !== -1) {
      this.dispatchEvent(new CustomEvent('focused-band-changed', { detail: { index: -1 } }));
    }
  }

  addBand(band) {
    if (band !== undefined && (band === null || typeof band !== 'object')) {
      throw invalidParameter('Invalid band parameters');
    }
    const newBand = this._validatedBand(createBand(band));
    let idx = 0;
    while (this._bands.has(idx)) idx++;
    newBand.index = idx;
    this._bands.set(idx, newBand);
    this.dispatchEvent(
      new CustomEvent('band-added', { detail: { index: idx, band: this._cloneBand(newBand) } }),
    );
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
    if (!band) throw indexOutOfRange(index);
    if (params === null || typeof params !== 'object') {
      throw invalidParameter('Invalid band parameters');
    }
    const next = this._validatedBand({
      ...band,
      ...Object.fromEntries(
        ['frequency', 'gain', 'q', 'type', 'bypass']
          .filter((key) => params[key] !== undefined)
          .map((key) => [key, params[key]]),
      ),
    });
    if (['frequency', 'gain', 'q', 'type', 'bypass'].some((key) => next[key] !== band[key])) {
      this._bands.set(index, next);
      this.dispatchEvent(
        new CustomEvent('band-changed', { detail: { index, band: this._cloneBand(next) } }),
      );
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
  focusedBandIndex() {
    return this._focusedIndex;
  }

  setFocusedBandIndex(index) {
    if (index !== -1 && !this._bands.has(index)) throw indexOutOfRange(index);
    if (this._focusedIndex === index) return;
    this._focusedIndex = index;
    this.dispatchEvent(new CustomEvent('focused-band-changed', { detail: { index } }));
  }

  moveBandZOrder(fromIndex, toIndex) {
    if (!this._bands.has(fromIndex)) throw indexOutOfRange(fromIndex);
    if (!this._bands.has(toIndex)) throw indexOutOfRange(toIndex);
    if (fromIndex === toIndex) return;
    const fromBand = this._bands.get(fromIndex);
    const toBand = this._bands.get(toIndex);
    fromBand.index = toIndex;
    toBand.index = fromIndex;
    this._bands.set(toIndex, fromBand);
    this._bands.set(fromIndex, toBand);
    this.dispatchEvent(
      new CustomEvent('band-changed', {
        detail: { index: toIndex, band: this._cloneBand(fromBand) },
      }),
    );
    this.dispatchEvent(
      new CustomEvent('band-changed', {
        detail: { index: fromIndex, band: this._cloneBand(toBand) },
      }),
    );
  }

  // ===== Sample Rate =====
  sampleRate() {
    return this._sampleRate;
  }

  setSampleRate(rate) {
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 40) {
      throw invalidParameter('Invalid sample rate');
    }
    if (this._sampleRate === rate) return;
    this._sampleRate = rate;
    this.dispatchEvent(new CustomEvent('sample-rate-changed', { detail: { rate } }));
  }

  nyquistFrequency() {
    return this._sampleRate / 2;
  }

  // ===== LPF =====
  getLpf() {
    return { ...this._lpf };
  }

  setLpf({ frequency, enabled }) {
    if (frequency !== undefined) this._validateCutoffFrequency(frequency);
    if (frequency !== undefined) {
      this._lpf.frequency = Math.max(Defaults.FREQ_MIN, Math.min(Defaults.FREQ_MAX, frequency));
    }
    if (enabled !== undefined) this._lpf.enabled = enabled;
    this.dispatchEvent(new CustomEvent('lpf-changed', { detail: { ...this._lpf } }));
  }

  setLpfFrequency(freq) {
    this._validateCutoffFrequency(freq);
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
  getHpf() {
    return { ...this._hpf };
  }

  setHpf({ frequency, enabled }) {
    if (frequency !== undefined) this._validateCutoffFrequency(frequency);
    if (frequency !== undefined) {
      this._hpf.frequency = Math.max(Defaults.FREQ_MIN, Math.min(Defaults.FREQ_MAX, frequency));
    }
    if (enabled !== undefined) this._hpf.enabled = enabled;
    this.dispatchEvent(new CustomEvent('hpf-changed', { detail: { ...this._hpf } }));
  }

  setHpfFrequency(freq) {
    this._validateCutoffFrequency(freq);
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
    if (
      !SUPPORTED_FILTER_TYPES.has(filterType) ||
      typeof min !== 'number' ||
      !Number.isFinite(min) ||
      min <= 0 ||
      typeof max !== 'number' ||
      !Number.isFinite(max) ||
      max < min
    ) {
      throw invalidParameter('Invalid Q range');
    }
    this._qRanges.set(filterType, { min, max });
    for (const [idx, band] of this._bands) {
      if (band.type === filterType && (band.q < min || band.q > max)) {
        const oldQ = band.q;
        band.q = Math.max(min, Math.min(max, band.q));
        if (oldQ !== band.q) {
          this.dispatchEvent(
            new CustomEvent('band-changed', {
              detail: { index: idx, band: this._cloneBand(band) },
            }),
          );
        }
      }
    }
  }

  qRange(filterType) {
    return this._qRanges.get(filterType) || { min: 0.4, max: 128.0 };
  }
}
