// Prova nel browser vero (node prove/ch2.mjs): pagina di prova servita in http, computer nel Worker, partita computer contro computer fino alla fine
import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process'; import os from 'os';
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const srv = http.createServer((q, r) => { const p = path.join(dir, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(d); }); }).listen(0);
await new Promise(r => srv.on('listening', r));
const port = srv.address().port, dport = 9400 + Math.floor(Math.random() * 300);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'chp'));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--mute-audio', `--remote-debugging-port=${dport}`, `--user-data-dir=${prof}`, '--window-size=540,1000', 'about:blank']);
let ws = null;
for (let i = 0; i < 50 && !ws; i++) { await new Promise(r => setTimeout(r, 200)); try { const l = await (await fetch(`http://127.0.0.1:${dport}/json`)).json(); const pg = l.find(x => x.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {} }
await new Promise(r => ws.onopen = r);
let id = 0; const wait = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m.result); delete wait[m.id]; } else if (m.method === 'Runtime.exceptionThrown') console.log('ERRORE PAGINA', JSON.stringify(m.params.exceptionDetails).slice(0, 400)); };
const cmd = (method, params = {}) => new Promise(r => { const k = ++id; wait[k] = r; ws.send(JSON.stringify({ id: k, method, params })); });
const ev = async x => (await cmd('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result.value;
await cmd('Runtime.enable');
await cmd('Page.navigate', { url: `http://127.0.0.1:${port}/prove/scacchi.html` });
await new Promise(r => setTimeout(r, 1200));
// computer (Medio) contro computer (Facile) con il Worker vero
const res = await ev(`new Promise(done => {
  const S = { mv: [], wc: 0, ck: null, ph: 'play' }; let n = 0, worker = 0; const t0 = Date.now();
  const step = () => {
    if (S.ph !== 'play' || n > 300) return done({ n, why: S.why, win: S.win, ms: Date.now() - t0, worker: typeof Worker });
    const seat = S.mv.length & 1;
    CH.think(S.mv.slice(), CH.aiOpts(seat ? 25 : 50, 0), r => { if (!r || r.err) return done({ err: r && r.err }); CH.apply(S, seat, r.m, Date.now()); n++; step(); });
  };
  step();
})`);
console.log('partita:', JSON.stringify(res));
const ok = res && res.n > 4 && res.why;
console.log(ok ? 'TUTTO OK' : 'ERRORE');
ws.close(); edge.kill(); srv.close();
spawn('powershell', ['-c', 'Get-CimInstance Win32_Process | ? { $_.Name -eq "msedge.exe" -and $_.CommandLine -match "chp" } | % { Stop-Process -Id $_.ProcessId -Force }']).on('exit', () => process.exit(0));
