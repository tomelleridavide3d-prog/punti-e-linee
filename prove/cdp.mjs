// uso: node cdp.mjs <cartella> <file-js-da-valutare> [screenshot.png] [larghezza] [altezza]
// serve la cartella su una porta locale, apre Edge headless, valuta il codice e stampa il risultato
import os from 'node:os'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const [dir, jsFile, shot, W = '412', H = '860'] = process.argv.slice(2);
const srv = http.createServer((q, r) => { const p = path.join(dir, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(d); }); }).listen(0);
const port = srv.address().port, dport = 9300 + Math.floor(Math.random() * 500);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-prof-'));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--autoplay-policy=no-user-gesture-required', '--mute-audio', `--remote-debugging-port=${dport}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${dport}/json`)).json(); if (tabs.find(t => t.type === 'page')) break; } catch { } await sleep(200); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 2, mobile: true });
if (process.env.CPU) await send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU });   // CPU=4: processore 4 volte piu' lento (come un telefono)
await send('Page.enable'); await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500);
const r = await send('Runtime.evaluate', { expression: fs.readFileSync(jsFile, 'utf8'), awaitPromise: true, returnByValue: true });
console.log(r.result.exceptionDetails ? 'ERRORE: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 800) : JSON.stringify(r.result.result.value));
if (shot) { await sleep(800); const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64')); }
try { const v = await (await fetch(`http://127.0.0.1:${dport}/json/version`)).json(), bw = new WebSocket(v.webSocketDebuggerUrl); await new Promise(r => bw.onopen = r); bw.send(JSON.stringify({ id: 1, method: "Browser.close" })); await sleep(700); } catch { }
ws.close(); spawn("taskkill", ["/PID", String(edge.pid), "/T", "/F"]); srv.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch { } process.exit(0); }, 500);
