// @ts-nocheck
import { EqualizerModel } from '../core/EqualizerModel.js';
import { CurveEngine } from '../core/CurveEngine.js';
import { CanvasRenderer } from '../render/CanvasRenderer.js';
import { HitTester } from '../interaction/HitTester.js';
import { DragController } from '../interaction/DragController.js';
import { Defaults } from '../core/types.js';

const MODEL_EVENTS = [
  'band-changed', 'band-added', 'band-removed', 'band-count-changed',
  'focused-band-changed', 'sample-rate-changed', 'lpf-changed',
  'hpf-changed', 'model-reset',
];

const CURVE_TRIGGERS = [
  'model-reset', 'band-changed', 'band-added', 'band-removed',
  'band-count-changed', 'focused-band-changed',
  'lpf-changed', 'hpf-changed',
];

const BaseHTMLElement = (typeof window !== 'undefined' && typeof customElements !== 'undefined')
  ? HTMLElement
  : class {};

export class AudioEQElement extends BaseHTMLElement {
  static get observedAttributes() {
    return [
      'sample-rate', 'curve-color', 'background-color', 'band-color',
      'gain-min', 'gain-max', 'point-count',
    ];
  }

  constructor() {
    super();
    if (typeof window === 'undefined' || typeof customElements === 'undefined') {
      return;
    }

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; min-width: 200px; min-height: 100px; height: 300px; }
        :host([hidden]) { display: none; }
        canvas { width: 100%; height: 100%; display: block; }
      </style>
      <canvas></canvas>
    `;

    this._canvas = this.shadowRoot.querySelector('canvas');
    this._model = null;
    this._curveEngine = null;
    this._renderer = null;
    this._dragController = null;
    this._resizeObserver = null;
    this._initialized = false;

    this._forwardModelEvent = this._forwardModelEvent.bind(this);
    this._onCurveTrigger = this._onCurveTrigger.bind(this);
  }

  connectedCallback() {
    if (typeof window === 'undefined') return;
    if (this._initialized) return;

    Promise.resolve().then(() => {
      if (!this.isConnected) return;
      this._initComponents();
      this._setupResizeObserver();
      this._applyCssColorHooks();
      this._initialized = true;
    });
  }

  disconnectedCallback() {
    this._teardownResizeObserver();
    this._teardownDragController();
    this._teardownRenderer();
    this._teardownModel();
    this._initialized = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._initialized) return;
    this._attributeToProperty(name, newVal);
  }

  // ========== Initialization ==========

  _initComponents() {
    this._model = new EqualizerModel();
    this._curveEngine = new CurveEngine({
      pointCount: parseInt(this.getAttribute('point-count'), 10) || Defaults.POINT_COUNT,
      freqMin: Defaults.FREQ_MIN,
      freqMax: Defaults.FREQ_MAX,
    });

    const sr = this.getAttribute('sample-rate');
    if (sr) this._model.setSampleRate(parseInt(sr, 10));

    this._renderer = new CanvasRenderer(this._canvas, this._model);
    this._applyThemeAttributes();

    this._applyInitialGainRange();

    const hitTester = new HitTester(
      this._model,
      this._renderer._mapper,
      this._renderer._theme,
    );

    this._dragController = new DragController(
      this._canvas,
      this._model,
      this._renderer._mapper,
      hitTester,
      this._renderer._theme,
    );
    this._dragController.attach();

    this._dragController.addEventListener('band-dragged', (e) => {
      this.dispatchEvent(new CustomEvent('band-dragged', { detail: e.detail }));
    });

    for (const name of MODEL_EVENTS) {
      this._model.addEventListener(name, this._forwardModelEvent);
    }

    for (const name of CURVE_TRIGGERS) {
      this._model.addEventListener(name, this._onCurveTrigger);
    }

    this._model.addEventListener('sample-rate-changed', () => {
      this._updateFrequencyRange();
      this._recomputeCurve();
    });

    this._updateFrequencyRange();
    this._recomputeCurve();
  }

  _updateFrequencyRange() {
    const sr = this._model ? this._model.sampleRate() : Defaults.SAMPLE_RATE;
    const nyquist = sr / 2;
    const freqMax = Math.min(nyquist, 240000);
    this._curveEngine.setFreqRange(Defaults.FREQ_MIN, freqMax);
    if (this._renderer && this._renderer._mapper) {
      this._renderer._mapper.setFreqRange(Defaults.FREQ_MIN, freqMax);
    }
  }

  _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let w, h;
        if (entry.contentBoxSize) {
          w = entry.contentBoxSize[0].inlineSize;
          h = entry.contentBoxSize[0].blockSize;
        } else {
          w = entry.contentRect.width;
          h = entry.contentRect.height;
        }
        if (this._renderer && w > 0 && h > 0) {
          this._renderer.resize(Math.round(w), Math.round(h));
        }
      }
    });
    this._resizeObserver.observe(this);
  }

  _applyThemeAttributes() {
    const curveColor = this.getAttribute('curve-color');
    const bgColor = this.getAttribute('background-color');
    const bandColor = this.getAttribute('band-color');
    const partial = {};
    if (curveColor) partial.curveColor = curveColor;
    if (bgColor) partial.background = bgColor;
    if (bandColor) partial.bandFill = bandColor;
    if (Object.keys(partial).length > 0) {
      this._renderer.setTheme(partial);
    }
  }

  _applyCssColorHooks() {
    if (!this._renderer) return;
    const style = getComputedStyle(this);
    const partial = {};
    const curveColor = style.getPropertyValue('--curve-color').trim();
    const bgColor = style.getPropertyValue('--background-color').trim();
    const bandColor = style.getPropertyValue('--band-color').trim();
    if (curveColor) partial.curveColor = curveColor;
    if (bgColor) partial.background = bgColor;
    if (bandColor) partial.bandFill = bandColor;
    if (Object.keys(partial).length > 0) {
      this._renderer.setTheme(partial);
    }
  }

  _applyInitialGainRange() {
    const gainMin = this.getAttribute('gain-min');
    const gainMax = this.getAttribute('gain-max');
    if (gainMin !== null || gainMax !== null) {
      const min = gainMin !== null ? parseFloat(gainMin) : Defaults.GAIN_MIN;
      const max = gainMax !== null ? parseFloat(gainMax) : Defaults.GAIN_MAX;
      this._renderer._mapper.setGainRange(min, max);
    }
  }

  // ========== Teardown ==========

  _teardownResizeObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  _teardownDragController() {
    if (this._dragController) {
      this._dragController.detach();
      this._dragController = null;
    }
  }

  _teardownRenderer() {
    if (this._renderer) {
      this._renderer.destroy();
      this._renderer = null;
    }
  }

  _teardownModel() {
    if (this._model) {
      for (const name of MODEL_EVENTS) {
        this._model.removeEventListener(name, this._forwardModelEvent);
      }
      for (const name of CURVE_TRIGGERS) {
        this._model.removeEventListener(name, this._onCurveTrigger);
      }
      this._model = null;
    }
    this._curveEngine = null;
  }

  // ========== Attribute → Property ==========

  _attributeToProperty(name, value) {
    switch (name) {
      case 'sample-rate':
        if (this._model) this._model.setSampleRate(parseInt(value, 10));
        break;
      case 'curve-color':
        if (this._renderer) this._renderer.setTheme({ curveColor: value });
        break;
      case 'background-color':
        if (this._renderer) this._renderer.setTheme({ background: value });
        break;
      case 'band-color':
        if (this._renderer) this._renderer.setTheme({ bandFill: value });
        break;
      case 'gain-min':
        if (this._renderer && value !== null) {
          const min = parseFloat(value);
          const max = this._renderer._mapper.gainMax;
          this._renderer._mapper.setGainRange(min, max);
          this._recomputeCurve();
        }
        break;
      case 'gain-max':
        if (this._renderer && value !== null) {
          const min = this._renderer._mapper.gainMin;
          const max = parseFloat(value);
          this._renderer._mapper.setGainRange(min, max);
          this._recomputeCurve();
        }
        break;
      case 'point-count':
        if (this._curveEngine && value !== null) {
          this._curveEngine.setPointCount(parseInt(value, 10));
          this._recomputeCurve();
        }
        break;
    }
  }

  // ========== Curve Computation ==========

  _onCurveTrigger() {
    this._recomputeCurve();
  }

  _recomputeCurve() {
    if (!this._curveEngine || !this._model || !this._renderer) return;

    const totalCurve = this._curveEngine.computeTotalCurve(this._model);
    this._renderer.setTotalCurve(totalCurve);

    const focusedIdx = this._model.focusedBandIndex();
    if (focusedIdx >= 0) {
      const singleCurve = this._curveEngine.computeSingleBandCurve(focusedIdx, this._model);
      this._renderer.setSingleBandCurve(focusedIdx, singleCurve);
    } else {
      this._renderer.clearSingleBandCurve();
    }
  }

  // ========== Event Forwarding ==========

  _forwardModelEvent(e) {
    this.dispatchEvent(new CustomEvent(e.type, { detail: e.detail }));
  }

  // ========== Public API: Band Management ==========

  get bandCount() {
    return this._model ? this._model.bandCount() : 0;
  }

  set bandCount(count) {
    if (this._model) this._model.setBandCount(count);
  }

  bandAt(index) {
    return this._model ? this._model.bandAt(index) : undefined;
  }

  allBands() {
    return this._model ? this._model.allBands() : [];
  }

  addBand(params) {
    return this._model ? this._model.addBand(params) : -1;
  }

  removeBand(index) {
    if (this._model) this._model.removeBand(index);
  }

  setBandParams(index, params) {
    if (this._model) this._model.setBandParams(index, params);
  }

  // ========== Public API: Focus ==========

  get focusedBandIndex() {
    return this._model ? this._model.focusedBandIndex() : -1;
  }

  set focusedBandIndex(index) {
    if (this._model) this._model.setFocusedBandIndex(index);
  }

  // ========== Public API: Z-Order ==========

  moveBandZOrder(fromIndex, toIndex) {
    if (this._model) this._model.moveBandZOrder(fromIndex, toIndex);
  }

  // ========== Public API: Sample Rate ==========

  get sampleRate() {
    return this._model ? this._model.sampleRate() : Defaults.SAMPLE_RATE;
  }

  set sampleRate(rate) {
    if (this._model) {
      this._model.setSampleRate(rate);
      this.setAttribute('sample-rate', String(rate));
    }
  }

  // ========== Public API: LPF / HPF ==========

  get lpf() {
    return this._model
      ? this._model.getLpf()
      : { frequency: Defaults.LPF_FREQ_DEFAULT, enabled: false };
  }

  set lpf(params) {
    if (this._model) this._model.setLpf(params);
  }

  get hpf() {
    return this._model
      ? this._model.getHpf()
      : { frequency: Defaults.HPF_FREQ_DEFAULT, enabled: false };
  }

  set hpf(params) {
    if (this._model) this._model.setHpf(params);
  }

  // ========== Public API: Q Range ==========

  setQRange(filterType, min, max) {
    if (this._model) this._model.setQRange(filterType, min, max);
  }

  qRange(filterType) {
    return this._model
      ? this._model.qRange(filterType)
      : { min: 0.4, max: 128.0 };
  }

  // ========== Public API: Gain Range ==========

  get gainMin() {
    return this._renderer
      ? this._renderer._mapper.gainMin
      : Defaults.GAIN_MIN;
  }

  get gainMax() {
    return this._renderer
      ? this._renderer._mapper.gainMax
      : Defaults.GAIN_MAX;
  }

  // ========== Public API: Theme ==========

  setTheme(partial) {
    if (this._renderer) this._renderer.setTheme(partial);
  }

  // ========== Public API: Re-render ==========

  renderNow() {
    if (this._renderer) this._renderer.renderNow();
  }

  // ========== Public API: Point Count ==========

  get pointCount() {
    return this._curveEngine
      ? this._curveEngine._pointCount
      : Defaults.POINT_COUNT;
  }

  set pointCount(count) {
    if (this._curveEngine) {
      this._curveEngine.setPointCount(count);
      this._recomputeCurve();
      this.setAttribute('point-count', String(count));
    }
  }

  // ========== Public API: Reset ==========

  reset() {
    if (this._model) {
      this._model.setBandCount(Defaults.BAND_COUNT);
      this._model.setSampleRate(Defaults.SAMPLE_RATE);
      this._model.setLpf({ frequency: Defaults.LPF_FREQ_DEFAULT, enabled: false });
      this._model.setHpf({ frequency: Defaults.HPF_FREQ_DEFAULT, enabled: false });
      this._model.setFocusedBandIndex(-1);
    }
  }
}
