export class CurveLayer {
  /**
   * @param {import('../core/CoordinateMapper.js').CoordinateMapper} mapper
   * @param {import('./theme.js').ThemeConfig} theme
   */
  constructor(mapper, theme) {
    this._mapper = mapper;
    this._theme = theme;
    this._totalCurve = [];
    this._singleBandCurve = null; // { bandIndex: number, points: Array }
  }

  /**
   * @param {Array<{freq: number, gainDb: number}>} points
   */
  setTotalCurve(points) {
    this._totalCurve = points;
  }

  /**
   * @param {number} bandIndex
   * @param {Array<{freq: number, gainDb: number}>} points
   */
  setSingleBandCurve(bandIndex, points) {
    this._singleBandCurve = { bandIndex, points };
  }

  clearSingleBandCurve() {
    this._singleBandCurve = null;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const vp = this._mapper.viewport;
    const theme = this._theme;

    // Clamp helper
    const clampY = (y) => Math.max(vp.y, Math.min(vp.y + vp.height, y));

    // ---- Draw single band curve (bottom layer, if present) ----
    if (this._singleBandCurve) {
      const pts = this._singleBandCurve.points;
      if (pts.length > 0) {
        ctx.save();

        // Fill below curve
        ctx.beginPath();
        const firstX = this._mapper.freqToX(pts[0].freq);
        const firstY = clampY(this._mapper.gainToY(pts[0].gainDb));
        ctx.moveTo(firstX, firstY);
        for (let i = 1; i < pts.length; i++) {
          const x = this._mapper.freqToX(pts[i].freq);
          const y = clampY(this._mapper.gainToY(pts[i].gainDb));
          ctx.lineTo(x, y);
        }
        // Close at bottom
        const lastX = this._mapper.freqToX(pts[pts.length - 1].freq);
        ctx.lineTo(lastX, vp.y + vp.height);
        ctx.lineTo(firstX, vp.y + vp.height);
        ctx.closePath();
        ctx.fillStyle = theme.fillColor;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        ctx.moveTo(firstX, firstY);
        for (let i = 1; i < pts.length; i++) {
          const x = this._mapper.freqToX(pts[i].freq);
          const y = clampY(this._mapper.gainToY(pts[i].gainDb));
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = theme.curveColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }
    }

    // ---- Draw total curve ----
    const pts = this._totalCurve;
    if (pts.length > 0) {
      ctx.save();
      ctx.beginPath();
      const firstX = this._mapper.freqToX(pts[0].freq);
      const firstY = clampY(this._mapper.gainToY(pts[0].gainDb));
      ctx.moveTo(firstX, firstY);
      for (let i = 1; i < pts.length; i++) {
        const x = this._mapper.freqToX(pts[i].freq);
        const y = clampY(this._mapper.gainToY(pts[i].gainDb));
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = theme.curveColor;
      ctx.lineWidth = theme.curveLineWidth;
      ctx.stroke();
      ctx.restore();
    }
  }
}
