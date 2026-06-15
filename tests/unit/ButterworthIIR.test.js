import { describe, it, expect } from 'vitest';
import {
  makePeakBiquad, makeLowShelfBiquad, makeHighShelfBiquad,
  makeLowPassBiquad, makeHighPassBiquad,
  evaluateBiquadGainDb, evaluateBandGainDb,
  qRangeFor, clampFreqBelowNyquist,
} from '../../src/core/filter/ButterworthIIR.js';

const SR = 48000;

describe('clampFreqBelowNyquist', () => {
  it('should clamp freq at Nyquist', () => {
    expect(clampFreqBelowNyquist(24000, 48000)).toBeLessThan(24000);
    expect(clampFreqBelowNyquist(24000, 48000)).toBeCloseTo(23976, 0);
  });
  it('should not modify freq below Nyquist', () => {
    expect(clampFreqBelowNyquist(1000, 48000)).toBe(1000);
  });
});

describe('makePeakBiquad', () => {
  it('should produce non-NaN coefficients', () => {
    const c = makePeakBiquad(1000, 1, 6, SR);
    expect(c.b0).not.toBeNaN();
    expect(c.b1).not.toBeNaN();
    expect(c.b2).not.toBeNaN();
    expect(c.a1).not.toBeNaN();
    expect(c.a2).not.toBeNaN();
  });
  it('should evaluate to approximately gainDb at center frequency', () => {
    const c = makePeakBiquad(1000, 1, 6, SR);
    const db = evaluateBiquadGainDb(c, 1000, SR);
    expect(db).toBeGreaterThan(5);
    expect(db).toBeLessThan(7);
  });
});

describe('makeLowPassBiquad', () => {
  it('should produce -3dB at cutoff with default Q', () => {
    const c = makeLowPassBiquad(1000, SR);
    const db = evaluateBiquadGainDb(c, 1000, SR);
    expect(db).toBeCloseTo(-3, 0.5);
  });
  it('should not produce NaN at Nyquist', () => {
    const c = makeLowPassBiquad(23900, SR);
    expect(c.b0).not.toBeNaN();
  });
});

describe('makeHighPassBiquad', () => {
  it('should produce -3dB at cutoff with default Q', () => {
    const c = makeHighPassBiquad(1000, SR);
    const db = evaluateBiquadGainDb(c, 1000, SR);
    expect(db).toBeCloseTo(-3, 0.5);
  });
  it('should not produce NaN at Nyquist', () => {
    const c = makeHighPassBiquad(23900, SR);
    expect(c.b0).not.toBeNaN();
  });
});

describe('makeLowShelfBiquad', () => {
  it('should produce non-NaN coefficients', () => {
    const c = makeLowShelfBiquad(500, 0.7, 6, SR);
    expect(c.b0).not.toBeNaN();
  });
});

describe('makeHighShelfBiquad', () => {
  it('should produce non-NaN coefficients', () => {
    const c = makeHighShelfBiquad(5000, 0.7, 6, SR);
    expect(c.b0).not.toBeNaN();
  });
});

describe('evaluateBandGainDb', () => {
  it('should return ~0 for bypassed band', () => {
    const band = { type: 'peak', frequency: 1000, gain: 6, q: 1, bypass: true };
    expect(evaluateBandGainDb(band, 1000, SR)).toBeCloseTo(0, 5);
  });
  it('should return ~gainDb for peak at center frequency', () => {
    const band = { type: 'peak', frequency: 1000, gain: 6, q: 1, bypass: false };
    const db = evaluateBandGainDb(band, 1000, SR);
    expect(db).toBeGreaterThan(5);
    expect(db).toBeLessThan(7);
  });
});

describe('qRangeFor', () => {
  it('should return correct ranges', () => {
    expect(qRangeFor('peak')).toEqual({ min: 0.4, max: 128.0 });
    expect(qRangeFor('lowShelf')).toEqual({ min: 0.4, max: 1.6 });
    expect(qRangeFor('highShelf')).toEqual({ min: 0.4, max: 1.6 });
  });
});

describe('makeLowShelfBiquad — gain at center frequency', () => {
  it('should evaluate to approximately gainDb/2 at center frequency', () => {
    const c = makeLowShelfBiquad(500, 0.7, 6, SR);
    const db = evaluateBiquadGainDb(c, 500, SR);
    expect(db).toBeCloseTo(3, 0.5);
  });
});

describe('makeHighShelfBiquad — gain at center frequency', () => {
  it('should evaluate to approximately gainDb at center frequency', () => {
    const c = makeHighShelfBiquad(5000, 0.7, 6, SR);
    const db = evaluateBiquadGainDb(c, 5000, SR);
    expect(db).toBeGreaterThan(3);
    expect(db).toBeLessThan(8);
  });
});

describe('makeHighShelfBiquad — Nyquist boundary', () => {
  it('should produce non-NaN coefficients at Nyquist', () => {
    const c = makeHighShelfBiquad(23900, 0.7, 6, SR);
    expect(c.b0).not.toBeNaN();
    expect(c.b1).not.toBeNaN();
    expect(c.b2).not.toBeNaN();
    expect(c.a1).not.toBeNaN();
    expect(c.a2).not.toBeNaN();
  });
});

describe('all make*Biquad functions produce normalized coefficients', () => {
  const calls = [
    ['makePeakBiquad', () => makePeakBiquad(1000, 1, 6, SR)],
    ['makeLowShelfBiquad', () => makeLowShelfBiquad(500, 0.7, 6, SR)],
    ['makeHighShelfBiquad', () => makeHighShelfBiquad(5000, 0.7, 6, SR)],
    ['makeLowPassBiquad', () => makeLowPassBiquad(1000, SR)],
    ['makeHighPassBiquad', () => makeHighPassBiquad(1000, SR)],
  ];
  for (const [name, fn] of calls) {
    it(`${name} should have finite non-zero a1, a2`, () => {
      const c = fn();
      expect(Number.isFinite(c.a1)).toBe(true);
      expect(Number.isFinite(c.a2)).toBe(true);
      expect(c.a1).not.toBe(0);
      expect(c.a2).not.toBe(0);
      expect(Number.isFinite(c.b0)).toBe(true);
      expect(Number.isFinite(c.b1)).toBe(true);
      expect(Number.isFinite(c.b2)).toBe(true);
    });
  }
});

describe('evaluateBandGainDb with shelf types', () => {
  it('should return gainDb for lowShelf at center frequency', () => {
    const band = { type: 'lowShelf', frequency: 500, gain: 6, q: 0.7, bypass: false };
    const db = evaluateBandGainDb(band, 500, SR);
    expect(db).toBeCloseTo(3, 0.5);
  });

  it('should return gainDb for highShelf at center frequency', () => {
    const band = { type: 'highShelf', frequency: 5000, gain: 6, q: 0.7, bypass: false };
    const db = evaluateBandGainDb(band, 5000, SR);
    expect(db).toBeGreaterThan(3);
    expect(db).toBeLessThan(8);
  });
});

describe('independent band evaluation', () => {
  it('multiple bands with different gains should evaluate independently', () => {
    const band1 = { type: 'peak', frequency: 1000, gain: 6, q: 1, bypass: false };
    const band2 = { type: 'peak', frequency: 1000, gain: -6, q: 1, bypass: false };
    const db1 = evaluateBandGainDb(band1, 1000, SR);
    const db2 = evaluateBandGainDb(band2, 1000, SR);
    expect(db1).toBeGreaterThan(5);
    expect(db2).toBeLessThan(-5);
    expect(db1 - db2).toBeGreaterThan(10);
  });
});
