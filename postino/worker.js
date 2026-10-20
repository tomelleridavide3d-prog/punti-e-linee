// Postino dell'Hotel dei Giochi (Cloudflare Worker): manda gli avvisi ai telefoni (Web Push senza contenuto).
// Il telefono, quando riceve la "spinta", chiede a /what cosa mostrare: set aperti (campanella silenziosa) e avvisi dello sviluppatore.
// - ogni minuto (cron) guarda in Firebase cqlist quali set sono aperti; se per qualcuno cambia qualcosa, gli manda una spinta
// - /sub, /unsub: iscrizione del telefono (id, nome, iscrizione push)  - /kick: un set e' appena stato aperto/chiuso, controlla subito
// - /msg: avviso dello sviluppatore a tutti ({nome} = nome di chi lo riceve), protetto dal codice sviluppatore (si confronta l'impronta)
// KV: sub:<id> = { s, n, seen, t }; ids = [id...]; state = { codice: nome host }; msg = { id, title, body, loud, t }
// Segreti (wrangler secret): VAPID_PRIV (JWK della chiave privata). Variabili in wrangler.toml: VAPID_PUB, DEV_H, FB, SITE
const J = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

let keyP = null;
async function vapid(env, endpoint) {
  keyP = keyP || crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIV), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const un = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.SITE });
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await keyP, new TextEncoder().encode(un));
  return 'vapid t=' + un + '.' + b64u(sig) + ', k=' + env.VAPID_PUB;
}
// una spinta (senza contenuto) a un telefono; se l'iscrizione non esiste piu' (404/410) la si toglie
async function push(env, id, sub, ttl, urgent) {
  try {
    const r = await fetch(sub.s.endpoint, { method: 'POST', headers: { Authorization: await vapid(env, sub.s.endpoint), TTL: String(ttl), Urgency: urgent ? 'high' : 'normal', 'Content-Length': '0' } });
    if (r.status === 404 || r.status === 410) await drop(env, id);
    return r.status;
  } catch { return 0; }
}
const getIds = async env => (await env.KV.get('ids', 'json')) || [];
async function drop(env, id) { await env.KV.delete('sub:' + id); const ids = await getIds(env); if (ids.includes(id)) await env.KV.put('ids', JSON.stringify(ids.filter(x => x !== id))); }
const lc = s => String(s || '').trim().toLowerCase();

// set aperti adesso secondo Firebase: { codice: nome di chi l'ha aperto }
async function openSets(env) {
  const r = await fetch(env.FB + '/cqlist.json'); if (!r.ok) return null;
  const L = (await r.json()) || {}, now = Date.now(), o = {};
  for (const [k, v] of Object.entries(L)) if (v && v.o !== -1 && typeof v.ts === 'number' && now - v.ts < 90000) o[k] = clean(v.h, 14) || '?';
  return o;
}
const visible = (state, name) => Object.keys(state).filter(k => lc(state[k]) !== lc(name)).sort().join(',');
async function check(env) {
  const now = await openSets(env); if (!now) return 'firebase?';
  const before = (await env.KV.get('state', 'json')) || {};
  if (JSON.stringify(Object.keys(now).sort()) === JSON.stringify(Object.keys(before).sort())) return 'uguale';
  await env.KV.put('state', JSON.stringify(now));
  const ids = await getIds(env); let n = 0;
  await Promise.all(ids.map(async id => {
    const sub = await env.KV.get('sub:' + id, 'json'); if (!sub) return;
    if (visible(before, sub.n) === visible(now, sub.n)) return;   // per lui non cambia niente (es. il set e' il suo)
    n++; await push(env, id, sub, 600, false);
  }));
  return 'spinte ' + n;
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return J({});
    const u = new URL(req.url), p = u.pathname;
    try {
      if (p === '/what') {   // il telefono chiede cosa mostrare
        const id = clean(u.searchParams.get('id'), 40), sub = id && await env.KV.get('sub:' + id, 'json');
        const state = (await env.KV.get('state', 'json')) || {}, name = sub ? sub.n : '';
        const sets = Object.keys(state).filter(k => lc(state[k]) !== lc(name)).map(k => ({ c: k, h: state[k] }));
        let msg = null; const m = await env.KV.get('msg', 'json');
        if (m && sub && (!m.zz || /^zz/i.test(sub.n)) && (sub.seen || 0) < m.id && Date.now() - m.t < 3 * 86400000) {
          msg = { id: m.id, title: m.title.split('{nome}').join(name || 'amico'), body: m.body.split('{nome}').join(name || 'amico'), loud: !!m.loud };
          sub.seen = m.id; await env.KV.put('sub:' + id, JSON.stringify(sub));
        }
        return J({ sets, msg });
      }
      if (p === '/count') return J({ iscritti: (await getIds(env)).length });
      if (req.method !== 'POST') return J({ ok: true, chi: 'postino dell\'Hotel dei Giochi' });
      const b = await req.json().catch(() => ({}));
      if (p === '/sub') {
        const id = clean(b.id, 40), s = b.sub;
        if (!/^[a-z0-9]{8,40}$/i.test(id) || !s || typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 1000) return J({ ok: false }, 400);
        const old = await env.KV.get('sub:' + id, 'json');
        const m = await env.KV.get('msg', 'json');   // chi si iscrive ora non riceve gli avvisi vecchi
        await env.KV.put('sub:' + id, JSON.stringify({ s: { endpoint: s.endpoint, keys: s.keys }, n: clean(b.name, 14), seen: old ? old.seen || 0 : (m ? m.id : 0), t: Date.now() }));
        const ids = await getIds(env); if (!ids.includes(id)) { if (ids.length >= 300) return J({ ok: false, pieno: 1 }, 429); ids.push(id); await env.KV.put('ids', JSON.stringify(ids)); }
        return J({ ok: true });
      }
      if (p === '/unsub') { const id = clean(b.id, 40); if (id) await drop(env, id); return J({ ok: true }); }
      if (p === '/kick') { ctx.waitUntil(check(env)); return J({ ok: true }); }
      if (p === '/msg') {
        if ((await sha(clean(b.pass, 100))) !== env.DEV_H) return J({ ok: false, codice: 'sbagliato' }, 403);
        const title = clean(b.title, 80), body = clean(b.body, 300); if (!title) return J({ ok: false }, 400);
        // zz: avviso di PROVA, solo ai telefoni di prova (nome che inizia con zz): gli amici veri non lo ricevono mai
        const zz = !!b.zz, m = { id: Date.now(), t: Date.now(), title, body, loud: !!b.loud, zz }; await env.KV.put('msg', JSON.stringify(m));
        const ids = await getIds(env); let ok = 0;
        await Promise.all(ids.map(async id => { const sub = await env.KV.get('sub:' + id, 'json'); if (sub && (!zz || /^zz/i.test(sub.n)) && (await push(env, id, sub, 86400, true)) < 300) ok++; }));
        return J({ ok: true, mandati: ok, iscritti: ids.length });
      }
      return J({ ok: false }, 404);
    } catch (e) { return J({ ok: false, err: String(e).slice(0, 200) }, 500); }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(check(env)); },
};
