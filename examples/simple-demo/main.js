import { AudioEQElement } from '../../src/index.js';

const eq = document.getElementById('eq');
const bandsList = document.getElementById('bandsList');
const focusedInfo = document.getElementById('focusedInfo');

function renderBands() {
  const bands = eq.allBands();
  let html = '<div class="band-row"><span>#</span><span>Freq</span><span>Gain</span><span>Q</span><span>Type</span><span>Bypass</span><span></span></div>';
  for (const band of bands) {
    html += `
      <div class="band-row">
        <span>${band.index}</span>
        <input type="number" value="${band.frequency.toFixed(0)}"
               data-idx="${band.index}" data-field="frequency">
        <input type="number" value="${band.gain.toFixed(1)}"
               data-idx="${band.index}" data-field="gain" step="1">
        <input type="number" value="${band.q.toFixed(2)}"
               data-idx="${band.index}" data-field="q" step="0.1">
        <select data-idx="${band.index}" data-field="type">
          <option value="peak" ${band.type === 'peak' ? 'selected' : ''}>Peak</option>
          <option value="lowShelf" ${band.type === 'lowShelf' ? 'selected' : ''}>Low Shelf</option>
          <option value="highShelf" ${band.type === 'highShelf' ? 'selected' : ''}>High Shelf</option>
          <option value="lowPass" ${band.type === 'lowPass' ? 'selected' : ''}>Low Pass</option>
          <option value="highPass" ${band.type === 'highPass' ? 'selected' : ''}>High Pass</option>
        </select>
        <input type="checkbox" ${band.bypass ? 'checked' : ''}
               data-idx="${band.index}" data-field="bypass">
        <button data-idx="${band.index}" class="remove-band">✕</button>
      </div>
    `;
  }
  bandsList.innerHTML = html;

  bandsList.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(el.dataset.idx, 10);
      const field = el.dataset.field;
      let value;
      if (el.type === 'checkbox') {
        value = el.checked;
      } else if (el.tagName === 'SELECT') {
        value = el.value;
      } else if (field === 'bypass') {
        value = el.checked;
      } else {
        value = parseFloat(el.value);
      }
      try {
        eq.setBandParams(idx, { [field]: value });
      } catch (err) {
        console.error(err);
      }
    });
  });

  bandsList.querySelectorAll('.remove-band').forEach(btn => {
    btn.addEventListener('click', () => {
      eq.removeBand(parseInt(btn.dataset.idx, 10));
    });
  });
}

eq.addEventListener('focused-band-changed', (e) => {
  const idx = e.detail.index;
  if (idx < 0) {
    focusedInfo.textContent = 'No band focused';
    document.getElementById('focusFreq').disabled = true;
    document.getElementById('focusGain').disabled = true;
    document.getElementById('focusQ').disabled = true;
    document.getElementById('focusType').disabled = true;
    return;
  }
  const band = eq.bandAt(idx);
  if (!band) return;
  focusedInfo.textContent = `Band #${idx}`;
  document.getElementById('focusFreq').disabled = false;
  document.getElementById('focusFreq').value = band.frequency.toFixed(0);
  document.getElementById('focusGain').disabled = false;
  document.getElementById('focusGain').value = band.gain.toFixed(1);
  document.getElementById('focusQ').disabled = false;
  document.getElementById('focusQ').value = band.q.toFixed(2);
  document.getElementById('focusType').disabled = false;
  document.getElementById('focusType').value = band.type;
});

document.getElementById('focusFreq').addEventListener('change', (e) => {
  const idx = eq.focusedBandIndex;
  if (idx >= 0) eq.setBandParams(idx, { frequency: parseFloat(e.target.value) });
});
document.getElementById('focusGain').addEventListener('change', (e) => {
  const idx = eq.focusedBandIndex;
  if (idx >= 0) eq.setBandParams(idx, { gain: parseFloat(e.target.value) });
});
document.getElementById('focusQ').addEventListener('change', (e) => {
  const idx = eq.focusedBandIndex;
  if (idx >= 0) eq.setBandParams(idx, { q: parseFloat(e.target.value) });
});
document.getElementById('focusType').addEventListener('change', (e) => {
  const idx = eq.focusedBandIndex;
  if (idx >= 0) eq.setBandParams(idx, { type: e.target.value });
});

document.getElementById('sampleRate').addEventListener('change', (e) => {
  eq.setSampleRate(parseInt(e.target.value, 10));
});

document.getElementById('bandCount').addEventListener('change', (e) => {
  eq.setBandCount(parseInt(e.target.value, 10));
});

document.getElementById('resetBtn').addEventListener('click', () => {
  eq.setBandCount(5);
  eq.setSampleRate(48000);
  eq.setLpfEnabled(false);
  eq.setLpfFrequency(20000);
  eq.setHpfEnabled(false);
  eq.setHpfFrequency(20);
});

document.getElementById('lpfEnabled').addEventListener('change', (e) => {
  eq.setLpfEnabled(e.target.checked);
});
document.getElementById('lpfFreq').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  eq.setLpfFrequency(v);
  document.getElementById('lpfFreqLabel').textContent = v;
});

document.getElementById('hpfEnabled').addEventListener('change', (e) => {
  eq.setHpfEnabled(e.target.checked);
});
document.getElementById('hpfFreq').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  eq.setHpfFrequency(v);
  document.getElementById('hpfFreqLabel').textContent = v;
});

document.getElementById('addBandBtn').addEventListener('click', () => {
  eq.addBand({ frequency: 1000, gain: 0, q: 1.0, type: 'peak' });
});

const reRender = () => renderBands();
eq.addEventListener('band-changed', reRender);
eq.addEventListener('band-added', reRender);
eq.addEventListener('band-removed', reRender);
eq.addEventListener('band-count-changed', reRender);
eq.addEventListener('model-reset', reRender);

renderBands();
