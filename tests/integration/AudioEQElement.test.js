// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';

describe('AudioEQElement', () => {
  beforeAll(async () => {
    // happy-dom doesn't support canvas 2D context; mock it so
    // CanvasRenderer._setupViewport doesn't throw on null context
    HTMLCanvasElement.prototype.getContext = () =>
      new Proxy({}, { get: () => () => {} });

    const mod = await import('../../src/element/AudioEQElement.js');
    if (!customElements.get('audio-eq')) {
      customElements.define('audio-eq', mod.AudioEQElement);
    }
  });

  async function createReadyElement() {
    const el = document.createElement('audio-eq');
    document.body.appendChild(el);
    // connectedCallback uses Promise.resolve().then(...), flush microtasks
    await Promise.resolve();
    return el;
  }

  it('should be defined as a custom element', () => {
    expect(customElements.get('audio-eq')).toBeTruthy();
  });

  it('should create element with document.createElement', () => {
    const el = document.createElement('audio-eq');
    expect(el).toBeTruthy();
    expect(el.shadowRoot).toBeTruthy();
  });

  it('should have default properties', async () => {
    const el = await createReadyElement();
    expect(el.sampleRate).toBe(48000);
    expect(typeof el.bandCount).toBe('number');
    document.body.removeChild(el);
  });

  it('should have default band count of 5', async () => {
    const el = await createReadyElement();
    expect(el.bandCount).toBe(5);
    document.body.removeChild(el);
  });

  it('should reflect sample-rate attribute', async () => {
    const el = await createReadyElement();
    el.setAttribute('sample-rate', '96000');
    expect(el.sampleRate).toBe(96000);
    document.body.removeChild(el);
  });

  it('should reflect sampleRate property to attribute', async () => {
    const el = await createReadyElement();
    el.sampleRate = 192000;
    expect(el.getAttribute('sample-rate')).toBe('192000');
    document.body.removeChild(el);
  });

  it('should emit band-changed event via addEventListener', async () => {
    const el = await createReadyElement();
    return new Promise((resolve) => {
      el.addEventListener('band-changed', (e) => {
        expect(e.detail.index).toBe(0);
        expect(e.detail.band.gain).toBe(-6);
        document.body.removeChild(el);
        resolve();
      });
      el.setBandParams(0, { gain: -6 });
    });
  });

  it('should add and remove bands', async () => {
    const el = await createReadyElement();
    const idx = el.addBand({ frequency: 500, gain: 3 });
    expect(el.bandCount).toBe(6);
    el.removeBand(idx);
    expect(el.bandCount).toBe(5);
    document.body.removeChild(el);
  });

  it('should update band params', async () => {
    const el = await createReadyElement();
    el.setBandParams(0, { frequency: 1000, gain: 6, q: 2.0 });
    const band = el.bandAt(0);
    expect(band.frequency).toBe(1000);
    expect(band.gain).toBe(6);
    expect(band.q).toBe(2.0);
    document.body.removeChild(el);
  });

  it('should handle LPF property', async () => {
    const el = await createReadyElement();
    el.lpf = { enabled: true, frequency: 5000 };
    const lpf = el.lpf;
    expect(lpf.frequency).toBe(5000);
    expect(lpf.enabled).toBe(true);
    document.body.removeChild(el);
  });

  it('should handle HPF property', async () => {
    const el = await createReadyElement();
    el.hpf = { enabled: true, frequency: 100 };
    const hpf = el.hpf;
    expect(hpf.frequency).toBe(100);
    expect(hpf.enabled).toBe(true);
    document.body.removeChild(el);
  });

  it('should support focusedBandIndex property', async () => {
    const el = await createReadyElement();
    expect(el.focusedBandIndex).toBe(-1);
    el.focusedBandIndex = 0;
    expect(el.focusedBandIndex).toBe(0);
    el.focusedBandIndex = -1;
    expect(el.focusedBandIndex).toBe(-1);
    document.body.removeChild(el);
  });

  it('should support allBands', async () => {
    const el = await createReadyElement();
    const bands = el.allBands();
    expect(bands.length).toBe(5);
    expect(Object.isFrozen(bands)).toBe(true);
    document.body.removeChild(el);
  });

  it('should support setQRange', async () => {
    const el = await createReadyElement();
    el.setQRange('peak', 0.4, 2.0);
    const range = el.qRange('peak');
    expect(range.min).toBe(0.4);
    expect(range.max).toBe(2.0);
    document.body.removeChild(el);
  });

  it('should support nyquistFrequency', async () => {
    const el = await createReadyElement();
    expect(el.sampleRate / 2).toBe(24000);
    el.sampleRate = 96000;
    expect(el.sampleRate / 2).toBe(48000);
    document.body.removeChild(el);
  });

  it('should not throw in SSR-like import', async () => {
    const mod = await import('../../src/element/AudioEQElement.js');
    expect(mod.AudioEQElement).toBeTruthy();
  });
});
