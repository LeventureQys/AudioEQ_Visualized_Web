/** @typedef {import('./HitTester.js').HitTester} HitTester */

export class DragController extends EventTarget {
  static ACTIVATION_THRESHOLD = 16;

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
    this._dragging = null;
    this._attached = false;
    this._moveFrame = null;
    this._pendingMove = null;
    this._lastMove = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
  }

  _filterCenterFreq() {
    return Math.sqrt(this._mapper.freqMin * this._mapper.freqMax);
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
    if (this._moveFrame !== null) cancelAnimationFrame(this._moveFrame);
    this._moveFrame = null;
    this._pendingMove = null;
    this._dragging = null;
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
    this._lastMove = null;

    if (hit.kind === 'band') {
      this._model.setFocusedBandIndex(hit.index);
      this._dragging = { kind: 'band', index: hit.index, startX: cssX, startY: cssY };
      this._canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (hit.kind === 'lpf') {
      this._model.setFocusedBandIndex(-1);
      const lpf = this._model.getLpf();
      if (lpf.enabled) {
        this._dragging = { kind: 'lpf', startX: cssX, startY: cssY };
      } else {
        this._dragging = { kind: 'lpf', pending: true, startX: cssX, startY: cssY };
      }
      this._canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (hit.kind === 'hpf') {
      this._model.setFocusedBandIndex(-1);
      const hpf = this._model.getHpf();
      if (hpf.enabled) {
        this._dragging = { kind: 'hpf', startX: cssX, startY: cssY };
      } else {
        this._dragging = { kind: 'hpf', pending: true, startX: cssX, startY: cssY };
      }
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

    // Activation threshold for disabled filters (released from edge)
    if (this._dragging.pending) {
      const dx = cssX - this._dragging.startX;
      const dy = cssY - this._dragging.startY;
      if (Math.sqrt(dx * dx + dy * dy) < DragController.ACTIVATION_THRESHOLD) return;
      // Transition to active drag – filter snaps to pointer
      delete this._dragging.pending;
    }

    this._pendingMove = { cssX, cssY };
    if (this._moveFrame === null) {
      this._moveFrame = requestAnimationFrame(() => {
        this._moveFrame = null;
        this._flushMove();
      });
    }
  }

  _flushMove() {
    if (!this._dragging || !this._pendingMove) return;
    const { cssX, cssY } = this._pendingMove;
    this._pendingMove = null;
    this._lastMove = { cssX, cssY };
    if (this._dragging.kind === 'band') {
      const freq = this._mapper.xToFreq(cssX);
      const gain = this._mapper.yToGain(cssY);
      this._model.setBandParams(this._dragging.index, {
        frequency: freq,
        gain: gain,
      });
      const band = this._model.bandAt(this._dragging.index);
      if (band) {
        this.dispatchEvent(
          new CustomEvent('band-dragged', {
            detail: { index: this._dragging.index, frequency: band.frequency, gain: band.gain },
          }),
        );
      }
    } else if (this._dragging.kind === 'lpf') {
      const freq = this._mapper.xToFreq(cssX);
      const center = this._filterCenterFreq();
      const clamped = Math.max(center, Math.min(this._mapper.freqMax, freq));
      this._model.setLpfFrequency(clamped);
    } else if (this._dragging.kind === 'hpf') {
      const freq = this._mapper.xToFreq(cssX);
      const center = this._filterCenterFreq();
      const clamped = Math.max(this._mapper.freqMin, Math.min(center, freq));
      this._model.setHpfFrequency(clamped);
    }
  }

  /**
   * @private
   */
  _onPointerUp(e) {
    if (!this._dragging) return;
    if (this._moveFrame !== null) cancelAnimationFrame(this._moveFrame);
    this._moveFrame = null;
    if (!this._dragging.pending) {
      if (this._pendingMove) {
        const rect = this._canvas.getBoundingClientRect();
        this._pendingMove = { cssX: e.clientX - rect.left, cssY: e.clientY - rect.top };
        this._flushMove();
      } else {
        const rect = this._canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        if (
          cssX !== (this._lastMove?.cssX ?? this._dragging.startX) ||
          cssY !== (this._lastMove?.cssY ?? this._dragging.startY)
        ) {
          this._pendingMove = { cssX, cssY };
          this._flushMove();
        }
      }
    }
    this._pendingMove = null;
    this._canvas.releasePointerCapture(e.pointerId);
    this._dragging = null;
  }

  /**
   * @private
   */
  _onPointerCancel(e) {
    if (!this._dragging) return;
    if (this._moveFrame !== null) cancelAnimationFrame(this._moveFrame);
    this._moveFrame = null;
    this._pendingMove = null;
    this._canvas.releasePointerCapture(e.pointerId);
    this._dragging = null;
  }
}
