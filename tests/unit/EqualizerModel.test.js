import { describe, it, expect, beforeEach } from 'vitest';
import { EqualizerModel } from '../../src/core/EqualizerModel.js';
import { Defaults } from '../../src/core/types.js';

describe('EqualizerModel', () => {
  let model;

  beforeEach(() => {
    model = new EqualizerModel();
  });

  describe('constructor', () => {
    it('should create 5 default bands', () => {
      expect(model.bandCount()).toBe(5);
    });

    it('should have default sample rate 48000', () => {
      expect(model.sampleRate()).toBe(48000);
    });

    it('should have LPF default frequency 20000 and disabled', () => {
      const lpf = model.getLpf();
      expect(lpf.frequency).toBe(20000);
      expect(lpf.enabled).toBe(false);
    });

    it('should have HPF default frequency 20 and disabled', () => {
      const hpf = model.getHpf();
      expect(hpf.frequency).toBe(20);
      expect(hpf.enabled).toBe(false);
    });
  });

  describe('bandAt', () => {
    it('should return a deep clone', () => {
      const band = model.bandAt(0);
      band.frequency = 9999;
      expect(model.bandAt(0).frequency).not.toBe(9999);
    });
  });

  describe('addBand/removeBand', () => {
    it('should reuse index after removal', () => {
      model.removeBand(2);
      const idx = model.addBand({ frequency: 500 });
      expect(idx).toBe(2);
    });

    it('should emit band-added event', () => {
      return new Promise((resolve) => {
        model.addEventListener('band-added', (e) => {
          expect(e.detail.index).toBe(5);
          resolve();
        });
        model.addBand({ frequency: 1000 });
      });
    });

    it('should emit band-removed event', () => {
      return new Promise((resolve) => {
        model.addEventListener('band-removed', (e) => {
          expect(e.detail.index).toBe(0);
          resolve();
        });
        model.removeBand(0);
      });
    });
  });

  describe('setBandParams', () => {
    it('should emit band-changed when value changes', () => {
      return new Promise((resolve) => {
        model.addEventListener('band-changed', (e) => {
          expect(e.detail.index).toBe(0);
          expect(e.detail.band.gain).toBe(-6);
          resolve();
        });
        model.setBandParams(0, { gain: -6 });
      });
    });

    it('should NOT emit band-changed when value is same', () => {
      let count = 0;
      model.addEventListener('band-changed', () => { count++; });
      model.setBandParams(0, { gain: 0 });
      expect(count).toBe(0);
    });
  });

  describe('setQRange', () => {
    it('should clamp existing band Q and emit event', () => {
      return new Promise((resolve) => {
        model.setBandParams(0, { q: 5.0 });
        model.addEventListener('band-changed', (e) => {
          expect(e.detail.band.q).toBe(2.0);
          resolve();
        });
        model.setQRange('peak', 0.4, 2.0);
      });
    });
  });

  describe('focus', () => {
    it('should start with no focus', () => {
      expect(model.focusedBandIndex()).toBe(-1);
    });

    it('should emit focused-band-changed', () => {
      return new Promise((resolve) => {
        model.addEventListener('focused-band-changed', (e) => {
          expect(e.detail.index).toBe(2);
          resolve();
        });
        model.setFocusedBandIndex(2);
      });
    });

    it('should clear focus with -1', () => {
      model.setFocusedBandIndex(2);
      model.setFocusedBandIndex(-1);
      expect(model.focusedBandIndex()).toBe(-1);
    });
  });

  describe('LPF/HPF', () => {
    it('should emit lpf-changed', () => {
      return new Promise((resolve) => {
        model.addEventListener('lpf-changed', (e) => {
          expect(e.detail.enabled).toBe(true);
          resolve();
        });
        model.setLpfEnabled(true);
      });
    });

    it('should NOT emit lpf-changed if value unchanged', () => {
      let count = 0;
      model.addEventListener('lpf-changed', () => { count++; });
      model.setLpfEnabled(false);
      expect(count).toBe(0);
    });

    it('should auto-enable LPF when frequency moves away from edge', () => {
      model.setLpfFrequency(10000);
      expect(model.getLpf().enabled).toBe(true);
    });

    it('should auto-disable LPF when frequency reaches max edge', () => {
      model.setLpfFrequency(Defaults.FREQ_MAX);
      expect(model.getLpf().enabled).toBe(false);
    });

    it('should auto-enable HPF when frequency moves away from edge', () => {
      model.setHpfFrequency(1000);
      expect(model.getHpf().enabled).toBe(true);
    });

    it('should auto-disable HPF when frequency reaches min edge', () => {
      model.setHpfFrequency(Defaults.FREQ_MIN);
      expect(model.getHpf().enabled).toBe(false);
    });

    it('should emit hpf-changed on setHpfFrequency', () => {
      return new Promise((resolve) => {
        model.addEventListener('hpf-changed', (e) => {
          expect(e.detail.frequency).toBe(50);
          resolve();
        });
        model.setHpfFrequency(50);
      });
    });
  });

  describe('sampleRate', () => {
    it('should emit sample-rate-changed', () => {
      return new Promise((resolve) => {
        model.addEventListener('sample-rate-changed', (e) => {
          expect(e.detail.rate).toBe(96000);
          resolve();
        });
        model.setSampleRate(96000);
      });
    });

    it('should return correct nyquist', () => {
      model.setSampleRate(48000);
      expect(model.nyquistFrequency()).toBe(24000);
    });
  });

  describe('allBands', () => {
    it('should return frozen array of cloned bands', () => {
      const bands = model.allBands();
      expect(Object.isFrozen(bands)).toBe(true);
      expect(bands.length).toBe(5);
    });
  });

  describe('setBandCount(0)', () => {
    it('should clear all bands', () => {
      model.setBandCount(0);
      expect(model.bandCount()).toBe(0);
      expect(model.allBands()).toHaveLength(0);
    });
  });

  describe('setBandCount(3)', () => {
    it('should create 3 log-spaced bands', () => {
      model.setBandCount(3);
      expect(model.bandCount()).toBe(3);
      const bands = model.allBands();
      expect(bands[0].frequency).toBeLessThan(bands[1].frequency);
      expect(bands[1].frequency).toBeLessThan(bands[2].frequency);
    });
  });

  describe('removeBand on non-existent index', () => {
    it('should not throw', () => {
      expect(() => model.removeBand(99)).not.toThrow();
    });
  });

  describe('setFocusedBandIndex with invalid index', () => {
    it('should be ignored', () => {
      model.setFocusedBandIndex(99);
      expect(model.focusedBandIndex()).toBe(-1);
    });
  });

  describe('moveBandZOrder', () => {
    it('should swap band indices', () => {
      const orig0 = model.bandAt(0);
      const orig1 = model.bandAt(1);
      model.moveBandZOrder(0, 1);
      expect(model.bandAt(0).index).toBe(0);
      expect(model.bandAt(1).index).toBe(1);
      expect(model.bandAt(1).frequency).toBe(orig0.frequency);
      expect(model.bandAt(0).frequency).toBe(orig1.frequency);
    });
  });

  describe('setSampleRate to same value', () => {
    it('should not emit event', () => {
      let count = 0;
      model.addEventListener('sample-rate-changed', () => { count++; });
      model.setSampleRate(48000);
      expect(count).toBe(0);
    });
  });

  describe('setLpf with both frequency and enabled at once', () => {
    it('should update both and emit lpf-changed', () => {
      return new Promise((resolve) => {
        model.addEventListener('lpf-changed', (e) => {
          expect(e.detail.frequency).toBe(5000);
          expect(e.detail.enabled).toBe(true);
          resolve();
        });
        model.setLpf({ frequency: 5000, enabled: true });
      });
    });
  });

  describe('setHpf with both frequency and enabled at once', () => {
    it('should update both and emit hpf-changed', () => {
      return new Promise((resolve) => {
        model.addEventListener('hpf-changed', (e) => {
          expect(e.detail.frequency).toBe(100);
          expect(e.detail.enabled).toBe(true);
          resolve();
        });
        model.setHpf({ frequency: 100, enabled: true });
      });
    });
  });

  describe('reuse indices after removals', () => {
    it('multiple addBand calls return sequential indices after removals', () => {
      model.removeBand(0);
      model.removeBand(1);
      expect(model.addBand({ frequency: 500 })).toBe(0);
      expect(model.addBand({ frequency: 1000 })).toBe(1);
    });
  });

  describe('qRange for unsupported type', () => {
    it('should return default range', () => {
      const range = model.qRange('unknownType');
      expect(range).toEqual({ min: 0.4, max: 128.0 });
    });
  });
});
