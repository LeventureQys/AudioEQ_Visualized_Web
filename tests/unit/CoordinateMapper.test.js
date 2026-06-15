import { describe, it, expect } from 'vitest';
import { CoordinateMapper } from '../../src/core/CoordinateMapper.js';

function createDefaultMapper() {
  return new CoordinateMapper({
    viewport: { x: 32, y: 16, width: 400, height: 200 },
    freqMin: 20,
    freqMax: 20000,
    gainMin: -24,
    gainMax: 12,
  });
}

describe('CoordinateMapper', () => {
  describe('freqToX / xToFreq round-trip', () => {
    it('should round-trip at freqMin', () => {
      const m = createDefaultMapper();
      const x = m.freqToX(20);
      const freq = m.xToFreq(x);
      expect(freq).toBeCloseTo(20, 10);
    });

    it('should round-trip at freqMax', () => {
      const m = createDefaultMapper();
      const x = m.freqToX(20000);
      const freq = m.xToFreq(x);
      expect(freq).toBeCloseTo(20000, 10);
    });

    it('should round-trip at middle frequencies', () => {
      const m = createDefaultMapper();
      for (const f of [50, 100, 500, 1000, 5000, 10000]) {
        const x = m.freqToX(f);
        const freq = m.xToFreq(x);
        expect(Math.abs(freq - f)).toBeLessThan(1e-9);
      }
    });
  });

  describe('gainToY / yToGain round-trip', () => {
    it('should round-trip at gainMin', () => {
      const m = createDefaultMapper();
      const y = m.gainToY(-24);
      const gain = m.yToGain(y);
      expect(gain).toBeCloseTo(-24, 10);
    });

    it('should round-trip at gainMax', () => {
      const m = createDefaultMapper();
      const y = m.gainToY(12);
      const gain = m.yToGain(y);
      expect(gain).toBeCloseTo(12, 10);
    });

    it('should round-trip at various gains', () => {
      const m = createDefaultMapper();
      for (const g of [-18, -12, -6, 0, 6]) {
        const y = m.gainToY(g);
        const gain = m.yToGain(y);
        expect(Math.abs(gain - g)).toBeLessThan(1e-9);
      }
    });
  });

  describe('boundary values', () => {
    it('freqToX(freqMin) should return viewport.x', () => {
      const m = createDefaultMapper();
      expect(m.freqToX(20)).toBeCloseTo(32, 10);
    });

    it('freqToX(freqMax) should return viewport.x + viewport.width', () => {
      const m = createDefaultMapper();
      expect(m.freqToX(20000)).toBeCloseTo(432, 10);
    });

    it('gainToY(gainMax) should return viewport.y', () => {
      const m = createDefaultMapper();
      expect(m.gainToY(12)).toBeCloseTo(16, 10);
    });

    it('gainToY(gainMin) should return viewport.y + viewport.height', () => {
      const m = createDefaultMapper();
      expect(m.gainToY(-24)).toBeCloseTo(216, 10);
    });
  });

  describe('viewport management', () => {
    it('setViewport should update mapping', () => {
      const m = createDefaultMapper();
      m.setViewport({ x: 0, y: 0, width: 800, height: 400 });
      expect(m.freqToX(20)).toBeCloseTo(0, 10);
      expect(m.freqToX(20000)).toBeCloseTo(800, 10);
      expect(m.gainToY(12)).toBeCloseTo(0, 10);
      expect(m.gainToY(-24)).toBeCloseTo(400, 10);
    });

    it('setFreqRange should update freq mapping', () => {
      const m = createDefaultMapper();
      m.setFreqRange(100, 10000);
      expect(m.freqMin).toBe(100);
      expect(m.freqMax).toBe(10000);
      const x = m.freqToX(100);
      expect(x).toBeCloseTo(32, 10);
    });

    it('setGainRange should update gain mapping', () => {
      const m = createDefaultMapper();
      m.setGainRange(-12, 12);
      expect(m.gainMin).toBe(-12);
      expect(m.gainMax).toBe(12);
    });
  });

  describe('clamping', () => {
    it('should clamp freqToX input below freqMin', () => {
      const m = createDefaultMapper();
      expect(m.freqToX(5)).toBeCloseTo(32, 10);
    });

    it('should clamp freqToX input above freqMax', () => {
      const m = createDefaultMapper();
      expect(m.freqToX(25000)).toBeCloseTo(432, 10);
    });

    it('should clamp gainToY input below gainMin', () => {
      const m = createDefaultMapper();
      expect(m.gainToY(-48)).toBeCloseTo(216, 10);
    });

    it('should clamp gainToY input above gainMax', () => {
      const m = createDefaultMapper();
      expect(m.gainToY(24)).toBeCloseTo(16, 10);
    });
  });

  describe('getters', () => {
    it('should return correct values via getters', () => {
      const m = createDefaultMapper();
      expect(m.freqMin).toBe(20);
      expect(m.freqMax).toBe(20000);
      expect(m.gainMin).toBe(-24);
      expect(m.gainMax).toBe(12);
      expect(m.viewport).toEqual({ x: 32, y: 16, width: 400, height: 200 });
    });

    it('viewport getter should return a copy', () => {
      const m = createDefaultMapper();
      const vp = m.viewport;
      vp.x = 999;
      expect(m.viewport.x).toBe(32);
    });
  });

  describe('setViewport updates getters correctly', () => {
    it('should update all viewport getters after setViewport', () => {
      const m = createDefaultMapper();
      m.setViewport({ x: 10, y: 20, width: 600, height: 300 });
      expect(m.viewport).toEqual({ x: 10, y: 20, width: 600, height: 300 });
      expect(m.freqToX(20)).toBeCloseTo(10, 10);
      expect(m.freqToX(20000)).toBeCloseTo(610, 10);
      expect(m.gainToY(12)).toBeCloseTo(20, 10);
      expect(m.gainToY(-24)).toBeCloseTo(320, 10);
    });
  });

  describe('setFreqRange maintains logarithmic properties', () => {
    it('should maintain correct log spacing after range change', () => {
      const m = createDefaultMapper();
      m.setFreqRange(100, 10000);
      expect(m.freqMin).toBe(100);
      expect(m.freqMax).toBe(10000);
      const x100 = m.freqToX(100);
      const x1000 = m.freqToX(1000);
      const x10000 = m.freqToX(10000);
      const midLogRatio = (Math.log(1000) - Math.log(100)) / (Math.log(10000) - Math.log(100));
      const expectedMidX = x100 + (x10000 - x100) * midLogRatio;
      expect(x1000).toBeCloseTo(expectedMidX, 5);
    });
  });

  describe('setGainRange maintains linear properties', () => {
    it('should maintain correct linear mapping after range change', () => {
      const m = createDefaultMapper();
      m.setGainRange(-12, 12);
      expect(m.gainMin).toBe(-12);
      expect(m.gainMax).toBe(12);
      const yTop = m.gainToY(12);
      const yBot = m.gainToY(-12);
      expect(yTop).toBeCloseTo(16, 10);
      expect(yBot).toBeCloseTo(216, 10);
      const yMid = m.gainToY(0);
      const expectedMid = 16 + 200 * (12 - 0) / (12 - (-12));
      expect(yMid).toBeCloseTo(expectedMid, 5);
    });
  });

  describe('round-trip at different viewport sizes', () => {
    it('should round-trip with wide viewport', () => {
      const m = new CoordinateMapper({
        viewport: { x: 0, y: 0, width: 1920, height: 1080 },
        freqMin: 20, freqMax: 20000, gainMin: -24, gainMax: 12,
      });
      for (const f of [20, 100, 1000, 20000]) {
        expect(m.xToFreq(m.freqToX(f))).toBeCloseTo(f, 10);
      }
      for (const g of [-24, -12, 0, 12]) {
        expect(m.yToGain(m.gainToY(g))).toBeCloseTo(g, 10);
      }
    });

    it('should round-trip with small viewport', () => {
      const m = new CoordinateMapper({
        viewport: { x: 0, y: 0, width: 100, height: 50 },
        freqMin: 20, freqMax: 20000, gainMin: -24, gainMax: 12,
      });
      for (const f of [20, 100, 1000, 20000]) {
        expect(m.xToFreq(m.freqToX(f))).toBeCloseTo(f, 8);
      }
      for (const g of [-24, -12, 0, 12]) {
        expect(m.yToGain(m.gainToY(g))).toBeCloseTo(g, 8);
      }
    });
  });

  describe('zero-size viewport handling', () => {
    it('should not crash with width=0', () => {
      const m = new CoordinateMapper({
        viewport: { x: 0, y: 0, width: 0, height: 200 },
        freqMin: 20, freqMax: 20000, gainMin: -24, gainMax: 12,
      });
      expect(() => { m.freqToX(1000); }).not.toThrow();
      expect(() => { m.xToFreq(0); }).not.toThrow();
    });

    it('should not crash with height=0', () => {
      const m = new CoordinateMapper({
        viewport: { x: 0, y: 0, width: 400, height: 0 },
        freqMin: 20, freqMax: 20000, gainMin: -24, gainMax: 12,
      });
      expect(() => { m.gainToY(0); }).not.toThrow();
      expect(() => { m.yToGain(0); }).not.toThrow();
    });
  });
});
