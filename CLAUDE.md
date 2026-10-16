# Linee e quadrettini birichini

Gioco "punti e linee" (Dots and Boxes) in un solo file `index.html`, pubblicato con GitHub Pages:
https://tomelleridavide3d-prog.github.io/punti-e-linee/

**Rispondi sempre in italiano, con parole semplici: l'utente non è un programmatore.**

## Struttura
- `index.html`: tutto il gioco (HTML, CSS, JS). `WEB` = aperto dal sito (solo partite a distanza); da file locale ci sono anche computer (IA a livelli/adattiva) e "stesso dispositivo".
- `peerjs.min.js`: PeerJS 1.5.4 (collegamento diretto tra telefoni, ora solo di riserva).
- `database.rules.json`: regole del Realtime Database Firebase. **Il file nel repo non si applica da solo**: l'utente deve incollarle nella console Firebase (progetto `linee-quadrettini-rh`, Realtime Database > Regole > Pubblica). Ogni volta che le cambi, daglielo da incollare per intero.

## Firebase (sala giochi), aggiunto il 16-10-2026
Percorsi nel database:
- `players/<chiave nome>`: punteggio Elo (parte da 1000, K=32), vinte/perse/pari, `hist` (curva), `vs` (per avversario), `games` (ultime 50), `seen` (gid già contati, valore = timestamp).
- `presence/<sid>`: chi è online (`st` free/playing), tolto con onDisconnect.
- `live/<codice>`: partite in corso (le scrive l'host).
- `invites/<chiave>/<id>`: sfide dirette (Sfida -> popup Accetta/Rifiuta; senza risposta in 12 s = rifiutata).
- `rooms/<codice>`: **canale delle mosse**. Guest -> host in `up` (con `k` = canale del guest), host -> guest in `down/<k>`; chi riceve cancella il messaggio; messaggi = JSON in stringa `m`. `host` = timestamp scritto dall'host all'avvio: se cambia (host ha ricaricato) il guest rimanda `hello`. Se l'host riceve una mossa da un canale sconosciuto risponde `rehello`.

Perché il canale Firebase: PeerJS (WebRTC) non passava tra telefoni su reti mobili diverse (amici con iPhone su 4G restavano su "Collegamento in corso"), i server TURN di peerjs.com sono inaffidabili. Ora il guest usa Firebase (`guestRelay`), e PeerJS solo se Firebase non si carica / le regole lo rifiutano, o se dopo 8 s non arriva la sincronizzazione (host con versione vecchia del sito). L'host ascolta sempre entrambi (`hostRelay` + `createHostPeer`).

Le persone si riconoscono dal nome (`nameKey`): stesso nome su due dispositivi = stessa persona, e non si vede nella lista "Giocatori online" (l'utente all'inizio ha provato così e pensava non funzionasse).

## Ambiente
- Repo locale dell'utente: `C:\Users\Dadidk\punti-e-linee` (VS Code). Pubblicare = commit + push su `master`.
- Prove fuori dal browser vero: Playwright con un finto Firebase (moduli `firebase-app.js` / `firebase-database.js` serviti con `route`, stato condiviso tra due contesti) e peerjs.com bloccato. Mai provato su iPhone veri.

## Stato (16-10-2026)
- Fatto: sala giochi, sfide dirette, partite in corso, punteggio e classifica, statistiche online, mosse via Firebase.
- Da verificare con gli amici (iPhone su rete mobile) dopo che l'utente ha ripubblicato le regole con `rooms`.
- La conversazione originale in VS Code (con l'elenco completo delle richieste dell'utente) non è stata vista dalla sessione cloud: chiedere all'utente se mancano altre cose che aveva chiesto.
