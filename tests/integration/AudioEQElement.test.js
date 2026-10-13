// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, vi } from 'vitest';

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

  it('reflects appearance and numeric attributes in both directions', async () => {
    const el = await createReadyElement();
    el.curveColor = '#ab9900';
    el.backgroundColor = '#101010';
    el.bandColor = '#efefef';
    el.setGainRange(-30, 18);
    el.setCurvePointCount(250);
    expect(el.getAttribute('curve-color')).toBe('#ab9900');
    expect(el.getAttribute('background-color')).toBe('#101010');
    expect(el.getAttribute('band-color')).toBe('#efefef');
    expect(el.getAttribute('gain-min')).toBe('-30');
    expect(el.gainMax).toBe(18);
    expect(el.pointCount).toBe(250);
    el.removeAttribute('gain-min');
    el.removeAttribute('curve-color');
    el.removeAttribute('point-count');
    expect(el.gainMin).toBe(-24);
    expect(el.curveColor).toBe('#F0A030');
    expect(el.pointCount).toBe(500);
    document.body.removeChild(el);
  });

  it('provides independent filters and resets edited bands', async () => {
    const el = await createReadyElement();
    el.setBandGain(0, 8);
    el.setLpfEnabled(true);
    el.setHpfFrequency(80);
    expect(el.isLpfEnabled()).toBe(true);
    expect(el.getHpf().frequency).toBe(80);
    expect(el.nyquistFrequency()).toBe(24000);
    el.reset();
    expect(el.bandAt(0).gain).toBe(0);
    expect(el.isLpfEnabled()).toBe(false);
    expect(el.getHpf().frequency).toBe(20);
    document.body.removeChild(el);
  });

  it('survives disconnect and reconnect before initialization', async () => {
    const el = document.createElement('audio-eq');
    document.body.appendChild(el);
    document.body.removeChild(el);
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.bandCount).toBe(5);
    expect(el._initialized).toBe(true);
    document.body.removeChild(el);
  });

  it('coalesces pointer moves and forwards band-dragged', async () => {
    const el = await createReadyElement();
    const canvas = el.shadowRoot.querySelector('canvas');
    const mapper = el._renderer._mapper;
    el._renderer.resize(600, 300);
    const band = el.bandAt(0);
    const x = mapper.freqToX(band.frequency);
    const y = mapper.gainToY(band.gain);
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const event = (type, clientX, clientY) => {
      const pointer = new Event(type, { bubbles: true });
      Object.assign(pointer, { pointerId: 1, clientX, clientY });
      canvas.dispatchEvent(pointer);
    };
    const dragged = vi.fn();
    el.addEventListener('band-dragged', dragged);
    event('pointerdown', x, y);
    event('pointermove', x + 10, y - 5);
    event('pointermove', x + 30, y - 15);
    expect(dragged).not.toHaveBeenCalled();
    event('pointerup', x + 30, y - 15);
    expect(dragged).toHaveBeenCalledTimes(1);
    expect(el.bandAt(0).gain).toBeGreaterThan(band.gain);
    document.body.removeChild(el);
  });

  it('should not throw in SSR-like import', async () => {
    const mod = await import('../../src/element/AudioEQElement.js');
    expect(mod.AudioEQElement).toBeTruthy();
  });
});
