/* Lectura de CSV y validación del dataset */
function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');
  const lines=text.split(/\r?\n/).filter(l=>l.trim()!=='');
  if(!lines.length)return[];
  const d=[',',';','\t'].map(x=>[x,lines[0].split(x).length]).sort((a,b)=>b[1]-a[1])[0][0];
  return lines.map(l=>l.split(d).map(s=>s.trim().replace(/^"|"$/g,'')));
}
const isMissing=v=>v===''||v==='?'||v.toLowerCase()==='na';
const lineList=a=>a.slice(0,8).join(', ')+(a.length>8?'…':'');
function errBox(id,errs){$(id).innerHTML=errs.length?`<div class="errors" role="alert"><b>Corrige lo siguiente:</b><ul>${errs.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:''}

function loadDataset(text,name){
  DS=null;$('types').innerHTML='';$('dsinfo').textContent='';
  const raw=parseCSV(text),errs=[];
  if(raw.length<2){errs.push('El archivo necesita un encabezado y al menos una instancia.');errBox('dserr',errs);return}
  const header=raw[0],body=raw.slice(1);
  if(header.length<2)errs.push('Se necesita al menos un atributo y la columna de clase (separador válido: coma, punto y coma o tabulador).');
  if(new Set(header).size!==header.length)errs.push('Hay nombres de columna repetidos en el encabezado.');
  const bad=[];body.forEach((r,i)=>{if(r.length!==header.length)bad.push(i+2)});
  if(bad.length)errs.push(`Líneas con un número de columnas distinto a ${header.length}: ${lineList(bad)}.`);
  if(!bad.length){
    const miss=[];body.forEach((r,i)=>{if(r.some(isMissing))miss.push(i+2)});
    if(miss.length)errs.push(`Valores vacíos o faltantes (vacío, ?, NA) en las líneas: ${lineList(miss)}.`);
    const cnt={};body.forEach(r=>{const c=r[r.length-1];cnt[c]=(cnt[c]||0)+1});
    const ks=Object.keys(cnt);
    if(ks.length<2)errs.push('La columna de clase necesita al menos 2 clases distintas.');
    const small=ks.filter(k=>cnt[k]<2);
    if(small.length)errs.push(`Cada clase necesita al menos 2 instancias. Revisa: ${small.join(', ')}.`);
  }
  errBox('dserr',errs);
  if(errs.length)return;
  const na=header.length-1;
  const types=[];
  for(let j=0;j<na;j++){const num=body.every(r=>r[j]!==''&&isFinite(Number(r[j])));
    const dist=new Set(body.map(r=>r[j])).size;
    // numérica con pocos valores distintos (p. ej. 0/1) se trata como discreta
    types.push(num&&!(dist<=5&&dist<body.length/4)?'c':'d');}
  DS={name,header,body,types,na};
  renderTypes();
  $('dsinfo').textContent=`${name}: ${body.length} instancias, ${na} atributos, ${new Set(body.map(r=>r[na])).size} clases.`;
}
function renderTypes(){
  let h='<table><tr><th>Atributo</th><th>Tipo</th><th>Valores distintos</th></tr>';
  for(let j=0;j<DS.na;j++){
    const dist=new Set(DS.body.map(r=>r[j])).size;
    h+=`<tr><td>${esc(DS.header[j])}</td><td><select data-j="${j}"><option value="c"${DS.types[j]==='c'?' selected':''}>Continua</option><option value="d"${DS.types[j]==='d'?' selected':''}>Discreta</option></select></td><td>${dist}</td></tr>`;
  }
  h+=`<tr><td>${esc(DS.header[DS.na])}</td><td>Clase</td><td>${new Set(DS.body.map(r=>r[DS.na])).size}</td></tr></table>`;
  $('types').innerHTML=h;
  $('types').querySelectorAll('select').forEach(s=>s.onchange=()=>{DS.types[+s.dataset.j]=s.value});
}
function convert(rows,types,na,hasClass,idx){
  // idx: índice de columna por atributo (y de clase al final si hasClass)
  return rows.map(r=>({x:types.map((t,j)=>t==='c'?Number(r[idx[j]]):r[idx[j]]),y:hasClass?r[idx[na]]:null}));
}

