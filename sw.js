// Aiutante dell'app SOLO per gli avvisi (niente copie del sito: il sito si carica sempre fresco dalla rete).
// Il postino (postino/worker.js) manda una "spinta" vuota; qui si chiede al postino cosa mostrare:
// - sets: set aperti dagli amici -> campanella silenziosa (tag 'set'), che sparisce quando non ce ne sono piu'
// - msg: avviso dello sviluppatore (con o senza suono)
// - rep: lo sviluppatore ha risposto a una richiesta di questa persona (il testo si legge nel gioco)
const W = 'https://hotel-postino.tomelleri-giochi.workers.dev', HOME = self.registration.scope;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
async function myId() { try { const r = await (await caches.open('cq-push')).match('id'); return r ? await r.text() : ''; } catch { return ''; } }
const opt = (o) => Object.assign({ icon: 'icona-192.png', badge: 'campanella.png', data: { url: HOME } }, o);
async function onPush() {
  let d = null;
  try { d = await (await fetch(W + '/what?id=' + encodeURIComponent(await myId()), { cache: 'no-store' })).json(); } catch {}
  if (!d) { await self.registration.showNotification('🔔 Hotel dei Giochi', opt({ body: 'Novità: apri il gioco per vedere.', tag: 'set', silent: true })); return; }
  let shown = false;
  if (d.inv) { await self.registration.showNotification('🎉 ' + d.inv.from + ' ti invita al suo party!', opt({ body: "Tocca per entrare nell'Hotel dei Giochi.", tag: 'inv', renotify: true })); shown = true; }
  if (d.rep) { await self.registration.showNotification('💬 Lo sviluppatore ti ha risposto!', opt({ body: 'Tocca per leggere la risposta nel gioco.', tag: 'rep', renotify: true })); shown = true; }
  if (d.msg) { await self.registration.showNotification(d.msg.title, opt({ body: d.msg.body, tag: 'msg' + d.msg.id, silent: !d.msg.loud })); shown = true; }
  const sets = d.sets || [];
  if (sets.length) {
    const names = [...new Set(sets.map(s => s.h))], who = names.length === 1 ? names[0] + ' ha' : names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1] + ' hanno';
    await self.registration.showNotification('🔔 Party aperto', opt({ body: who + ' aperto un party: entra a giocare!', tag: 'set', silent: true, renotify: false }));
    try { if (self.navigator.setAppBadge) await self.navigator.setAppBadge(sets.length); } catch {}
  } else {
    for (const n of await self.registration.getNotifications({ tag: 'set' })) n.close();
    try { if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); } catch {}
    // il telefono vuole che ogni spinta mostri qualcosa: se non c'e' altro, un avviso che si chiude subito
    if (!shown) { await self.registration.showNotification('Party chiuso', opt({ tag: 'set', silent: true })); for (const n of await self.registration.getNotifications({ tag: 'set' })) n.close(); }
  }
}
self.addEventListener('push', e => e.waitUntil(onPush()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if (c.url.startsWith(HOME) && 'focus' in c) return c.focus();
    return self.clients.openWindow(HOME);
  })());
});
