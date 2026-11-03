/* Métricas de evaluación y su presentación */
function metrics(truth, pred, labels) {
  const L = labels.length, ix = Object.fromEntries(labels.map((l, i) => [l, i]));
  const conf = labels.map(() => labels.map(() => 0));
  truth.forEach((t, i) => conf[ix[t]][ix[pred[i]]]++);
  const total = truth.length; let ok = 0;
  const per = labels.map((l, i) => {
    const tp = conf[i][i]; ok += tp;
    const row = conf[i].reduce((a, b) => a + b, 0), col = conf.reduce((s, r) => s + r[i], 0);
    const fp = col - tp, fn = row - tp, tn = total - tp - fp - fn;
    const p = tp + fp ? tp / (tp + fp) : 0, r = tp + fn ? tp / (tp + fn) : 0;
    return { l, p, r, f: p + r ? 2 * p * r / (p + r) : 0, s: tn + fp ? tn / (tn + fp) : 0, sup: row };
  });
  return { conf, per, acc: total ? ok / total : 0, total, labels };
}
const f3 = x => x.toFixed(3);
function renderMetrics(M, title) {
  const sup = M.per.reduce((s, x) => s + x.sup, 0);
  const act = M.per.filter(x => x.sup > 0), n = act.length || 1;
  const mac = k => act.reduce((s, x) => s + x[k], 0) / n;
  const wei = k => sup ? M.per.reduce((s, x) => s + x[k] * x.sup, 0) / sup : 0;
  let h = `<h3>${esc(title)}</h3><div class="hint">Filas: clase real. Columnas: clase predicha.</div><div class="scroll"><table><tr><th>Real \\ Predicha</th>${M.labels.map(l => `<th>${esc(l)}</th>`).join('')}<th>Total</th></tr>`;
  M.conf.forEach((r, i) => { h += `<tr><td><b>${esc(M.labels[i])}</b></td>${r.map((v, j) => `<td class="${i === j ? 'diag' : ''}">${v}</td>`).join('')}<td>${r.reduce((a, b) => a + b, 0)}</td></tr>` });
  h += `</table></div><h3>Métricas por clase</h3><div class="scroll"><table><tr><th>Clase</th><th>Precisión</th><th>Exhaustividad (recall)</th><th>Especificidad</th><th>Medida F1</th><th>Soporte</th></tr>`;
  M.per.forEach(x => { h += `<tr><td>${esc(x.l)}</td><td>${f3(x.p)}</td><td>${f3(x.r)}</td><td>${f3(x.s)}</td><td>${f3(x.f)}</td><td>${x.sup}</td></tr>` });
  h += `<tr class="sum"><td>Promedio macro</td><td>${f3(mac('p'))}</td><td>${f3(mac('r'))}</td><td>${f3(mac('s'))}</td><td>${f3(mac('f'))}</td><td>${sup}</td></tr>`;
  h += `<tr class="sum"><td>Promedio ponderado</td><td>${f3(wei('p'))}</td><td>${f3(wei('r'))}</td><td>${f3(wei('s'))}</td><td>${f3(wei('f'))}</td><td>${sup}</td></tr></table></div>`;
  h += `<h3>Accuracy</h3><div class="acc">${(M.acc * 100).toFixed(2)}%</div><div class="hint">${Math.round(M.acc * M.total)} aciertos de ${M.total} instancias de prueba.</div>`;
  return h;
}

