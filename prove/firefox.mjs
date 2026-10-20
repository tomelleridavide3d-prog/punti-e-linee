// uso: node prove/firefox.mjs <cartella> <passi.mjs>  -- una pagina in Firefox (senza finestra, muto) via WebDriver BiDi; passi = [[codice, attesaMs]]
// permesso notifiche gia' dato nel profilo di prova (per provare gli avvisi)
import os from 'node:os'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const [dir, stepsFile] = process.argv.slice(2);
const steps = (await import(pathToFileURL(path.resolve(stepsFile)).href)).default;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), p = path.join(dir, u === '/' ? 'index.html' : u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.png') ? 'image/png' : p.endsWith('.json') ? 'application/json' : 'text/javascript' }); r.end(d); }); }).listen(0);
const port = srv.address().port, dport = 9800 + Math.floor(Math.random() * 150);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-ff-'));
fs.writeFileSync(path.join(prof, 'user.js'), ['permissions.default.desktop-notification", 1', 'media.volume_scale", "0.0"', 'browser.shell.checkDefaultBrowser", false', 'dom.push.testing.ignorePermission", true', 'remote.prefs.recommended", false', 'dom.push.connection.enabled", true', 'dom.push.serverURL", "wss://push.services.mozilla.com/"'].map(x => 'user_pref("' + x + ');').join('\n'));
const ff = spawn('C:/Program Files/Mozilla Firefox/firefox.exe', ['--headless', '--no-remote', '--profile', prof, `--remote-debugging-port=${dport}`, 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let i = 0; i < 60; i++) { try { ws = new WebSocket(`ws://127.0.0.1:${dport}/session`); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; }); break; } catch { ws = null; await sleep(300); } }
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
await send('session.new', { capabilities: {} });
const ctx = (await send('browsingContext.getTree', {})).result.contexts[0].context;
await send('browsingContext.navigate', { context: ctx, url: `http://127.0.0.1:${port}/`, wait: 'complete' });
await sleep(3000);
for (const [js, wait] of steps) {
  const r = await send('script.evaluate', { expression: js, target: { context: ctx }, awaitPromise: true });
  console.log('[firefox] ' + (r.error ? 'ERRORE: ' + r.message : r.result.type === 'exception' ? 'ERRORE: ' + JSON.stringify(r.result.exceptionDetails.text) : JSON.stringify(r.result.result.value)));
  if (wait) await sleep(wait);
}
try { await send('session.end', {}); } catch { }
ws.close(); spawn('taskkill', ['/PID', String(ff.pid), '/T', '/F']); srv.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch { } process.exit(0); }, 800);
