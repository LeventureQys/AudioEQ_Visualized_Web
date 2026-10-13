const TYPES = [
  ['peak', '峰值'],
  ['lowShelf', '低搁架'],
  ['highShelf', '高搁架'],
  ['lowPass', '低通'],
  ['highPass', '高通'],
];

export function bindBands(eq, root) {
  const list = root.getElementById('bandsList');
  function render() {
    list.innerHTML =
      '<div class="band-row"><span>编号</span><span>频率 / Hz</span><span>增益 / dB</span><span>Q 值</span><span>滤波类型</span><span>旁路</span><span></span></div>';
    for (const band of eq.allBands()) {
      const row = document.createElement('div');
      row.className = `band-row${band.index === eq.focusedBandIndex ? ' is-focused' : ''}`;
      row.dataset.index = String(band.index);
      row.innerHTML = `<span class="band-index">${String(band.index + 1).padStart(2, '0')}</span>
        <input type="number" aria-label="频段 ${band.index + 1} 频率" data-field="frequency" min="20" max="20000" value="${band.frequency.toFixed(0)}">
        <input type="number" aria-label="频段 ${band.index + 1} 增益" data-field="gain" step="0.1" value="${band.gain.toFixed(1)}">
        <input type="number" aria-label="频段 ${band.index + 1} Q值" data-field="q" min="0.4" step="0.1" value="${band.q.toFixed(2)}">
        <select aria-label="频段 ${band.index + 1} 类型" data-field="type">${TYPES.map(([value, label]) => `<option value="${value}" ${value === band.type ? 'selected' : ''}>${label}</option>`).join('')}</select>
        <input type="checkbox" aria-label="频段 ${band.index + 1} 旁路" data-field="bypass" ${band.bypass ? 'checked' : ''}>
        <button type="button" class="remove-band" aria-label="删除频段 ${band.index + 1}">×</button>`;
      list.appendChild(row);
    }
    root.getElementById('bandCountBadge').textContent = String(eq.bandCount).padStart(2, '0');
  }
  function update(event) {
    const band = event.detail.band;
    const row = list.querySelector(`[data-index="${band.index}"]`);
    if (!row) return;
    for (const input of row.querySelectorAll('[data-field]')) {
      if (document.activeElement === input) continue;
      const value = band[input.dataset.field];
      if (input.type === 'checkbox') input.checked = value;
      else input.value = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value;
    }
  }
  list.addEventListener('change', (event) => {
    const input = event.target;
    const row = input.closest('[data-index]');
    if (!row || !input.dataset.field) return;
    const value =
      input.type === 'checkbox'
        ? input.checked
        : input.tagName === 'SELECT'
          ? input.value
          : Number(input.value);
    try {
      eq.setBandParams(Number(row.dataset.index), { [input.dataset.field]: value });
      input.setCustomValidity('');
    } catch (error) {
      input.setCustomValidity(error.message);
      input.reportValidity();
    }
  });
  list.addEventListener('click', (event) => {
    const row = event.target.closest('[data-index]');
    if (!row) return;
    const index = Number(row.dataset.index);
    if (event.target.closest('.remove-band')) eq.removeBand(index);
    else eq.focusedBandIndex = index;
  });
  eq.addEventListener('band-changed', update);
  for (const name of ['band-added', 'band-removed', 'model-reset', 'band-count-changed'])
    eq.addEventListener(name, render);
  eq.addEventListener('focused-band-changed', () => {
    for (const row of list.querySelectorAll('[data-index]'))
      row.classList.toggle('is-focused', Number(row.dataset.index) === eq.focusedBandIndex);
  });
  root.getElementById('addBandBtn').addEventListener('click', () => {
    const index = eq.addBand({ frequency: 1000, gain: 0, q: 1 });
    eq.focusedBandIndex = index;
  });
  render();
}
