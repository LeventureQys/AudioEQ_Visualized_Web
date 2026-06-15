/**
 * @typedef {Object} ThemeConfig
 * @property {string} background
 * @property {string} curveColor
 * @property {number} curveLineWidth
 * @property {string} fillColor
 * @property {string} gridColor
 * @property {string} axisColor
 * @property {string} zeroDbColor
 * @property {string} labelColor
 * @property {number} labelFontSize
 * @property {string} bandFill
 * @property {string} bandStroke
 * @property {number} bandRadius
 * @property {string} bandFocusFill
 * @property {number} lpfEllipseRX
 * @property {number} lpfEllipseRY
 * @property {{top: number, right: number, bottom: number, left: number}} margin
 */

/** @type {Readonly<ThemeConfig>} */
export const Theme = Object.freeze({
  background: '#262A33',
  curveColor: '#F0A030',
  curveLineWidth: 2,
  fillColor: 'rgba(240,160,48,0.15)',
  gridColor: 'rgba(255,255,255,0.08)',
  axisColor: 'rgba(255,255,255,0.6)',
  zeroDbColor: 'rgba(255,255,255,0.3)',
  labelColor: 'rgba(255,255,255,0.7)',
  labelFontSize: 12,
  bandFill: '#262A33',
  bandStroke: 'rgba(255,255,255,0.9)',
  bandRadius: 10,
  bandFocusFill: '#3A3A3A',
  lpfEllipseRX: 18,
  lpfEllipseRY: 10,
  margin: { top: 16, right: 32, bottom: 32, left: 32 },
});
