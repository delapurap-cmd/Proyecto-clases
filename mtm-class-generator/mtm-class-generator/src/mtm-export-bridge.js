/*
  MTM export bridge
  -----------------
  Este archivo NO redibuja tus módulos. Solo intenta dejar el HTML en estado exportable.
  Lo ideal es que tu HTML implemente window.MTM_EXPORT.render(data) usando sus propias funciones internas.
*/
(function () {
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function log(type, payload) {
    try {
      if (typeof window.mtmLog === 'function') window.mtmLog(type, payload);
      console.log('[MTM_EXPORT]', type, payload || '');
    } catch (_) {}
  }

  async function renderPianoFrame(data) {
    const frame = document.querySelector('#pianoFrame');
    if (!frame || !frame.contentWindow) return { ok: false, reason: 'no pianoFrame' };
    const pwin = frame.contentWindow;

    // Limpieza básica si el piano la soporta.
    if (typeof pwin.allNotesOff === 'function') pwin.allNotesOff();
    if (typeof pwin.clearActiveNotes === 'function') pwin.clearActiveNotes();

    // Activa notas reales del acorde si el visualizer expone noteOn().
    if (Array.isArray(data.midi) && typeof pwin.noteOn === 'function') {
      data.midi.forEach(m => pwin.noteOn(m, 1));
    }

    if (typeof pwin.scheduleRender === 'function') pwin.scheduleRender();
    if (typeof pwin.renderAll === 'function') pwin.renderAll();
    if (typeof pwin.drawPiano === 'function') pwin.drawPiano();
    await sleep(250);
    return { ok: true };
  }

  async function defaultRender(data) {
    document.documentElement.dataset.mtmClass = data.symbol || data.id || '';
    document.body.dataset.mtmRoot = data.root || '';
    document.body.dataset.mtmQuality = data.quality || '';
    window.__MTM_CURRENT_CLASS__ = data;

    // Avisa a tu código interno. La forma más limpia es escuchar este evento en tu HTML.
    window.dispatchEvent(new CustomEvent('mtm:render-class', { detail: data }));

    // Intento útil para el piano/pentagrama, porque el HTML expone pianoFrame y suele exponer noteOn/renderAll.
    await renderPianoFrame(data);

    log('render-class', data);
    await sleep(400);
    return { ok: true, mode: 'default-bridge' };
  }

  const existing = window.MTM_EXPORT || {};
  window.MTM_EXPORT = {
    ...existing,
    render: existing.render || defaultRender,
    renderPianoFrame
  };
})();
