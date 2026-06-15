import { AudioEQElement } from '../../src/index.js';

const eq = document.getElementById('eq');
const bandsList = document.getElementById('bandsList');
const focusedInfo = document.getElementById('focusedInfo');

// ========== Band list rendering ==========

function fullRenderBands() {
  const bands = eq.allBands();
  let html = '<div class="band-row"><span>#</span><span>Freq</span><span>Gain</span><span>Q</span><span>Type</span><span>Bypass</span><span></span></div>';
  for (const band of bands) {
    html += bandRowHtml(band);
  }
  bandsList.innerHTML = html;
  bindBandListEvents();
}

function bandRowHtml(band) {
  return `
    <div class="band-row" data-band-idx="${band.index}">
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

function updateBandRow(band) {
  const row = bandsList.querySelector(`[data-band-idx="${band.index}"]`);
  if (!row) return;
  const freqInput = row.querySelector('[data-field="frequency"]');
  const gainInput = row.querySelector('[data-field="gain"]');
  const qInput = row.querySelector('[data-field="q"]');
  const typeSelect = row.querySelector('[data-field="type"]');
  const bypassCb = row.querySelector('[data-field="bypass"]');
  if (freqInput) freqInput.value = band.frequency.toFixed(0);
  if (gainInput) gainInput.value = band.gain.toFixed(1);
  if (qInput) qInput.value = band.q.toFixed(2);
  if (typeSelect) typeSelect.value = band.type;
  if (bypassCb) bypassCb.checked = band.bypass;
}

function bindBandListEvents() {
  bandsList.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', () => {
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

// ========== Focused band panel ==========

function updateFocusedPanel() {
  const idx = eq.focusedBandIndex;
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
}

// ========== LPF / HPF UI sync ==========

function updateLpfUI() {
  const lpf = eq.lpf;
  document.getElementById('lpfEnabled').checked = lpf.enabled;
  document.getElementById('lpfFreq').value = lpf.frequency;
  document.getElementById('lpfFreqLabel').textContent = lpf.frequency;
}

function updateHpfUI() {
  const hpf = eq.hpf;
  document.getElementById('hpfEnabled').checked = hpf.enabled;
  document.getElementById('hpfFreq').value = hpf.frequency;
  document.getElementById('hpfFreqLabel').textContent = hpf.frequency;
}

// ========== Event wiring ==========

// Band list: full render on structural changes
eq.addEventListener('band-added', fullRenderBands);
eq.addEventListener('band-removed', fullRenderBands);
eq.addEventListener('band-count-changed', fullRenderBands);
eq.addEventListener('model-reset', fullRenderBands);

// Band list: incremental update on individual band changes (avoids full DOM rebuild)
eq.addEventListener('band-changed', (e) => {
  const band = eq.bandAt(e.detail.index);
  if (band) updateBandRow(band);
});

// Focused panel: update on focus change
eq.addEventListener('focused-band-changed', updateFocusedPanel);

// Focused panel: real-time during drag
eq.addEventListener('band-dragged', (e) => {
  const idx = e.detail.index;
  if (idx >= 0) {
    focusedInfo.textContent = `Band #${idx}`;
    document.getElementById('focusFreq').disabled = false;
    document.getElementById('focusFreq').value = e.detail.frequency.toFixed(0);
    document.getElementById('focusGain').disabled = false;
    document.getElementById('focusGain').value = e.detail.gain.toFixed(1);
  }
});

// Focused panel: also update when focused band params change via form
eq.addEventListener('band-changed', (e) => {
  if (e.detail.index === eq.focusedBandIndex) updateFocusedPanel();
});

// LPF/HPF UI: real-time sync when dragging handles
eq.addEventListener('lpf-changed', updateLpfUI);
eq.addEventListener('hpf-changed', updateHpfUI);

// ========== Controls ==========

document.getElementById('sampleRate').addEventListener('change', (e) => {
  eq.sampleRate = parseInt(e.target.value, 10);
});

document.getElementById('bandCount').addEventListener('change', (e) => {
  eq.bandCount = parseInt(e.target.value, 10);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  eq.bandCount = 5;
  eq.sampleRate = 48000;
  eq.lpf = { frequency: 20000, enabled: false };
  eq.hpf = { frequency: 20, enabled: false };
  updateLpfUI();
  updateHpfUI();
  fullRenderBands();
  updateFocusedPanel();
});

document.getElementById('lpfEnabled').addEventListener('change', (e) => {
  eq.lpf = { frequency: eq.lpf.frequency, enabled: e.target.checked };
});
document.getElementById('lpfFreq').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  eq.lpf = { frequency: v, enabled: eq.lpf.enabled };
  document.getElementById('lpfFreqLabel').textContent = v;
});

document.getElementById('hpfEnabled').addEventListener('change', (e) => {
  eq.hpf = { frequency: eq.hpf.frequency, enabled: e.target.checked };
});
document.getElementById('hpfFreq').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  eq.hpf = { frequency: v, enabled: eq.hpf.enabled };
  document.getElementById('hpfFreqLabel').textContent = v;
});

document.getElementById('addBandBtn').addEventListener('click', () => {
  eq.addBand({ frequency: 1000, gain: 0, q: 1.0, type: 'peak' });
});

// Focus panel inputs
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

// ========== Initial render ==========
fullRenderBands();
updateFocusedPanel();
updateLpfUI();
updateHpfUI();
