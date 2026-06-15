export class LabelLayer {
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
    ctx.font = `${theme.labelFontSize}px system-ui, sans-serif`;
    ctx.fillStyle = theme.labelColor;
    ctx.textBaseline = 'top';

    // ---- Freq labels ----
    const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    ctx.textAlign = 'center';
    for (const freq of freqTicks) {
      const label = freq < 1000 ? `${freq}Hz` : `${freq / 1000}KHz`;
      const x = this._mapper.freqToX(freq);
      const y = vp.y + vp.height + 4; // 4px gap below bottom axis
      ctx.fillText(label, x, y);
    }

    // ---- Gain labels ----
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let g = -24; g <= 12; g += 6) {
      const label = g > 0 ? `${g}` : `${g}`;
      const y = this._mapper.gainToY(g);
      const x = vp.x - 4; // 4px gap left of left axis
      ctx.fillText(label, x, y);
    }

    ctx.restore();
  }
}
