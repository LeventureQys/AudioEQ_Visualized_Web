export function bindControls(eq, root) {
  const fieldIds = { frequency: 'focusFreq', gain: 'focusGain', q: 'focusQ', type: 'focusType' };
  function updateFocus() {
    const band = eq.bandAt(eq.focusedBandIndex);
    root.getElementById('focusedInfo').textContent = band
      ? `频段 ${String(band.index + 1).padStart(2, '0')} · 精细调节`
      : '点击曲线上的节点以选择频段';
    for (const [field, id] of Object.entries(fieldIds)) {
      const input = root.getElementById(id);
      input.disabled = !band;
      if (band && document.activeElement !== input)
        input.value =
          typeof band[field] === 'number'
            ? String(Math.round(band[field] * 100) / 100)
            : band[field];
      if (!band) input.value = field === 'type' ? 'peak' : '';
    }
  }
  function updateGlobal() {
    root.getElementById('sampleRate').value = String(eq.sampleRate);
    root.getElementById('bandCount').value = String(eq.bandCount);
  }
  function updateFilter(kind) {
    const filter = eq[kind];
    root.getElementById(`${kind}Enabled`).checked = filter.enabled;
    root.getElementById(`${kind}Freq`).value = String(filter.frequency);
    root.getElementById(`${kind}FreqLabel`).textContent = String(Math.round(filter.frequency));
  }
  for (const [field, id] of Object.entries(fieldIds)) {
    const input = root.getElementById(id);
    input.addEventListener('change', () => {
      if (eq.focusedBandIndex < 0) return;
      try {
        eq.setBandParams(eq.focusedBandIndex, {
          [field]: field === 'type' ? input.value : Number(input.value),
        });
        input.setCustomValidity('');
      } catch (error) {
        input.setCustomValidity(error.message);
        input.reportValidity();
      }
    });
  }
  root.getElementById('sampleRate').addEventListener('change', (event) => {
    eq.sampleRate = Number(event.target.value);
  });
  root.getElementById('bandCount').addEventListener('change', (event) => {
    try {
      eq.bandCount = Number(event.target.value);
      event.target.setCustomValidity('');
    } catch (error) {
      event.target.setCustomValidity(error.message);
      event.target.reportValidity();
    }
  });
  root.getElementById('resetBtn').addEventListener('click', () => {
    eq.reset();
    updateGlobal();
    updateFocus();
  });
  for (const kind of ['lpf', 'hpf']) {
    root.getElementById(`${kind}Enabled`).addEventListener('change', (event) => {
      eq[kind] = { enabled: event.target.checked };
    });
    root.getElementById(`${kind}Freq`).addEventListener('input', (event) => {
      eq[kind] = { frequency: Number(event.target.value) };
    });
    eq.addEventListener(`${kind}-changed`, () => updateFilter(kind));
    updateFilter(kind);
  }
  eq.addEventListener('focused-band-changed', updateFocus);
  eq.addEventListener('band-changed', (event) => {
    if (event.detail.index === eq.focusedBandIndex) updateFocus();
  });
  for (const name of ['sample-rate-changed', 'band-count-changed', 'band-added', 'band-removed'])
    eq.addEventListener(name, updateGlobal);
  eq.addEventListener('model-reset', () => {
    updateFocus();
    updateGlobal();
  });
  updateFocus();
  updateGlobal();
}
