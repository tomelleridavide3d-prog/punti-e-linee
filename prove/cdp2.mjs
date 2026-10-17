// uso: node cdp2.mjs <cartella> <passi.mjs>   -- due pagine in contesti separati (come due telefoni); passi.mjs esporta un array di [pagina, codice, attesaMs]
import os from 'node:os'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const [dir, stepsFile] = process.argv.slice(2);
const MOD = await import(pathToFileURL(path.resolve(stepsFile)).href), steps = MOD.default, NP = MOD.n || 2;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), p = path.join(dir, u === '/' ? 'index.html' : u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(d); }); }).listen(0);
const port = srv.address().port, dport = 9300 + Math.floor(Math.random() * 500);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-prof-'));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${dport}`, `--user-data-dir=${prof}`, 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch(`http://127.0.0.1:${dport}/json/version`)).json(); break; } catch { } await sleep(200); }
const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
const send = (method, params = {}, sessionId) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params, sessionId })); });
const pages = [];
for (let i = 0; i < NP; i++) {
  const ctx = (await send('Target.createBrowserContext')).result.browserContextId;
  const tid = (await send('Target.createTarget', { url: 'about:blank', browserContextId: ctx })).result.targetId;
  const sid = (await send('Target.attachToTarget', { targetId: tid, flatten: true })).result.sessionId;
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 860, deviceScaleFactor: 2, mobile: true }, sid);
  await send('Page.enable', {}, sid); await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }, sid);
  pages.push(sid);
}
await sleep(3000);
for (const [p, js, wait] of steps) {
  const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }, pages[p]);
  console.log('[' + (p ? 'amico' + (NP > 2 ? p : '') : 'host') + '] ' + (r.result.exceptionDetails ? 'ERRORE: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 600) : JSON.stringify(r.result.result.value)));
  if (wait) await sleep(wait);
}
try { const v = await (await fetch(`http://127.0.0.1:${dport}/json/version`)).json(), bw = new WebSocket(v.webSocketDebuggerUrl); await new Promise(r => bw.onopen = r); bw.send(JSON.stringify({ id: 1, method: "Browser.close" })); await sleep(700); } catch { }
ws.close(); spawn("taskkill", ["/PID", String(edge.pid), "/T", "/F"]); srv.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch { } process.exit(0); }, 500);
