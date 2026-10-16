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
- A fine di ogni serie di modifiche dare **sempre il link del sito**. GitHub Pages fa tenere la pagina in cache 10 minuti: `checkUpdate()` confronta il Last-Modified del server con `document.lastModified` e ricarica da sola (all'apertura e al ritorno sulla pagina, mai con `net` attivo). Se non basta: aggiungere `?v=N` all'indirizzo.
- Controllare a occhio con uno screenshot (Edge headless) prima di pubblicare; l'estetica la giudica l'utente.

## Stato (16-10-2026)
- Fatto: sala giochi, sfide dirette, partite in corso, punteggio e classifica, statistiche online, mosse via Firebase.
- Provato dall'utente su telefoni diversi a distanza: funziona. Regole con `rooms` pubblicate.
- Prossimo: aggiungere un secondo minigioco (vedi la richiesta dell'utente nella nuova chat). Il gioco attuale è un solo `index.html`: valutare con l'utente se serve una schermata di scelta del gioco e come riusare sala giochi, nomi, classifica e canale Firebase.

## Lista giochi (16-10-2026)
- Sul sito (`WEB`) si apre prima una schermata `#home` "Sala giochi" con una scheda per gioco (`gDots`, `gAmong` = segnaposto "in arrivo"). Dalla scheda si entra con `openSetup()`; dentro c'è il tasto "← Giochi" (`showHome()`).
- `presence/<sid>` ha ora il campo `g` = gioco in cui si trova ('home', 'dots', in futuro 'among'); senza `g` (versione vecchia) vale 'dots'. I conteggi sulle schede e la lista "Giocatori online" dei quadrettini filtrano su `g`.
- Fatto tappa 1 di Ciack US (`openCiack`, canvas `#cqCanvas`, presenza `g`=among): personaggio con cappello che cammina su pavimento isometrico 14x14, joystick a trascinamento / frecce. Senza tema.
- Ciack US tappa 2: mappa 44x34 a stanze grandi (Palco, Camerini, Trucco, Corridoio, Montaggio, Magazzino, Proiezione), muri bassi del colore della stanza, porte larghe 3, tappeti (`CQ_DECALS`) e oggetti di scena disegnati uno per uno (`CQ_PROPS`, tipi in `drawProp`: cineprese, fari, giraffa microfono, ciak, sedie da regista, armadietti, specchi da trucco, appendiabiti, postazioni di montaggio, scaffali, casse, barili, poltrone, schermo, proiettore...). Ogni oggetto occupa una cella. Dopo ogni modifica alla mappa controllare con una visita a tappeto (BFS) che tutte le celle libere siano raggiungibili.
- Prossimo: compiti da svolgere, altri personaggi controllati dal computer, impostore e voto, poi online.
- Velocita' Ciack US: la mappa ferma e' disegnata una volta sola in tessere da 1024 pixel (`cqBuildBg`; un'unica immagine larga 4000 px dava quadrati neri sui telefoni), rifatte solo se cambia la misura. A ogni fotogramma si appoggia quell'immagine e si ridisegna da capo solo un riquadro intorno all'omino (pavimento, oggetti dietro, omino, oggetti davanti), con posizioni allineate ai pixel. Si ridisegna a ogni fotogramma anche da fermi: se si smette, il telefono butta la mappa dalla memoria grafica e alla ripartenza scatta. Colori di `cqShade` memorizzati. Misura su PC: da 2,3 a 0,5 ms per fotogramma.
- Sedie (`dchair`): opzione `[colore, lato schienale n/s/e/w]`; davanti a scrivanie/specchi lo schienale va dal lato opposto al tavolo.
- Nella lista giochi in basso c'e' "Versione del ... ore ..." (da `document.lastModified`): serve all'utente per capire se il telefono ha la versione nuova. `checkUpdate()` gira anche ogni minuto.
- Ciack US blocco 1 (personaggio): schermata `#cqPick` all'ingresso e dal tasto "Personaggio". Due personaggi: omino (12 colori `CQ_COLORS`, 7 cappelli `CQ_HATS`, zaino del suo colore) e procione (richiesto dall'utente: cappello nero e zaino viola, fissi). Scelta in `store.settings.cqLook`. `cqPlayer(g, X, Y, TW, look, walk, face)` disegna qualunque personaggio (servira' anche per gli altri giocatori), `cqName` il nome sopra la testa.
- Lista di cio' che manca (concordata con l'utente): 1) personaggio [fatto]; 2) compiti con punto giallo, tasto Usa, mini-giochi di 5-10 s, lista compiti, barra comune, mini-mappa; 3) altri personaggi del computer, ruoli troupe/sabotatore, eliminazioni con attesa, sabotaggi (luci, allarme), corpi e Segnala, riunione con megafono, voto, fantasmi, fine partita; 4) online con Firebase (stanza d'attesa, posti vuoti al computer); 5) suoni, impostazioni, classifica, tutorial.
- Ciack US blocco 2 (compiti) fatto: 7 compiti `CQ_TASKS`, uno per stanza accanto a un oggetto (nuovi oggetti: quadro elettrico `fusebox` nel corridoio, bobina in magazzino); a ogni giro 5 a caso (`CQ_NTASK`). Punto giallo "!" sopra l'oggetto, tasto "Usa" (o E/spazio) entro 1,75 celle, mini-giochi in HTML dentro `#cqTask` (`cqOpenTask`: ciak a tempo, interruttori, sequenza di colori, macchie da toccare, fotogrammi 1-5, bobina da girare, messa a fuoco col cursore). Barra "Riprese", lista compiti, mappa isometrica (`cqOpenMap`). Finiti tutti: "Riprese completate!" e "Nuovi compiti". Prossimo: blocco 3.
- Ciack US blocco 3 fatto (partita contro il computer): `cqNewMatch` = tu + 7 personaggi del computer (`CQ_BOTS`; se tu non sei il procione, uno di loro lo e'), uno a caso e' il sabotatore (anche tu). Stato in `cq.g` (`chars`, `bodies`, `phase` role/play/meet/end, `sab`, `button`). Computer: percorsi a celle `cqPath`, compiti con attesa, memoria di chi hanno visto e dove (`seen`), testimoni (`saw`); i fantasmi della troupe continuano i compiti. Sabotatore del computer: elimina solo se nessun altro e' entro 5 celle, attesa `CQ_KCD`=20 s, ogni tanto sabota. Sabotaggi `CQ_SABS`: luci (buio intorno, si ripara al quadro elettrico con il mini-gioco interruttori) e allarme (45 s, si ripara al proiettore tenendo premuto). Pulsante grande: Segnala / Ripara / Riunione (pulsante rosso `megaphone` nel corridoio, una volta) / Usa. Riunione `cqMeeting`: chat dei personaggi, voto con Salta, espulsione, fine partita `cqEnd`. Tasti PC: E/spazio usa, Q elimina.
- Disegno con piu' personaggi: per ognuno si ridisegna da capo il suo riquadro (`cqRedraw`, solo celle che lo toccano). Corpi a terra `cqBody`.
- Prove: le partite si possono simulare nel browser chiamando `cqBots(0.05)` in un ciclo (vedi equilibrio: con il giocatore che fa un compito ogni 25 s la troupe vince circa 8 volte su 10). Nelle prove con DevTools racchiudere il codice in `(() => { ... })()`: `const` ripetuti in valutazioni diverse danno errore.
- Sfarfallii neri solo sul telefono dell'utente (Xiaomi Redmi Note 13 Pro, Android/Chrome), mai su PC: comparsi da quando la mappa e' in tessere fuori schermo. Messi 4 modi di disegno scelti con `?grafica=N` (ricordato in localStorage `cqGfx`, mostrato in fondo alla lista giochi): 0 tessere canvas (normale), 1 tessere ImageBitmap, 2 nessuna tessera (tutto ridisegnato ogni fotogramma con `cqRedraw` a schermo intero), 3 tessere come <img> nella pagina mosse con transform (`#cqBgMove`). In attesa che l'utente dica quale non sfarfalla: poi tenere quello come normale e togliere gli altri.
- Ciack US giro "piu' bello e personale" 1/3 fatto: personaggi `CQ_SKINS` (omino personalizzabile, procione, gatto con lanciarazzi, regista francese con basco/baffi/cinepresa, guardia brilla che dondola, tonno con fioretto; richiesti dall'utente), disegnati in `cqPlayer`; altezza del nome `cqTop`. Impostazioni partita `cqLobby` (`store.settings.cqOpt`: personaggi 4-10, sabotatori 1-3 con massimo `cqMaxImps`, compiti 3/5/7, attesa 20/30/45 s, blackout casuali, torcia). Piu' sabotatori: si vedono in rosso tra loro, vincono quando sono tanti quanti la troupe. Blackout casuali = `cqStartSab('luci', true)`. Torcia: fascio nella direzione del movimento (`cq.lx/ly`). Chat nella riunione `cqMeetSay`: chi viene nominato risponde, i dubbiosi cambiano voto.
- Equilibrio (simulazioni, giocatore che fa un compito ogni 25 s): 1 sabotatore la troupe vince sempre (~2 min), 2 sabotatori circa meta' e meta', 3 sabotatori vincono quasi sempre. Da rifare dopo la mappa piu' grande.
- Prossimi giri concordati: 2) mappa piu' grande + compiti in piu' passaggi + telecamere di sorveglianza in Montaggio; 3) schermate da film (ciak all'inizio, titoli di coda), suoni veri e musica, animazioni (barretta sopra chi fa un compito, saluti). NON fare l'animazione dell'espulsione (l'utente non la vuole).
