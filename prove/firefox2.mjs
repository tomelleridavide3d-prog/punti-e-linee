// uso: node prove/firefox2.mjs <cartella> <pagina> <passi.mjs> [larghezza] [altezza]
// Come firefox.mjs (Firefox senza finestra, muto, profilo separato, via WebDriver BiDi) ma apre una pagina a scelta
// con la misura di un telefono; passi = [[codice, attesaMs, screenshot.png facoltativo]]. Al posto di cdp.mjs (Edge: MAI).
import os from 'node:os'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const [dir, page, stepsFile, W = '412', H = '860'] = process.argv.slice(2);
const steps = (await import(pathToFileURL(path.resolve(stepsFile)).href)).default;
const TYPES = { html: 'text/html; charset=utf-8', png: 'image/png', json: 'application/json', css: 'text/css', svg: 'image/svg+xml' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), p = path.join(dir, u === '/' ? 'index.html' : u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[p.split('.').pop()] || 'text/javascript' }); r.end(d); }); }).listen(0);
const port = srv.address().port, dport = 9800 + Math.floor(Math.random() * 150);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-ff-'));
fs.writeFileSync(path.join(prof, 'user.js'), ['media.volume_scale", "0.0"', 'browser.shell.checkDefaultBrowser", false', 'remote.prefs.recommended", false'].map(x => 'user_pref("' + x + ');').join('\n'));
const ff = spawn('C:/Program Files/Mozilla Firefox/firefox.exe', ['--headless', '--no-remote', '--profile', prof, `--remote-debugging-port=${dport}`, 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bye = () => { try { ws && ws.close(); } catch { } spawn('taskkill', ['/PID', String(ff.pid), '/T', '/F']); srv.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch { } process.exit(0); }, 800); };
let ws; for (let i = 0; i < 60; i++) { try { ws = new WebSocket(`ws://127.0.0.1:${dport}/session`); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; }); break; } catch { ws = null; await sleep(300); } }
if (!ws) { console.log('[firefox] ERRORE: Firefox non risponde'); bye(); }
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
await send('session.new', { capabilities: {} });
const ctx = (await send('browsingContext.getTree', {})).result.contexts[0].context;
await send('browsingContext.setViewport', { context: ctx, viewport: { width: +W, height: +H } });
await send('browsingContext.navigate', { context: ctx, url: `http://127.0.0.1:${port}/${page}`, wait: 'complete' });
await sleep(1500);
for (const [js, wait, shot] of steps) {
  const r = await send('script.evaluate', { expression: js, target: { context: ctx }, awaitPromise: true });
  console.log('[firefox] ' + (r.error ? 'ERRORE: ' + r.message : r.result.type === 'exception' ? 'ERRORE: ' + JSON.stringify(r.result.exceptionDetails.text) : JSON.stringify(r.result.result.value)));
  if (wait) await sleep(wait);
  if (shot) { const s = await send('browsingContext.captureScreenshot', { context: ctx }); if (s.result) fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64')); else console.log('[firefox] screenshot non riuscito'); }
}
try { await send('session.end', {}); } catch { }
bye();
