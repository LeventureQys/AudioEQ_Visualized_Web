import { describe, it, expect } from 'vitest';
import { CurveEngine } from '../../src/core/CurveEngine.js';
import { EqualizerModel } from '../../src/core/EqualizerModel.js';

describe('CurveEngine', () => {
  describe('generateLogFrequencyPoints', () => {
    it('should generate correct number of points', () => {
      const points = CurveEngine.generateLogFrequencyPoints(20, 20000, 10);
      expect(points).toHaveLength(10);
    });

    it('should start at freqMin and end at freqMax', () => {
      const points = CurveEngine.generateLogFrequencyPoints(20, 20000, 100);
      expect(points[0]).toBeCloseTo(20, 5);
      expect(points[99]).toBeCloseTo(20000, 0);
    });

    it('should be monotonically increasing', () => {
      const points = CurveEngine.generateLogFrequencyPoints(20, 20000, 500);
      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeGreaterThan(points[i - 1]);
      }
    });
  });

  describe('computeTotalCurve', () => {
    it('should return correct number of points', () => {
      const engine = new CurveEngine({ pointCount: 100 });
      const model = new EqualizerModel();
      const curve = engine.computeTotalCurve(model);
      expect(curve).toHaveLength(100);
    });

    it('should return array with freq and gainDb fields', () => {
      const engine = new CurveEngine({ pointCount: 10 });
      const model = new EqualizerModel();
      const curve = engine.computeTotalCurve(model);
      for (const point of curve) {
        expect(point).toHaveProperty('freq');
        expect(point).toHaveProperty('gainDb');
        expect(typeof point.freq).toBe('number');
        expect(typeof point.gainDb).toBe('number');
      }
    });

    it('should produce a peak at center freq for a boosted band', () => {
      const engine = new CurveEngine({ pointCount: 500, freqMin: 20, freqMax: 20000 });
      const model = new EqualizerModel();
      model.setBandCount(1);
      model.setBandParams(0, { frequency: 1000, gain: 6, q: 1, type: 'peak' });

      const curve = engine.computeTotalCurve(model);
      let maxDb = -Infinity;
      let maxFreq = 0;
      for (const point of curve) {
        if (point.gainDb > maxDb) {
          maxDb = point.gainDb;
          maxFreq = point.freq;
        }
      }
      expect(maxFreq).toBeGreaterThan(500);
      expect(maxFreq).toBeLessThan(2000);
      expect(maxDb).toBeGreaterThan(4);
      expect(maxDb).toBeLessThan(8);
    });

    it('should return 0 gain for all-bypass bands', () => {
      const engine = new CurveEngine({ pointCount: 50 });
      const model = new EqualizerModel();
      model.setLpfEnabled(false);
      model.setHpfEnabled(false);
      for (let i = 0; i < 5; i++) {
        model.setBandParams(i, { bypass: true });
      }
      const curve = engine.computeTotalCurve(model);
      for (const point of curve) {
        expect(Math.abs(point.gainDb)).toBeLessThan(1e-10);
      }
    });

    it('should show LPF effect when enabled', () => {
      const engine = new CurveEngine({ pointCount: 100, freqMin: 20, freqMax: 20000 });
      const model = new EqualizerModel();
      model.setBandCount(0);
      model.setHpfEnabled(false);
      model.setLpfEnabled(true);
      model.setLpfFrequency(1000);

      const curve = engine.computeTotalCurve(model);
      expect(curve[0].gainDb).toBeGreaterThan(-1);
      const lastPoints = curve.slice(-10);
      const avgHighGain = lastPoints.reduce((s, p) => s + p.gainDb, 0) / lastPoints.length;
      expect(avgHighGain).toBeLessThan(-10);
    });
  });

  describe('computeSingleBandCurve', () => {
    it('should return empty array for invalid index', () => {
      const engine = new CurveEngine();
      const model = new EqualizerModel();
      expect(engine.computeSingleBandCurve(99, model)).toEqual([]);
    });

    it('should return curve for a valid band', () => {
      const engine = new CurveEngine({ pointCount: 50 });
      const model = new EqualizerModel();
      const curve = engine.computeSingleBandCurve(0, model);
      expect(curve).toHaveLength(50);
    });
  });

  describe('performance', () => {
    it('should compute 500 points with 5 bands in under 50ms', () => {
      const engine = new CurveEngine({ pointCount: 500 });
      const model = new EqualizerModel();
      const start = performance.now();
      engine.computeTotalCurve(model);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('setPointCount', () => {
    it('should change resolution', () => {
      const engine = new CurveEngine({ pointCount: 10 });
      const model = new EqualizerModel();
      expect(engine.computeTotalCurve(model)).toHaveLength(10);
      engine.setPointCount(50);
      expect(engine.computeTotalCurve(model)).toHaveLength(50);
    });
  });

  describe('setFreqRange', () => {
    it('should change frequency range', () => {
      const engine = new CurveEngine({ pointCount: 50 });
      const model = new EqualizerModel();
      engine.setFreqRange(200, 5000);
      const curve = engine.computeTotalCurve(model);
      expect(curve[0].freq).toBeCloseTo(200, 5);
      expect(curve[curve.length - 1].freq).toBeCloseTo(5000, 0);
    });
  });

  describe('computeTotalCurve with HPF', () => {
    it('should show high-pass behavior when HPF enabled', () => {
      const engine = new CurveEngine({ pointCount: 100, freqMin: 20, freqMax: 20000 });
      const model = new EqualizerModel();
      model.setBandCount(0);
      model.setHpf({ frequency: 1000, enabled: true });

      const curve = engine.computeTotalCurve(model);
      expect(curve[0].gainDb).toBeLessThan(-10);
      const lastPoints = curve.slice(-10);
      const avgHighGain = lastPoints.reduce((s, p) => s + p.gainDb, 0) / lastPoints.length;
      expect(avgHighGain).toBeGreaterThan(-1);
    });
  });

  describe('computeTotalCurve with both LPF and HPF', () => {
    it('should show band-pass behavior when both enabled', () => {
      const engine = new CurveEngine({ pointCount: 100, freqMin: 20, freqMax: 20000 });
      const model = new EqualizerModel();
      model.setBandCount(0);
      model.setLpf({ frequency: 2000, enabled: true });
      model.setHpf({ frequency: 200, enabled: true });

      const curve = engine.computeTotalCurve(model);
      const lowPoints = curve.slice(0, 5);
      const midPoints = curve.slice(40, 60);
      const highPoints = curve.slice(-5);
      const avgLow = lowPoints.reduce((s, p) => s + p.gainDb, 0) / lowPoints.length;
      const avgMid = midPoints.reduce((s, p) => s + p.gainDb, 0) / midPoints.length;
      const avgHigh = highPoints.reduce((s, p) => s + p.gainDb, 0) / highPoints.length;
      expect(avgLow).toBeLessThan(-3);
      expect(avgMid).toBeGreaterThan(-3);
      expect(avgHigh).toBeLessThan(-3);
    });
  });

  describe('Multiple peak bands accumulating', () => {
    it('should accumulate gains correctly from multiple bands', () => {
      const engine = new CurveEngine({ pointCount: 100, freqMin: 20, freqMax: 20000 });
      const model = new EqualizerModel();
      model.setBandCount(0);
      model.addBand({ frequency: 1000, gain: 6, q: 1, type: 'peak' });
      model.addBand({ frequency: 3000, gain: -6, q: 1, type: 'peak' });

      const curve = engine.computeTotalCurve(model);
      const thousandPt = curve.find(p => Math.abs(p.freq - 1000) < 100);
      const threeKPt = curve.find(p => Math.abs(p.freq - 3000) < 100);
      expect(thousandPt).toBeDefined();
      expect(threeKPt).toBeDefined();
      expect(thousandPt.gainDb).toBeGreaterThan(4);
      expect(threeKPt.gainDb).toBeLessThan(-4);
    });
  });
});
