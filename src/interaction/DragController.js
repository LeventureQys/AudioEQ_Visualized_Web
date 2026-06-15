/** @typedef {import('./HitTester.js').HitTester} HitTester */

export class DragController extends EventTarget {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../core/EqualizerModel.js').EqualizerModel} model
   * @param {import('../core/CoordinateMapper.js').CoordinateMapper} mapper
   * @param {HitTester} hitTester
   * @param {import('../render/theme.js').ThemeConfig} theme
   */
  constructor(canvas, model, mapper, hitTester, theme) {
    super();
    this._canvas = canvas;
    this._model = model;
    this._mapper = mapper;
    this._hitTester = hitTester;
    this._theme = theme;
    this._dragging = null; // { kind, index, startX, startY }
    this._attached = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
  }

  attach() {
    if (this._attached) return;
    this._canvas.addEventListener('pointerdown', this._onPointerDown);
    this._canvas.addEventListener('pointermove', this._onPointerMove);
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._canvas.addEventListener('pointercancel', this._onPointerCancel);
    this._canvas.style.touchAction = 'none'; // prevent scroll on touch
    this._attached = true;
  }

  detach() {
    if (!this._attached) return;
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
    this._canvas.removeEventListener('pointermove', this._onPointerMove);
    this._canvas.removeEventListener('pointerup', this._onPointerUp);
    this._canvas.removeEventListener('pointercancel', this._onPointerCancel);
    this._canvas.style.touchAction = '';
    this._attached = false;
  }

  /**
   * @private
   */
  _onPointerDown(e) {
    const rect = this._canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const hit = this._hitTester.hitTest(cssX, cssY);

    if (hit.kind === 'band') {
      this._model.setFocusedBandIndex(hit.index);
      this._dragging = { kind: 'band', index: hit.index, startX: cssX, startY: cssY };
      this._canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (hit.kind === 'lpf') {
      this._model.setFocusedBandIndex(-1);
      this._dragging = { kind: 'lpf', index: null, startX: cssX, startY: cssY };
      this._canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (hit.kind === 'hpf') {
      this._model.setFocusedBandIndex(-1);
      this._dragging = { kind: 'hpf', index: null, startX: cssX, startY: cssY };
      this._canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else {
      // Click on empty space — clear focus
      this._model.setFocusedBandIndex(-1);
    }
  }

  /**
   * @private
   */
  _onPointerMove(e) {
    if (!this._dragging) return;

    const rect = this._canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    if (this._dragging.kind === 'band') {
      const freq = this._mapper.xToFreq(cssX);
      const gain = this._mapper.yToGain(cssY);
      this._model.setBandParams(this._dragging.index, {
        frequency: freq,
        gain: gain,
      });
      // Emit internal event for Element layer to re-dispatch as DOM event
      const band = this._model.bandAt(this._dragging.index);
      if (band) {
        this.dispatchEvent(new CustomEvent('band-dragged', {
          detail: { index: this._dragging.index, frequency: band.frequency, gain: band.gain },
        }));
      }
    } else if (this._dragging.kind === 'lpf') {
      // LPF: horizontal only (frequency)
      const freq = this._mapper.xToFreq(cssX);
      this._model.setLpfFrequency(freq);
    } else if (this._dragging.kind === 'hpf') {
      // HPF: horizontal only (frequency)
      const freq = this._mapper.xToFreq(cssX);
      this._model.setHpfFrequency(freq);
    }
  }

  /**
   * @private
   */
  _onPointerUp(e) {
    if (!this._dragging) return;
    this._canvas.releasePointerCapture(e.pointerId);
    this._dragging = null;
  }

  /**
   * @private
   */
  _onPointerCancel(e) {
    if (!this._dragging) return;
    this._canvas.releasePointerCapture(e.pointerId);
    this._dragging = null;
  }
}
