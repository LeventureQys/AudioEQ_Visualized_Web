import { Theme } from './theme.js';
import { CoordinateMapper } from '../core/CoordinateMapper.js';
import { GridLayer } from './GridLayer.js';
import { LabelLayer } from './LabelLayer.js';
import { CurveLayer } from './CurveLayer.js';
import { HandleLayer } from './HandleLayer.js';
import { Defaults } from '../core/types.js';

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../core/EqualizerModel.js').EqualizerModel} model
   * @param {Partial<import('./theme.js').ThemeConfig>} [theme]
   */
  constructor(canvas, model, theme = {}) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._model = model;
    this._theme = { ...Theme, ...theme };
    this._dirty = false;
    this._rafId = null;
    this._destroyed = false;

    this._setupViewport();
    this._mapper = new CoordinateMapper({
      viewport: this._viewport,
      freqMin: Defaults.FREQ_MIN,
      freqMax: Defaults.FREQ_MAX,
      gainMin: Defaults.GAIN_MIN,
      gainMax: Defaults.GAIN_MAX,
    });

    this._gridLayer = new GridLayer(this._mapper, this._theme);
    this._labelLayer = new LabelLayer(this._mapper, this._theme);
    this._curveLayer = new CurveLayer(this._mapper, this._theme);
    this._handleLayer = new HandleLayer(this._mapper, model, this._theme);

    this._setupDprListener();
    this._setupModelListeners();

    // Initial paint
    this.markDirty();
  }

  _setupViewport() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this._canvas.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;
    this._canvas.width = cssW * dpr;
    this._canvas.height = cssH * dpr;
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._cssWidth = cssW;
    this._cssHeight = cssH;
    this._dpr = dpr;
    this._updateViewport();
  }

  _updateViewport() {
    const m = this._theme.margin;
    this._viewport = {
      x: m.left,
      y: m.top,
      width: this._cssWidth - m.left - m.right,
      height: this._cssHeight - m.top - m.bottom,
    };
  }

  _setupDprListener() {
    const dpr = window.devicePixelRatio || 1;
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const handler = () => {
      if (this._destroyed) return;
      this.resize(this._cssWidth, this._cssHeight);
    };
    mq.addEventListener('change', handler);
    this._cleanupDpr = () => mq.removeEventListener('change', handler);
  }

  _setupModelListeners() {
    const markDirty = () => this.markDirty();
    const events = [
      'band-changed', 'band-added', 'band-removed',
      'band-count-changed', 'focused-band-changed',
      'sample-rate-changed', 'lpf-changed', 'hpf-changed', 'model-reset',
    ];
    for (const ev of events) {
      this._model.addEventListener(ev, markDirty);
    }
    this._cleanupModel = () => {
      for (const ev of events) {
        this._model.removeEventListener(ev, markDirty);
      }
    };
  }

  /** @param {number} cssWidth @param {number} cssHeight */
  resize(cssWidth, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = cssWidth * dpr;
    this._canvas.height = cssHeight * dpr;
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._cssWidth = cssWidth;
    this._cssHeight = cssHeight;
    this._dpr = dpr;
    this._updateViewport();
    this._mapper.setViewport(this._viewport);
    this.markDirty();
  }

  destroy() {
    this._destroyed = true;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._cleanupDpr) this._cleanupDpr();
    if (this._cleanupModel) this._cleanupModel();
  }

  markDirty() {
    if (this._destroyed) return;
    this._dirty = true;
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this._renderLoop());
    }
  }

  renderNow() {
    this._renderFrame();
  }

  _renderLoop() {
    this._rafId = null;
    if (this._dirty) {
      this._renderFrame();
      this._dirty = false;
    }
  }

  _renderFrame() {
    if (this._cssWidth === 0 || this._cssHeight === 0) return;

    const ctx = this._ctx;
    const w = this._cssWidth;
    const h = this._cssHeight;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = this._theme.background;
    ctx.fillRect(0, 0, w, h);

    // Draw layers in order
    this._gridLayer.draw(ctx);
    this._labelLayer.draw(ctx);
    this._curveLayer.draw(ctx);
    this._handleLayer.draw(ctx);
  }

  /** @param {Array<{freq: number, gainDb: number}>} points */
  setTotalCurve(points) {
    this._curveLayer.setTotalCurve(points);
    this.markDirty();
  }

  /** @param {number} bandIndex @param {Array<{freq: number, gainDb: number}>} points */
  setSingleBandCurve(bandIndex, points) {
    this._curveLayer.setSingleBandCurve(bandIndex, points);
    this.markDirty();
  }

  clearSingleBandCurve() {
    this._curveLayer.clearSingleBandCurve();
    this.markDirty();
  }

  /** @param {Partial<import('./theme.js').ThemeConfig>} partial */
  setTheme(partial) {
    Object.assign(this._theme, partial);
    this.markDirty();
  }
}
