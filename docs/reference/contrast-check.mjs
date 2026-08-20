const hex = h => { const n = parseInt(h.slice(1), 16); return [(n>>16)&255,(n>>8)&255,n&255]; };
const lin = c => { c/=255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const L = h => { const [r,g,b] = hex(h).map(lin); return 0.2126*r + 0.7152*g + 0.0722*b; };
const ratio = (a,b) => { const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const fmt = n => n.toFixed(2).padStart(5);
const mark = (n, big=false) => n >= (big?3:4.5) ? 'PASS' : 'FAIL';

const T = {
  ink:'#14161C', merah:'#CE1126', laut:'#0E7C7B',
  emas:'#C9A227', kertas:'#FAF7F2', abu:'#6E7583',
};

console.log('=== LIGHT THEME — text on --kertas ' + T.kertas + ' (AA normal 4.5, large 3.0) ===');
for (const k of ['ink','merah','laut','emas','abu']) {
  const r = ratio(T[k], T.kertas);
  console.log(`  --${k.padEnd(7)} ${T[k]}  ${fmt(r)}:1  normal=${mark(r)}  large=${mark(r,true)}`);
}

console.log('\n=== DARK THEME — text on --ink ' + T.ink + ' ===');
for (const k of ['kertas','merah','laut','emas','abu']) {
  const r = ratio(T[k], T.ink);
  console.log(`  --${k.padEnd(7)} ${T[k]}  ${fmt(r)}:1  normal=${mark(r)}  large=${mark(r,true)}`);
}

console.log('\n=== FILL PAIRINGS (badge = colored bg + text) ===');
const fills = [['ink','emas'],['kertas','merah'],['kertas','laut'],['ink','kertas'],['kertas','ink']];
for (const [fg,bg] of fills) {
  const r = ratio(T[fg], T[bg]);
  console.log(`  ${T[fg]} on ${T[bg]}  ${fmt(r)}:1  ${mark(r)}`);
}

// Search for accessible variants by walking lightness
const adjust = (h, dir) => {
  let [r,g,b] = hex(h);
  const step = dir < 0 ? -1 : 1;
  const out = [];
  for (let i = 0; i < 255; i++) {
    r = Math.max(0, Math.min(255, r + step));
    g = Math.max(0, Math.min(255, g + step));
    b = Math.max(0, Math.min(255, b + step));
    out.push('#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''));
  }
  return out;
};
const findVariant = (base, bg, target=4.5, dir=-1) => {
  for (const c of adjust(base, dir)) if (ratio(c, bg) >= target) return c;
  return null;
};

console.log('\n=== DERIVED VARIANTS (nearest accessible, walking lightness) ===');
const needLight = ['abu','laut','emas'];
for (const k of needLight) {
  const r = ratio(T[k], T.kertas);
  if (r < 4.5) {
    const v = findVariant(T[k], T.kertas, 4.5, -1);
    console.log(`  light: --${k}-text ${v}  ${fmt(ratio(v,T.kertas))}:1  (base ${T[k]} was ${fmt(r)}:1)`);
  }
}
for (const k of ['merah','laut','emas','abu']) {
  const r = ratio(T[k], T.ink);
  if (r < 4.5) {
    const v = findVariant(T[k], T.ink, 4.5, +1);
    console.log(`  dark : --${k}-text ${v}  ${fmt(ratio(v,T.ink))}:1  (base ${T[k]} was ${fmt(r)}:1)`);
  }
}
