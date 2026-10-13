import '../../src/index.js';
import { bindBands } from './bands.js';
import { bindControls } from './controls.js';

await customElements.whenDefined('audio-eq');
await Promise.resolve();
const eq = document.getElementById('eq');
bindBands(eq, document);
bindControls(eq, document);
