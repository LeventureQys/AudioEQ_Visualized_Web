# AudioEQ

A zero-dependency Web Component for audio equalizer visualization — interactive EQ curve rendering with drag-and-drop band controls.

## Installation

```bash
npm install audio-eq
```

Or use directly from a CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/audio-eq/dist/audio-eq.umd.js"></script>
```

## Quick Start

### HTML

```html
<audio-eq id="eq" curve-color="#F0A030"></audio-eq>
<script type="module">
  import { AudioEQElement } from 'audio-eq';
  const eq = document.getElementById('eq');
  eq.setBandParams(0, { frequency: 1000, gain: 6, q: 1.0 });
</script>
```

### React

```jsx
import { useEffect, useRef } from 'react';
import 'audio-eq';

function Equalizer() {
  const ref = useRef(null);
  useEffect(() => {
    const eq = ref.current;
    eq.addBand({ frequency: 1000, gain: 3, q: 1.0 });
  }, []);
  return <audio-eq ref={ref} style={{ width: '100%', height: 400 }} />;
}
```

### Vue

```vue
<template>
  <audio-eq ref="eq" curve-color="#F0A030"
    style="width: 100%; height: 400px" />
</template>
<script setup>
import { ref, onMounted } from 'vue';
import 'audio-eq';
const eq = ref(null);
onMounted(() => eq.value?.addBand({ frequency: 1000, gain: 3 }));
</script>
```

### Node.js (headless)

```js
import { EqualizerModel, CurveEngine } from 'audio-eq';
const model = new EqualizerModel();
const engine = new CurveEngine();
const curve = engine.computeTotalCurve(model);
console.log(curve); // [{freq, gainDb}, ...]
```

## API

### `<audio-eq>` Element

| Attribute | Property | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `sample-rate` | `sampleRate` | number | 48000 | Audio sample rate (Hz) |
| `curve-color` | (theme) | string | `#F0A030` | Curve color |
| `background-color` | (theme) | string | `#262A33` | Background color |
| `band-color` | (theme) | string | `#262A33` | Band handle fill color |
| `gain-min` | (mapper) | number | -24 | Minimum gain display (dB) |
| `gain-max` | (mapper) | number | 12 | Maximum gain display (dB) |
| `point-count` | (pointCount) | number | 500 | Curve resolution (points) |

### CSS Variables

```css
--audio-eq-curve-color: #F0A030;
--audio-eq-bg-color: #262A33;
--audio-eq-grid-color: rgba(255,255,255,0.08);
--audio-eq-label-color: rgba(255,255,255,0.7);
```

### Methods

```js
// Band management
element.bandCount()                    // → number
element.setBandCount(n)                // reset to n default bands
element.addBand({ frequency, gain, q, type, bypass })  // → index
element.removeBand(index)
element.bandAt(index)                  // → { index, frequency, gain, q, type, bypass }
element.setBandParams(index, params)
element.allBands()                     // → frozen Band[]

// Focus
element.focusedBandIndex               // → number (-1 = none)
element.setFocusedBandIndex(index)
element.moveBandZOrder(from, to)

// Sample rate
element.sampleRate                     // → number
element.setSampleRate(rate)
element.nyquistFrequency()             // → sampleRate / 2

// LPF / HPF
element.setLpfFrequency(freq)
element.setLpfEnabled(bool)
element.isLpfEnabled()                 // → boolean
element.getLpf()                       // → { frequency, enabled }
element.setHpfFrequency(freq)
element.setHpfEnabled(bool)
element.isHpfEnabled()                 // → boolean
element.getHpf()                       // → { frequency, enabled }

// Q Range
element.setQRange(type, min, max)
element.qRange(type)                   // → { min, max }

// Visual
element.setTheme(partial)
element.renderNow()
```

### Events

```js
element.addEventListener('band-changed', (e) => {
  console.log(e.detail.index, e.detail.band);
});

element.addEventListener('band-dragged', (e) => {
  console.log('Dragging:', e.detail.index, e.detail.frequency, e.detail.gain);
});
```

Full event list: `band-changed`, `band-added`, `band-removed`, `band-count-changed`, `focused-band-changed`, `sample-rate-changed`, `lpf-changed`, `hpf-changed`, `model-reset`, `band-dragged`.

### AudioEQCore (Headless API)

```js
import { AudioEQCore } from 'audio-eq';
// or import individual modules:
import { EqualizerModel, CurveEngine, CoordinateMapper, ButterworthIIR, Types } from 'audio-eq';
```

## Browser Support

Chrome, Edge, Firefox (latest 2 versions), Safari 15+. Zero polyfills required.

## Development

```bash
npm install
npm run dev     # Start Vite dev server with demo
npm run build   # Build ESM + UMD bundles
npm run test    # Run unit tests
npm run lint    # ESLint
```

## License

MIT
