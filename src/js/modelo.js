/* Modelo Naive Bayes: entrenamiento, discretización y predicción */
function fit(data, types, cfg, domains) {
  const N = data.length, classes = [...new Set(data.map(d => d.y))].sort();
  const na = types.length, model = { classes, N, attrs: [], prior: {}, cfg };
  classes.forEach(c => model.prior[c] = data.filter(d => d.y === c).length / N);
  for (let j = 0; j < na; j++) {
    const A = { t: types[j], per: {} };
    const vals = data.map(d => d.x[j]);
    if (types[j] === 'c' && cfg.cont === 'normal') {
      const gm = vals.reduce((s, v) => s + v, 0) / N;
      const gv = vals.reduce((s, v) => s + (v - gm) ** 2, 0) / N;
      const floor = Math.max(gv * 1e-6, 1e-9);
      classes.forEach(c => {
        const v = data.filter(d => d.y === c).map(d => d.x[j]), n = v.length, m = v.reduce((s, x) => s + x, 0) / n;
        const s2 = n > 1 ? v.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1) : 0;
        A.per[c] = { m, v: Math.max(s2, floor) };
      });
    } else {
      if (types[j] === 'c') {
        const k = cfg.bins, s = vals.slice().sort((a, b) => a - b), mn = s[0], mx = s[s.length - 1];
        let e = [];
        if (cfg.cont === 'width') { const w = (mx - mn) / k; for (let i = 1; i < k; i++)e.push(mn + w * i) }
        else for (let i = 1; i < k; i++)e.push(s[Math.floor(i * s.length / k)]);
        A.edges = [...new Set(e)].filter(x => x > mn && mx >= x || cfg.cont === 'width' && mx > mn);
        A.edges.sort((a, b) => a - b);
        A.K = A.edges.length + 1;
      } else A.K = domains[j].length;
      classes.forEach(c => {
        const cnt = {}, rows = data.filter(d => d.y === c);
        rows.forEach(d => { const k = key(A, d.x[j]); cnt[k] = (cnt[k] || 0) + 1 });
        A.per[c] = { cnt, n: rows.length };
      });
    }
    model.attrs.push(A);
  }
  return model;
}
function bin(A, v) { let b = 0; while (b < A.edges.length && v >= A.edges[b]) b++; return b }
function key(A, v) { return A.edges ? bin(A, v) : v }
function predict(M, x) {
  const lp = {};
  M.classes.forEach(c => {
    let s = Math.log(M.prior[c]);
    M.attrs.forEach((A, j) => {
      let p;
      if (A.per[c].m !== undefined) {
        const { m, v } = A.per[c];
        p = Math.exp(-((x[j] - m) ** 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v);
      } else {
        const { cnt, n } = A.per[c];
        p = ((cnt[key(A, x[j])] || 0) + M.cfg.alpha) / (n + M.cfg.alpha * A.K);
      }
      s += Math.log(Math.max(p, 1e-300));
    });
    lp[c] = s;
  });
  const mx = Math.max(...Object.values(lp));
  let z = 0; const post = {};
  M.classes.forEach(c => { post[c] = Math.exp(lp[c] - mx); z += post[c] });
  let best = M.classes[0];
  M.classes.forEach(c => { post[c] /= z; if (post[c] > post[best]) best = c });
  return { cls: best, conf: post[best] };
}

