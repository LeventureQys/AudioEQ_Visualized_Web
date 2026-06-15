import { describe, it, expect } from 'vitest';
import { FilterType, SampleRate, ErrorCode, createBand, Defaults } from '../../src/core/types.js';

describe('FilterType', () => {
  it('should have all filter types frozen', () => {
    expect(Object.isFrozen(FilterType)).toBe(true);
    expect(FilterType.PEAK).toBe('peak');
    expect(FilterType.LOW_SHELF).toBe('lowShelf');
    expect(FilterType.HIGH_SHELF).toBe('highShelf');
    expect(FilterType.LOW_PASS).toBe('lowPass');
    expect(FilterType.HIGH_PASS).toBe('highPass');
    expect(FilterType.BAND_PASS).toBe('bandPass');
  });
});

describe('SampleRate', () => {
  it('should have all sample rates frozen', () => {
    expect(Object.isFrozen(SampleRate)).toBe(true);
    expect(SampleRate.SR_44100).toBe(44100);
    expect(SampleRate.SR_48000).toBe(48000);
    expect(SampleRate.SR_96000).toBe(96000);
    expect(SampleRate.SR_192000).toBe(192000);
  });
});

describe('ErrorCode', () => {
  it('should have all error codes frozen', () => {
    expect(Object.isFrozen(ErrorCode)).toBe(true);
    expect(ErrorCode.INDEX_OUT_OF_RANGE).toBe('IndexOutOfRange');
    expect(ErrorCode.INDEX_CONFLICT).toBe('IndexConflict');
    expect(ErrorCode.INVALID_PARAMETER).toBe('InvalidParameter');
    expect(ErrorCode.NOT_INITIALIZED).toBe('NotInitialized');
  });
});

describe('createBand', () => {
  it('should return default band when called with no arguments', () => {
    const band = createBand();
    expect(band).toEqual({
      index: -1,
      frequency: 1000,
      gain: 0,
      q: 1.0,
      type: 'peak',
      bypass: false,
    });
  });

  it('should override only provided fields', () => {
    const band = createBand({ frequency: 2000, gain: 3 });
    expect(band.frequency).toBe(2000);
    expect(band.gain).toBe(3);
    expect(band.q).toBe(1.0);
    expect(band.type).toBe('peak');
    expect(band.bypass).toBe(false);
  });

  it('should accept all parameters', () => {
    const band = createBand({
      frequency: 500,
      gain: -6,
      q: 2.5,
      type: 'lowShelf',
      bypass: true,
    });
    expect(band).toEqual({
      index: -1,
      frequency: 500,
      gain: -6,
      q: 2.5,
      type: 'lowShelf',
      bypass: true,
    });
  });
});

describe('Defaults', () => {
  it('should be frozen', () => {
    expect(Object.isFrozen(Defaults)).toBe(true);
  });

  it('should have correct default values', () => {
    expect(Defaults.BAND_COUNT).toBe(5);
    expect(Defaults.SAMPLE_RATE).toBe(48000);
    expect(Defaults.GAIN_MIN).toBe(-24);
    expect(Defaults.GAIN_MAX).toBe(12);
    expect(Defaults.FREQ_MIN).toBe(20);
    expect(Defaults.FREQ_MAX).toBe(20000);
    expect(Defaults.POINT_COUNT).toBe(500);
    expect(Defaults.LPF_FREQ_DEFAULT).toBe(20000);
    expect(Defaults.HPF_FREQ_DEFAULT).toBe(20);
  });
});
