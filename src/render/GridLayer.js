import { CoordinateMapper } from '../core/CoordinateMapper.js';

export class GridLayer {
  /**
   * @param {import('../core/CoordinateMapper.js').CoordinateMapper} mapper
   * @param {import('./theme.js').ThemeConfig} theme
   */
  constructor(mapper, theme) {
    this._mapper = mapper;
    this._theme = theme;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const vp = this._mapper.viewport;
    const theme = this._theme;

    ctx.save();

    // ---- Grid lines ----
    ctx.lineWidth = 1;

    // Frequency vertical lines (dynamic from mapper range)
    const freqTicks = CoordinateMapper.generateFreqTicks(this._mapper.freqMin, this._mapper.freqMax);
    ctx.strokeStyle = theme.gridColor;
    ctx.beginPath();
    for (const freq of freqTicks) {
      const x = this._mapper.freqToX(freq);
      ctx.moveTo(x, vp.y);
      ctx.lineTo(x, vp.y + vp.height);
    }

    // Gain horizontal lines every 6dB
    for (let g = -24; g <= 12; g += 6) {
      const y = this._mapper.gainToY(g);
      ctx.moveTo(vp.x, y);
      ctx.lineTo(vp.x + vp.width, y);
    }
    ctx.stroke();

    // ---- 0dB highlighted line ----
    const y0 = this._mapper.gainToY(0);
    ctx.strokeStyle = theme.zeroDbColor;
    ctx.lineWidth = theme.zeroDbLineWidth;
    ctx.beginPath();
    ctx.moveTo(vp.x, y0);
    ctx.lineTo(vp.x + vp.width, y0);
    ctx.stroke();

    // ---- L-shaped axis (left + bottom) ----
    ctx.strokeStyle = theme.axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Left axis
    ctx.moveTo(vp.x, vp.y);
    ctx.lineTo(vp.x, vp.y + vp.height);
    // Bottom axis
    ctx.moveTo(vp.x, vp.y + vp.height);
    ctx.lineTo(vp.x + vp.width, vp.y + vp.height);
    ctx.stroke();

    ctx.restore();
  }
}
