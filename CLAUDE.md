# Linee e quadrettini birichini

Gioco "punti e linee" (Dots and Boxes) in un solo file `index.html`, pubblicato con GitHub Pages:
https://tomelleridavide3d-prog.github.io/punti-e-linee/

**Rispondi sempre in italiano, con parole semplici: l'utente non è un programmatore.**

## Struttura
- `index.html`: tutto il gioco (HTML, CSS, JS). `WEB` = aperto dal sito (solo partite a distanza); da file locale ci sono anche computer (IA a livelli/adattiva) e "stesso dispositivo".
- `peerjs.min.js`: PeerJS 1.5.4 (collegamento diretto tra telefoni, ora solo di riserva).
- `database.rules.json`: regole del Realtime Database Firebase (progetto `linee-quadrettini-rh-f9552`). Si pubblicano da qui con `firebase deploy --only database` (servono `firebase.json` e `.firebaserc`, nel repo). Sul PC dell'utente firebase-tools è installato e collegato a tomelleridavide3d@gmail.com; se il login scade: `firebase login --no-localhost`, dare all'utente il link e farsi incollare il codice. Se lavori in cloud e non puoi pubblicarle, daglielo da incollare per intero nella console (Realtime Database > Regole > Pubblica).

## Firebase (sala giochi), aggiunto il 16-10-2026
Percorsi nel database:
- `players/<chiave nome>`: punteggio Elo (parte da 1000, K=32), vinte/perse/pari, `hist` (curva), `vs` (per avversario), `games` (ultime 50), `seen` (gid già contati, valore = timestamp).
- `presence/<sid>`: chi è online (`st` free/playing), tolto con onDisconnect.
- `live/<codice>`: partite in corso (le scrive l'host).
- `invites/<chiave>/<id>`: sfide dirette (Sfida -> popup Accetta/Rifiuta; senza risposta in 12 s = rifiutata).
- `rooms/<codice>`: **canale delle mosse**. Guest -> host in `up` (con `k` = canale del guest), host -> guest in `down/<k>`; chi riceve cancella il messaggio; messaggi = JSON in stringa `m`. `host` = timestamp scritto dall'host all'avvio: se cambia (host ha ricaricato) il guest rimanda `hello`. Se l'host riceve una mossa da un canale sconosciuto risponde `rehello`.

Perché il canale Firebase: PeerJS (WebRTC) non passava tra telefoni su reti mobili diverse (amici con iPhone su 4G restavano su "Collegamento in corso"), i server TURN di peerjs.com sono inaffidabili. Ora il guest usa Firebase (`guestRelay`), e PeerJS solo se Firebase non si carica / le regole lo rifiutano, o se dopo 8 s non arriva la sincronizzazione (host con versione vecchia del sito). L'host ascolta sempre entrambi (`hostRelay` + `createHostPeer`).

Le persone si riconoscono dal nome (`nameKey`): stesso nome su due dispositivi = stessa persona, e non si vede nella lista "Giocatori online" (l'utente all'inizio ha provato così e pensava non funzionasse).

## Scelte di prodotto già fatte (non rimetterle)
- Una sola regola: chi chiude un quadrato rigioca (tolti i "turni alterni", in tutte le versioni).
- Chi inizia è sempre casuale nelle partite a distanza, anche nelle rivincite (la scelta resta solo contro il computer, versione da file locale).
- Tolta la sezione a tendina "Come si gioca e qualche consiglio".
- Pulsante "Abbandona" (partite a distanza): conta come sconfitta per chi esce e vittoria per l'avversario; se non c'è nessuna mossa si esce senza penalità. Messaggio `forfeit` sul canale, `game.forfeit` = indice del giocatore che ha abbandonato.
- Sito pubblicato (`WEB`): solo "Amico a distanza", niente PIN, nome chiesto la prima volta e ricordato, classifica visibile a tutti.

## Ambiente
- Repo locale dell'utente: `C:\Users\Dadidk\punti-e-linee` (VS Code). Pubblicare = commit + push su `master`.
- Prove con due browser veri: Edge headless con protocollo DevTools (due contesti separati, server locale su una porta, Firebase reale). Usare nomi finti che iniziano con `zz` e **cancellarli dal database a fine prova** (`DELETE .../players/<chiave>.json`), per non sporcare la classifica.
- Prove fuori dal browser vero: Playwright con un finto Firebase (moduli `firebase-app.js` / `firebase-database.js` serviti con `route`, stato condiviso tra due contesti) e peerjs.com bloccato. Mai provato su iPhone veri.

## Regole di lavoro con l'utente
- Spiegare prima cosa comparirà (finestre, UAC) e cosa premere; un passo alla volta. L'utente non sa usare terminale/console: i comandi li esegui tu, a lui chiedi solo clic su siti.
- A fine di ogni serie di modifiche dare **sempre il link del sito** e dire che si aggiorna in circa un minuto (se vede la versione vecchia: aggiungere `?v=N` all'indirizzo).
- Controllare a occhio con uno screenshot (Edge headless) prima di pubblicare; l'estetica la giudica l'utente.

## Stato (16-10-2026)
- Fatto: sala giochi, sfide dirette, partite in corso, punteggio e classifica, statistiche online, mosse via Firebase.
- Provato dall'utente su telefoni diversi a distanza: funziona. Regole con `rooms` pubblicate.
- Prossimo: aggiungere un secondo minigioco (vedi la richiesta dell'utente nella nuova chat). Il gioco attuale è un solo `index.html`: valutare con l'utente se serve una schermata di scelta del gioco e come riusare sala giochi, nomi, classifica e canale Firebase.

## Lista giochi (16-10-2026)
- Sul sito (`WEB`) si apre prima una schermata `#home` "Sala giochi" con una scheda per gioco (`gDots`, `gAmong` = segnaposto "in arrivo"). Dalla scheda si entra con `openSetup()`; dentro c'è il tasto "← Giochi" (`showHome()`).
- `presence/<sid>` ha ora il campo `g` = gioco in cui si trova ('home', 'dots', in futuro 'among'); senza `g` (versione vecchia) vale 'dots'. I conteggi sulle schede e la lista "Giocatori online" dei quadrettini filtrano su `g`.
- Prossimo: costruire il gioco Ciack US (stile Among Us isometrico, a tema set cinematografico) a tappe: 1) mappa e personaggio, 2) compiti + computer, 3) impostore/voto, 4) online con Firebase (4-8 giocatori).
