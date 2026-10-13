import { EqualizerModel } from '../core/EqualizerModel.js';
import { CurveEngine } from '../core/CurveEngine.js';
import { CanvasRenderer } from '../render/CanvasRenderer.js';
import { HitTester } from '../interaction/HitTester.js';
import { DragController } from '../interaction/DragController.js';
import { Defaults, ErrorCode } from '../core/types.js';
import { Theme } from '../render/theme.js';

const MODEL_EVENTS = [
  'band-changed',
  'band-added',
  'band-removed',
  'band-count-changed',
  'focused-band-changed',
  'sample-rate-changed',
  'lpf-changed',
  'hpf-changed',
  'model-reset',
];
const CURVE_TRIGGERS = [
  'model-reset',
  'band-changed',
  'band-added',
  'band-removed',
  'band-count-changed',
  'focused-band-changed',
  'lpf-changed',
  'hpf-changed',
];
const COLOR_ATTRIBUTES = {
  'curve-color': 'curveColor',
  'background-color': 'background',
  'band-color': 'bandFill',
};
const CSS_COLORS = {
  '--audio-eq-curve-color': 'curveColor',
  '--audio-eq-bg-color': 'background',
  '--audio-eq-band-color': 'bandFill',
  '--audio-eq-grid-color': 'gridColor',
  '--audio-eq-label-color': 'labelColor',
  '--audio-eq-axis-color': 'axisColor',
  '--audio-eq-zero-db-color': 'zeroDbColor',
};

function invalidParameter(message) {
  return new Error(message, { cause: { code: ErrorCode.INVALID_PARAMETER } });
}

function finiteNumber(value, name) {
  const number = Number(value);
  if (value === null || value === '' || !Number.isFinite(number)) {
    throw invalidParameter(`${name} must be a finite number`);
  }
  return number;
}

const BaseHTMLElement = /** @type {typeof HTMLElement} */ (
  /** @type {unknown} */ (typeof HTMLElement === 'undefined' ? class {} : HTMLElement)
);

export class AudioEQElement extends BaseHTMLElement {
  static get observedAttributes() {
    return [
      'sample-rate',
      'curve-color',
      'background-color',
      'band-color',
      'gain-min',
      'gain-max',
      'point-count',
    ];
  }

  constructor() {
    super();
    this._model = null;
    this._curveEngine = null;
    this._renderer = null;
    this._dragController = null;
    this._resizeObserver = null;
    this._initialized = false;
    this._connectionToken = 0;
    this._reflecting = false;
    this._themeOverrides = {};
    this._frequencyRange = null;
    this._forwardModelEvent = this._forwardModelEvent.bind(this);
    this._onCurveTrigger = this._onCurveTrigger.bind(this);
    this._onSampleRateChange = this._onSampleRateChange.bind(this);

    if (typeof document === 'undefined') return;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; min-width: 200px; min-height: 100px; height: 300px; }
        :host([hidden]) { display: none; }
        canvas { width: 100%; height: 100%; display: block; }
      </style>
      <canvas aria-label="Audio equalizer frequency response"></canvas>
    `;
    this._canvas = this.shadowRoot.querySelector('canvas');
  }

  connectedCallback() {
    if (this._initialized) return;
    const token = ++this._connectionToken;
    Promise.resolve().then(() => {
      if (!this.isConnected || this._initialized || token !== this._connectionToken) return;
      this._initComponents();
      this._setupResizeObserver();
      this._initialized = true;
    });
  }

  disconnectedCallback() {
    ++this._connectionToken;
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._dragController?.detach();
    this._dragController = null;
    this._renderer?.destroy();
    this._renderer = null;
    if (this._model) {
      for (const name of MODEL_EVENTS)
        this._model.removeEventListener(name, this._forwardModelEvent);
      for (const name of CURVE_TRIGGERS)
        this._model.removeEventListener(name, this._onCurveTrigger);
      this._model.removeEventListener('sample-rate-changed', this._onSampleRateChange);
    }
    this._model = null;
    this._curveEngine = null;
    this._initialized = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this._reflecting || !this._initialized) return;
    try {
      if (name === 'sample-rate') {
        const rate = newValue === null ? Defaults.SAMPLE_RATE : this._validSampleRate(newValue);
        if (this._frequencyRange && this._frequencyRange.max > rate / 2) {
          throw invalidParameter('visible frequency range exceeds Nyquist');
        }
        this._model.setSampleRate(rate);
      } else if (name === 'point-count') {
        this._curveEngine.setPointCount(
          newValue === null ? Defaults.POINT_COUNT : this._validPointCount(newValue),
        );
        this._recomputeCurve();
      } else if (name === 'gain-min' || name === 'gain-max') {
        this._applyGainRange();
      } else {
        this._syncTheme();
      }
    } catch (error) {
      this._reflecting = true;
      try {
        if (oldValue === null) this.removeAttribute(name);
        else this.setAttribute(name, oldValue);
      } finally {
        this._reflecting = false;
      }
      throw error;
    }
  }

  _validSampleRate(value) {
    const rate = finiteNumber(value, 'sample-rate');
    if (rate <= Defaults.FREQ_MIN * 2) throw invalidParameter('sample-rate is too low');
    return rate;
  }

  _validPointCount(value) {
    const count = finiteNumber(value, 'point-count');
    if (!Number.isInteger(count) || count < 2)
      throw invalidParameter('point-count must be an integer >= 2');
    return count;
  }

  _reflect(name, value) {
    this._reflecting = true;
    try {
      this.setAttribute(name, String(value));
    } finally {
      this._reflecting = false;
    }
  }

  _initComponents() {
    this._model = new EqualizerModel();
    const rate = this.getAttribute('sample-rate');
    if (rate !== null) this._model.setSampleRate(this._validSampleRate(rate));
    const points = this.getAttribute('point-count');
    this._curveEngine = new CurveEngine({
      pointCount: points === null ? Defaults.POINT_COUNT : this._validPointCount(points),
      freqMin: Defaults.FREQ_MIN,
      freqMax: Defaults.FREQ_MAX,
    });
    this._renderer = new CanvasRenderer(this._canvas, this._model);
    this._syncTheme();
    this._applyGainRange();

    const hitTester = new HitTester(this._model, this._renderer._mapper, this._renderer._theme);
    this._dragController = new DragController(
      this._canvas,
      this._model,
      this._renderer._mapper,
      hitTester,
      this._renderer._theme,
    );
    this._dragController.attach();
    this._dragController.addEventListener('band-dragged', (event) => {
      this.dispatchEvent(
        new CustomEvent('band-dragged', { detail: /** @type {CustomEvent} */ (event).detail }),
      );
    });
    this._model.addEventListener('sample-rate-changed', this._onSampleRateChange);
    this._updateFrequencyRange();
    for (const name of MODEL_EVENTS) this._model.addEventListener(name, this._forwardModelEvent);
    for (const name of CURVE_TRIGGERS) this._model.addEventListener(name, this._onCurveTrigger);
    this._recomputeCurve();
  }

  _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]
          : entry.contentBoxSize;
        const width = box?.inlineSize ?? entry.contentRect.width;
        const height = box?.blockSize ?? entry.contentRect.height;
        if (this._renderer && width > 0 && height > 0) {
          this._renderer.resize(Math.round(width), Math.round(height));
        }
      }
    });
    this._resizeObserver.observe(this);
  }

  _syncTheme() {
    if (!this._renderer) return;
    const style = getComputedStyle(this);
    const colors = {};
    for (const [variable, key] of Object.entries(CSS_COLORS)) {
      const color = style.getPropertyValue(variable).trim();
      if (color) colors[key] = color;
    }
    Object.assign(colors, this._themeOverrides);
    for (const [attribute, key] of Object.entries(COLOR_ATTRIBUTES)) {
      const color = this.getAttribute(attribute);
      if (color) colors[key] = color;
    }
    this._renderer.setTheme({ ...Theme, ...colors });
  }

  _applyGainRange() {
    if (!this._renderer) return;
    const min = this.hasAttribute('gain-min')
      ? finiteNumber(this.getAttribute('gain-min'), 'gain-min')
      : Defaults.GAIN_MIN;
    const max = this.hasAttribute('gain-max')
      ? finiteNumber(this.getAttribute('gain-max'), 'gain-max')
      : Defaults.GAIN_MAX;
    if (min >= max) throw invalidParameter('gain-min must be smaller than gain-max');
    this._renderer._mapper.setGainRange(min, max);
    this._renderer.markDirty();
  }

  _updateFrequencyRange() {
    if (!this._model || !this._curveEngine || !this._renderer) return;
    const nyquist = this._model.nyquistFrequency();
    const min = this._frequencyRange?.min ?? Defaults.FREQ_MIN;
    const max = Math.min(this._frequencyRange?.max ?? Defaults.FREQ_MAX, nyquist);
    if (max <= min) throw invalidParameter('visible frequency range exceeds Nyquist');
    this._curveEngine.setFreqRange(min, max);
    this._renderer._mapper.setFreqRange(min, max);
  }

  _onSampleRateChange() {
    this._updateFrequencyRange();
    this._recomputeCurve();
  }

  _onCurveTrigger() {
    this._recomputeCurve();
  }
  _recomputeCurve() {
    if (!this._curveEngine || !this._model || !this._renderer) return;
    this._renderer.setTotalCurve(this._curveEngine.computeTotalCurve(this._model));
    const index = this._model.focusedBandIndex();
    if (index >= 0) {
      this._renderer.setSingleBandCurve(
        index,
        this._curveEngine.computeSingleBandCurve(index, this._model),
      );
    } else {
      this._renderer.clearSingleBandCurve();
    }
  }
  _forwardModelEvent(event) {
    this.dispatchEvent(new CustomEvent(event.type, { detail: event.detail }));
  }

  get bandCount() {
    return this._model?.bandCount() ?? Defaults.BAND_COUNT;
  }
  set bandCount(count) {
    this._model?.setBandCount(count);
  }
  setBandCount(count) {
    this.bandCount = count;
  }
  bandAt(index) {
    return this._model?.bandAt(index);
  }
  allBands() {
    return this._model?.allBands() ?? [];
  }
  addBand(params) {
    return this._model?.addBand(params) ?? -1;
  }
  removeBand(index) {
    this._model?.removeBand(index);
  }
  setBandParams(index, params) {
    this._model?.setBandParams(index, params);
  }
  setBandFrequency(index, frequency) {
    this.setBandParams(index, { frequency });
  }
  setBandGain(index, gain) {
    this.setBandParams(index, { gain });
  }
  setBandQ(index, q) {
    this.setBandParams(index, { q });
  }
  setBandType(index, type) {
    this.setBandParams(index, { type });
  }
  setBandBypass(index, bypass) {
    this.setBandParams(index, { bypass });
  }

  get focusedBandIndex() {
    return this._model?.focusedBandIndex() ?? -1;
  }
  set focusedBandIndex(index) {
    this._model?.setFocusedBandIndex(index);
  }
  setFocusedBandIndex(index) {
    this.focusedBandIndex = index;
  }
  moveBandZOrder(fromIndex, toIndex) {
    this._model?.moveBandZOrder(fromIndex, toIndex);
  }

  get sampleRate() {
    return (
      this._model?.sampleRate() ??
      (this.hasAttribute('sample-rate')
        ? this._validSampleRate(this.getAttribute('sample-rate'))
        : Defaults.SAMPLE_RATE)
    );
  }
  set sampleRate(value) {
    const rate = this._validSampleRate(value);
    if (this._frequencyRange && this._frequencyRange.max > rate / 2) {
      throw invalidParameter('visible frequency range exceeds Nyquist');
    }
    this._model?.setSampleRate(rate);
    this._reflect('sample-rate', rate);
  }
  setSampleRate(rate) {
    this.sampleRate = rate;
  }
  nyquistFrequency() {
    return this.sampleRate / 2;
  }

  get lpf() {
    return this._model?.getLpf() ?? { frequency: Defaults.LPF_FREQ_DEFAULT, enabled: false };
  }
  set lpf(params) {
    this._model?.setLpf(params);
  }
  getLpf() {
    return this.lpf;
  }
  isLpfEnabled() {
    return this.lpf.enabled;
  }
  setLpfEnabled(enabled) {
    this._model?.setLpfEnabled(enabled);
  }
  setLpfFrequency(frequency) {
    this._model?.setLpfFrequency(frequency);
  }

  get hpf() {
    return this._model?.getHpf() ?? { frequency: Defaults.HPF_FREQ_DEFAULT, enabled: false };
  }
  set hpf(params) {
    this._model?.setHpf(params);
  }
  getHpf() {
    return this.hpf;
  }
  isHpfEnabled() {
    return this.hpf.enabled;
  }
  setHpfEnabled(enabled) {
    this._model?.setHpfEnabled(enabled);
  }
  setHpfFrequency(frequency) {
    this._model?.setHpfFrequency(frequency);
  }

  setQRange(filterType, min, max) {
    this._model?.setQRange(filterType, min, max);
  }
  qRange(filterType) {
    return this._model?.qRange(filterType) ?? { min: 0.4, max: 128 };
  }

  get gainMin() {
    return (
      this._renderer?._mapper.gainMin ??
      (this.hasAttribute('gain-min') ? Number(this.getAttribute('gain-min')) : Defaults.GAIN_MIN)
    );
  }
  set gainMin(value) {
    this.setGainRange(value, this.gainMax);
  }
  get gainMax() {
    return (
      this._renderer?._mapper.gainMax ??
      (this.hasAttribute('gain-max') ? Number(this.getAttribute('gain-max')) : Defaults.GAIN_MAX)
    );
  }
  set gainMax(value) {
    this.setGainRange(this.gainMin, value);
  }
  setGainRange(minValue, maxValue) {
    const min = finiteNumber(minValue, 'gain-min');
    const max = finiteNumber(maxValue, 'gain-max');
    if (min >= max) throw invalidParameter('gain-min must be smaller than gain-max');
    this._reflecting = true;
    try {
      this.setAttribute('gain-min', String(min));
      this.setAttribute('gain-max', String(max));
    } finally {
      this._reflecting = false;
    }
    this._applyGainRange();
  }

  get pointCount() {
    return (
      this._curveEngine?._pointCount ??
      (this.hasAttribute('point-count')
        ? Number(this.getAttribute('point-count'))
        : Defaults.POINT_COUNT)
    );
  }
  set pointCount(value) {
    const count = this._validPointCount(value);
    this._curveEngine?.setPointCount(count);
    this._recomputeCurve();
    this._reflect('point-count', count);
  }
  setCurvePointCount(count) {
    this.pointCount = count;
  }
  curvePointCount() {
    return this.pointCount;
  }

  _setColor(name, color) {
    if (typeof color !== 'string' || !color.trim())
      throw invalidParameter(`${name} must be a color string`);
    this._reflect(name, color.trim());
    this._syncTheme();
  }
  get curveColor() {
    return (
      this.getAttribute('curve-color') ?? this._renderer?._theme.curveColor ?? Theme.curveColor
    );
  }
  set curveColor(color) {
    this._setColor('curve-color', color);
  }
  get backgroundColor() {
    return (
      this.getAttribute('background-color') ?? this._renderer?._theme.background ?? Theme.background
    );
  }
  set backgroundColor(color) {
    this._setColor('background-color', color);
  }
  get bandColor() {
    return this.getAttribute('band-color') ?? this._renderer?._theme.bandFill ?? Theme.bandFill;
  }
  set bandColor(color) {
    this._setColor('band-color', color);
  }
  setCurveColor(color) {
    this.curveColor = color;
  }
  setBackgroundColor(color) {
    this.backgroundColor = color;
  }
  setTheme(partial) {
    this._themeOverrides = { ...this._themeOverrides, ...partial };
    this._syncTheme();
  }
  renderNow() {
    this._renderer?.renderNow();
  }

  setFrequencyVisibleRange(minValue, maxValue) {
    const min = finiteNumber(minValue, 'freq-min');
    const max = finiteNumber(maxValue, 'freq-max');
    if (min <= 0 || min >= max || max > this.nyquistFrequency()) {
      throw invalidParameter('invalid visible frequency range');
    }
    this._frequencyRange = { min, max };
    this._updateFrequencyRange();
    this._recomputeCurve();
  }

  reset() {
    if (!this._model) return;
    this._frequencyRange = null;
    this._model.reset();
    this.sampleRate = Defaults.SAMPLE_RATE;
    this.pointCount = Defaults.POINT_COUNT;
    this._updateFrequencyRange();
    this._recomputeCurve();
  }
}
