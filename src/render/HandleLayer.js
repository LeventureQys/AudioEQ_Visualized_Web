export class HandleLayer {
  /**
   * @param {import('../core/CoordinateMapper.js').CoordinateMapper} mapper
   * @param {import('../core/EqualizerModel.js').EqualizerModel} model
   * @param {import('./theme.js').ThemeConfig} theme
   */
  constructor(mapper, model, theme) {
    this._mapper = mapper;
    this._model = model;
    this._theme = theme;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const theme = this._theme;
    const model = this._model;
    const mapper = this._mapper;

    ctx.save();
    ctx.font = `${theme.labelFontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const allBands = model.allBands();
    const focusedIdx = model.focusedBandIndex();

    // ---- Draw normal bands (unfocused first) ----
    for (const band of allBands) {
      if (band.index === focusedIdx) continue; // draw focused last

      const x = mapper.freqToX(band.frequency);
      const y = mapper.gainToY(band.gain);

      // Circle
      ctx.beginPath();
      ctx.arc(x, y, theme.bandRadius, 0, Math.PI * 2);
      ctx.fillStyle = theme.bandFill;
      ctx.fill();
      ctx.strokeStyle = theme.bandStroke;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Index number
      ctx.fillStyle = theme.labelColor;
      ctx.fillText(String(band.index), x, y);
    }

    // ---- Draw focused band (on top) ----
    if (focusedIdx >= 0) {
      const band = model.bandAt(focusedIdx);
      if (band) {
        const x = mapper.freqToX(band.frequency);
        const y = mapper.gainToY(band.gain);

        ctx.beginPath();
        ctx.arc(x, y, theme.bandRadius, 0, Math.PI * 2);
        ctx.fillStyle = theme.bandFocusFill;
        ctx.fill();
        ctx.strokeStyle = theme.bandStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = theme.labelColor;
        ctx.fillText(String(band.index), x, y);
      }
    }

    // ---- Draw LPF ellipse ----
    this._drawFilterHandle(ctx, model.getLpf(), 'LPF', theme, mapper, theme.lpfEllipseRX, theme.lpfEllipseRY);

    // ---- Draw HPF ellipse ----
    this._drawFilterHandle(ctx, model.getHpf(), 'HPF', theme, mapper, theme.lpfEllipseRX, theme.lpfEllipseRY);

    ctx.restore();
  }

  /**
   * @private
   */
  _drawFilterHandle(ctx, filter, label, theme, mapper, rx, ry) {
    if (!filter) return;

    const x = mapper.freqToX(filter.frequency);
    const y = mapper.gainToY(0);

    ctx.save();

    // Ellipse on 0dB line at cutoff frequency
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (filter.enabled) {
      ctx.fillStyle = theme.bandFill;
      ctx.fill();
      ctx.strokeStyle = theme.zeroDbColor;
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = theme.filterDisabledFill;
      ctx.fill();
      ctx.strokeStyle = theme.filterDisabledStroke;
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    // Label text centered on ellipse (smaller font for filter handles)
    ctx.fillStyle = theme.labelColor;
    ctx.font = `bold ${theme.filterLabelFontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);

    ctx.restore();
  }
}
