export class HitTester {
  /**
   * @param {import('../core/EqualizerModel.js').EqualizerModel} model
   * @param {import('../core/CoordinateMapper.js').CoordinateMapper} mapper
   * @param {import('../render/theme.js').ThemeConfig} theme
   */
  constructor(model, mapper, theme) {
    this._model = model;
    this._mapper = mapper;
    this._theme = theme;
  }

  /**
   * @param {number} cssX
   * @param {number} cssY
   * @returns {{ kind: 'band'|'lpf'|'hpf'|null, index?: number }}
   */
  hitTest(cssX, cssY) {
    const vp = this._mapper.viewport;
    const r = this._theme.bandRadius;
    const rx = this._theme.lpfEllipseRX;
    const ry = this._theme.lpfEllipseRY;

    // Check bands first (in reverse draw order — focused/upper first)
    const allBands = this._model.allBands();
    const focusedIdx = this._model.focusedBandIndex();

    // Check focused band first
    if (focusedIdx >= 0) {
      const band = this._model.bandAt(focusedIdx);
      if (band) {
        const bx = this._mapper.freqToX(band.frequency);
        const by = this._mapper.gainToY(band.gain);
        const dx = cssX - bx;
        const dy = cssY - by;
        if (dx * dx + dy * dy <= r * r + 2) {
          return { kind: 'band', index: focusedIdx };
        }
      }
    }

    // Check other bands
    for (const band of allBands) {
      if (band.index === focusedIdx) continue;
      const bx = this._mapper.freqToX(band.frequency);
      const by = this._mapper.gainToY(band.gain);
      const dx = cssX - bx;
      const dy = cssY - by;
      if (dx * dx + dy * dy <= r * r + 2) {
        return { kind: 'band', index: band.index };
      }
    }

    // Check LPF/HPF ellipses
    // LPF: top-right of viewport
    const lpfHits = this._hitTestEllipse(cssX, cssY, vp.x + vp.width - rx - 4, vp.y + ry + 4, rx, ry);
    if (lpfHits) return { kind: 'lpf' };

    // HPF: top-left of viewport
    const hpfHits = this._hitTestEllipse(cssX, cssY, vp.x + rx + 4, vp.y + ry + 4, rx, ry);
    if (hpfHits) return { kind: 'hpf' };

    return { kind: null };
  }

  /**
   * @private
   */
  _hitTestEllipse(px, py, cx, cy, rx, ry) {
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    return dx * dx + dy * dy <= 1.2; // slight tolerance
  }
}
