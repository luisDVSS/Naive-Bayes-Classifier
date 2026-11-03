/* Validación de parámetros, métodos de validación y eventos de la interfaz */
function run() {
  errBox('perr', []); $('out').hidden = true;
  const errs = [];
  if (!DS) errs.push('Carga primero un dataset válido.');
  const mode = document.querySelector('input[name=mode]:checked').value;
  const val = document.querySelector('input[name=val]:checked').value;
  const cfg = { cont: $('cont').value, bins: +$('bins').value, alpha: +$('alpha').value, pct: +$('pct').value, seed: +$('seed').value };
  if (!isFinite(cfg.alpha) || cfg.alpha < 0 || $('alpha').value === '') errs.push('El parámetro α de Laplace debe ser un número mayor o igual a 0.');
  if (!Number.isInteger(cfg.seed)) errs.push('La semilla debe ser un número entero.');
  if (cfg.cont !== 'normal' && (!Number.isInteger(cfg.bins) || cfg.bins < 2 || cfg.bins > 50)) errs.push('El número de intervalos de discretización debe ser un entero entre 2 y 50.');
  if (mode === 'same' && val !== 'cross' && (!Number.isInteger(cfg.pct) || cfg.pct < 1 || cfg.pct > 99)) errs.push('El porcentaje de entrenamiento debe ser un entero entre 1 y 99.');
  if (DS) {
    DS.types.forEach((t, j) => {
      if (t === 'c') { const b = DS.body.findIndex(r => !isFinite(Number(r[j]))); if (b >= 0) errs.push(`El atributo "${DS.header[j]}" está marcado como continuo pero tiene un valor no numérico en la línea ${b + 2}.`) }
    });
  }
  const finish = () => { errBox('perr', errs) };
  if (errs.length) return finish();

  const na = DS.na, idx = [...Array(na + 1).keys()];
  const all = convert(DS.body, DS.types, na, true, idx);
  const domains = DS.types.map((t, j) => t === 'd' ? [...new Set(DS.body.map(r => r[j]))].sort() : null);
  const labels = [...new Set(all.map(d => d.y))].sort();
  const r = rng(cfg.seed); let html = '';

  if (mode === 'same') {
    if (val === 'cross') {
      const byC = {}; all.forEach(d => (byC[d.y] = byC[d.y] || []).push(d));
      const A = [], B = [];
      Object.values(byC).forEach(g => { const s = shuffle(g, r), h = Math.ceil(s.length / 2); A.push(...s.slice(0, h)); B.push(...s.slice(h)) });
      const T = [], P = []; let accs = [];
      [[A, B], [B, A]].forEach(([tr, te], f) => {
        const M = fit(tr, DS.types, cfg, domains);
        const p = te.map(d => predict(M, d.x).cls);
        T.push(...te.map(d => d.y)); P.push(...p);
        accs.push(te.filter((d, i) => p[i] === d.y).length / te.length);
      });
      html = `<div class="ok">Validación cruzada 50%-50%: 2 pliegues estratificados. Accuracy por pliegue: ${accs.map(a => (a * 100).toFixed(2) + '%').join(' y ')}. La matriz acumula las predicciones de ambos pliegues.</div>` + renderMetrics(metrics(T, P, labels), 'Matriz de confusión');
    } else {
      let tr = [], te = [];
      if (val === 'strat') {
        const byC = {}; all.forEach(d => (byC[d.y] = byC[d.y] || []).push(d));
        Object.values(byC).forEach(g => { const s = shuffle(g, r), k = Math.max(1, Math.min(s.length - 1, Math.round(s.length * cfg.pct / 100))); tr.push(...s.slice(0, k)); te.push(...s.slice(k)) });
      } else {
        const s = shuffle(all, r), k = Math.max(1, Math.min(s.length - 1, Math.round(s.length * cfg.pct / 100)));
        tr = s.slice(0, k); te = s.slice(k);
      }
      const M = fit(tr, DS.types, cfg, domains);
      const p = te.map(d => predict(M, d.x).cls);
      html = `<div class="ok">${val === 'strat' ? 'Selección aleatoria estratificada' : 'Validación simple'}: ${tr.length} instancias de entrenamiento (${cfg.pct}%) y ${te.length} de prueba.</div>` + renderMetrics(metrics(te.map(d => d.y), p, labels), 'Matriz de confusión');
    }
    show(html);
  } else {
    const f = $('fext').files[0];
    if (!f) { errs.push('Selecciona el archivo de pruebas externo.'); return finish() }
    f.text().then(txt => {
      const raw = parseCSV(txt);
      if (raw.length < 2) { errs.push('El archivo externo necesita encabezado y al menos una instancia.'); return finish() }
      const h = raw[0], body = raw.slice(1), ix = [];
      DS.header.slice(0, na).forEach((n, j) => { const k = h.indexOf(n); if (k < 0) errs.push(`Falta la columna "${n}" en el archivo externo.`); ix.push(k) });
      const ci = h.indexOf(DS.header[na]);
      const bad = []; body.forEach((rw, i) => { if (rw.length !== h.length) bad.push(i + 2) });
      if (bad.length) errs.push(`Líneas con distinto número de columnas que el encabezado: ${lineList(bad)}.`);
      if (!errs.length) {
        const miss = []; body.forEach((rw, i) => { if (ix.some(k => isMissing(rw[k])) || (ci >= 0 && isMissing(rw[ci]))) miss.push(i + 2) });
        if (miss.length) errs.push(`Valores vacíos o faltantes en las líneas: ${lineList(miss)}.`);
        DS.types.forEach((t, j) => { if (t === 'c') { const b = body.findIndex(rw => !isFinite(Number(rw[ix[j]]))); if (b >= 0) errs.push(`"${DS.header[j]}" debe ser numérico; línea ${b + 2} no lo es.`) } });
      }
      if (errs.length) return finish();
      const hasC = ci >= 0;
      const test = convert(body, DS.types, na, hasC, hasC ? [...ix, ci] : ix);
      const M = fit(all, DS.types, cfg, domains);
      const preds = test.map(d => predict(M, d.x));
      let out = `<div class="ok">Modelo entrenado con el dataset completo (${all.length} instancias). Archivo externo: ${test.length} instancia(s).</div>`;
      if (hasC) {
        const lab = [...new Set([...labels, ...test.map(d => d.y)])].sort();
        out += renderMetrics(metrics(test.map(d => d.y), preds.map(p => p.cls), lab), 'Matriz de confusión');
      } else out += '<div class="ok">El archivo no trae columna de clase, así que solo se muestran predicciones.</div>';
      out += `<h3>Predicciones</h3><div class="scroll"><table><tr><th>#</th>${DS.header.slice(0, na).map(n => `<th>${esc(n)}</th>`).join('')}<th>Clase predicha</th><th>Confianza</th>${hasC ? '<th>Clase real</th>' : ''}</tr>`;
      test.slice(0, 300).forEach((d, i) => {
        const ok = hasC && d.y !== preds[i].cls;
        out += `<tr><td>${i + 1}</td>${d.x.map(v => `<td>${esc(v)}</td>`).join('')}<td><b>${esc(preds[i].cls)}</b></td><td>${(preds[i].conf * 100).toFixed(1)}%</td>${hasC ? `<td class="${ok ? 'tag-bad' : ''}">${esc(d.y)}</td>` : ''}</tr>`;
      });
      out += '</table></div>' + (test.length > 300 ? '<div class="hint">Se muestran las primeras 300 filas.</div>' : '');
      show(out);
    });
  }
}
function show(html) { $('res').innerHTML = html; $('out').hidden = false; $('out').scrollIntoView({ behavior: 'smooth', block: 'start' }) }

function syncUI() {
  const mode = document.querySelector('input[name=mode]:checked').value, val = document.querySelector('input[name=val]:checked').value;
  $('sameOpts').style.opacity = mode === 'same' ? 1 : .45;
  $('extOpts').hidden = mode !== 'ext';
  $('pct').disabled = mode !== 'same' || val === 'cross';
  $('binsL').hidden = $('cont').value === 'normal';
}
document.querySelectorAll('input[name=mode],input[name=val],#cont').forEach(e => e.addEventListener('change', syncUI));
$('fds').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => loadDataset(t, f.name)) };
$('go').onclick = run;
$('bej').onclick = () => {
  const r = rng(7), pick = a => a[Math.floor(r() * a.length)], rows = ['edad,ingreso_mensual,historial,vivienda,decision'];
  for (let i = 0; i < 180; i++) {
    const edad = Math.round(21 + r() * 44), ing = Math.round(6000 + r() * 34000), h = pick(['bueno', 'regular', 'malo']), v = pick(['propia', 'renta']);
    const s = ing / 10000 + (h === 'bueno' ? 1.6 : h === 'malo' ? -1.6 : 0) + (v === 'propia' ? .5 : 0) + (edad > 30 ? .3 : 0) + (r() - .5) * 1.8;
    rows.push([edad, ing, h, v, s > 2.9 ? 'aprobado' : s > 1.7 ? 'revision' : 'rechazado'].join(','));
  }
  loadDataset(rows.join('\n'), 'ejemplo_credito.csv');
};
syncUI();
$('fext').addEventListener('change', e => { $('extname').textContent = e.target.files[0] ? e.target.files[0].name : '' });
