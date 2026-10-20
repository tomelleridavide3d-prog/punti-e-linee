// registro accessi: uscita (x) scritta quando la pagina va in sottofondo, tolta se si torna entro 3 minuti; prova su dl/zzprova (poi cancellata)
(async () => {
  const F = await hubLoad(), out = [], sl = ms => new Promise(r => setTimeout(r, ms));
  const r = F.push(F.ref(F.db, 'dl/zzprova'), { n: 'zzProva', t: Date.now(), e: 'sito', d: 'prova' });
  dlStay(F, r); await sl(1500);
  const rd = async () => (await F.get(r)).val();
  let v = await rd(); out.push('dentro: u ' + !!v.u + ', x ' + (v.x || 'no'));
  let hid = false; Object.defineProperty(document, 'hidden', { configurable: true, get: () => hid });
  hid = true; document.dispatchEvent(new Event('visibilitychange')); await sl(1500);
  v = await rd(); out.push('in sottofondo: x ' + (v.x ? 'scritta' : 'NO'));
  hid = false; document.dispatchEvent(new Event('visibilitychange')); await sl(1500);
  v = await rd(); out.push('tornato subito: x ' + (v.x ? 'ANCORA' : 'tolta'));
  hid = true; document.dispatchEvent(new Event('visibilitychange')); await sl(1500);
  v = await rd(); const live = v.u && !v.x && Date.now() - v.u < 150000;
  out.push('uscito di nuovo: lista dice ' + (live ? 'ancora dentro' : 'uscito'));
  await F.remove(F.ref(F.db, 'dl/zzprova'));
  return out.join(' | ');
})()
