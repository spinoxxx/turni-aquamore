# Changelog

## 2026-08-02

- Aggiunto nel modulo Mance il pulsante `Esporta Excel` per scaricare il
  prospetto del mese selezionato in formato `.xlsx`.
- Il file include attività, periodo, riepilogo contanti/POS, ore totali,
  dipendenti partecipanti e tabella con percentuali e quote riconciliate ai
  centesimi.
- L'esportazione usa i valori correnti visibili anche prima del salvataggio,
  segue la lingua attiva ed è protetta dalla feature `tips` e dall'accesso
  manager.

## 2026-07-31

- Aggiunto nella visuale Turni del giorno il totale ore programmate per ogni
  intestazione di zona/luogo di lavoro, accanto al numero di turni.

## 2026-07-30

- Aggiunte due guide SEO dedicate alla gestione di cambi turno e sostituzioni e
  al calcolo e controllo del costo del personale nel ristorante.
- Creati due visual originali, aggiunti dati strutturati `Article`/`FAQPage`,
  fonti ufficiali dove pertinenti e nuovi collegamenti interni dalla home e
  dalla guida principale sui turni.
- Aggiornata la sitemap immagini e ampliati i test SEO automatici a dieci
  pagine pubbliche e cinque guide, mantenendo `noindex` sulle aree operative.

## 2026-07-25

- Separati nei turni i concetti di sede e postazione operativa.
- Aggiunte le postazioni configurabili Sala, Bar, Ristorante, Lavaggio e Cucina
  al dialogo turno, alle schede, ai messaggi, alle stampe, alle presenze e alle
  mansioni generate.
- Aggiunta una migrazione conservativa dei dati legacy: i nomi delle postazioni
  non vengono più trattati come sedi, mentre Bar Flora, Muretto e gli altri
  luoghi reali restano invariati; nei casi multi-sede ambigui la sede viene
  lasciata da riassegnare.
- Aggiornata l'interfaccia bilingue e aggiunti test automatici dedicati alla
  separazione e alla migrazione delle postazioni.

## 2026-07-24

- Pubblicate nel negozio Etsy `Digitatone` le tre inserzioni digitali Turni
  Ristorante Starter, Restaurant Shift Planner Excel e Weekly Staff Schedule
  Printable ai prezzi base di 24,90 EUR, 14,90 EUR e 7,90 EUR.
- La pubblicazione ha utilizzato 3 dei 15 crediti inserzione Etsy Plus
  disponibili; il contatore residuo verificato e pari a 12.
- Impostati download digitali, quantita 999 e rinnovo manuale per tutte e tre le
  inserzioni; associati gli ZIP di rilascio corretti e verificata la presenza
  pubblica dei tre articoli.
- Aggiunte tre copertine Etsy dedicate, prive di dati cliente, QR code, link
  esterni e riferimenti a funzioni non incluse.
- Impostati logo, slogan e localita pubblica `Milano, Lombardia` per il negozio
  Etsy.
- Portate le tre inserzioni da una sola immagine a gallerie complete con
  schede funzionali, confronto prodotti e anteprime reali dei file Excel/PDF.
- Riclassificate Starter ed Excel da `Fogli di lavoro` a
  `Modelli per agende`; il pannello Etsy conferma che il negozio e impostato
  per il successo e non segnala piu problemi di foto o informazioni.
- Preparato un PDF dimostrativo di una pagina del Weekly Staff Schedule, con
  dati esclusivamente fittizi e filigrana `SAMPLE / DEMO`, per consentire ai
  potenziali acquirenti di verificare layout e qualita di stampa.

## 2026-07-23

- Aggiunta la linea autonoma `Turni Ristorante Starter`, separata dal SaaS e
  utilizzabile offline tramite un singolo file HTML bilingue senza server,
  account, licenze, analytics o rete.
- Implementate anagrafica fino a 20 dipendenti, ruoli, disponibilita, planning
  settimanale, rilevamento sovrapposizioni, turni notturni, calcolo ore, stampa,
  persistenza locale e backup/ripristino JSON versionato 1.0.
- Creati workbook Excel riutilizzabile, guida rapida bilingue e modelli PDF
  stampabili, con pacchetti derivati Excel e Weekly Staff Schedule Printable.
- Preparati tre ZIP di revisione e bozze contenuti Etsy ai prezzi previsti di
  24,90 EUR, 14,90 EUR e 7,90 EUR, senza pubblicazione o distribuzione esterna.
- Aggiunti test e controlli per offline, formato backup, calcolo oltre
  mezzanotte, assenza dati cliente/segreti/licensing e regressione del prodotto
  comune.
- Definito il piano di lancio Etsy con catalogo a tre livelli, titoli, tag,
  creativita, calendario, stima commissioni, KPI e soglie decisionali per i
  primi 30 giorni; nessuna inserzione e stata pubblicata.

## 2026-07-22

- Aggiunte tre guide SEO approfondite su organizzazione dei turni con esempio settimanale, gestione presenze/timbrature e gestione ferie, permessi e disponibilita.
- Creati tre visual originali dedicati alle guide e aggiunti metadati social, dati strutturati `Article`/`FAQPage`, link contestuali dalla home e nuove URL alla sitemap.
- Aggiunto un test automatico per metadati SEO, JSON-LD, immagini, link locali e permanenza del `noindex` sulle aree operative.

## 2026-07-21

- Sostituite le immagini duplicate delle pagine SEO con visual originali dedicati per turni, presenze QR, multi-sede e prezzi.
- Aggiunte pagine pubbliche SEO per app turni ristoranti, gestione presenze e timbrature QR, software personale multi-sede e prezzi, con link interni dalla home e sitemap aggiornata.
- Implementato il funnel Ads Lombardia: landing dedicata, modulo qualificante, pagina di conferma e onboarding come offerta principale.
- Aggiunti consenso marketing, caricamento condizionale Google/Meta, attribuzione UTM/GCLID/FBCLID, deduplicazione invii e Meta Conversions API opzionale.
- Estesa la dashboard lead con stati commerciali, motivi di perdita, metriche qualificate ed export conversioni offline Google Ads.
- Aggiunti kit operativo campagne Google/Meta, storyboard, report 90 giorni e due creativita pubblicitarie originali senza volto.
- Completata l'ottimizzazione SEO tecnica della landing: metadati social, schema `WebApplication`, sitemap immagini, `robots.txt`, immagini dimensionate e pagine operative escluse dall'indice.
- Aggiornati testi puntuali della landing sui tre problemi operativi e sulle feature dei piani Gestione/Controllo.
- Aggiunte pagine pubbliche `privacy.html` e `cookie.html`, linkate dal footer della landing.
- Aggiunto consenso privacy obbligatorio ai form contatto e demo, con tracciamento nel lead e nel CSV.

## 2026-07-20

- Impostato `turniristorante.it` come dominio canonico della landing e documentata la configurazione Custom Domain su Render.
- Aggiunta conversione dei lead in nuovi clienti commerciali da `leads.html`, con prova di 2 mesi, piano, prezzo, riferimenti Render e salvataggio persistente nel controllo licenze.
- Corretta la sospensione delle licenze per i deployment cliente separati: stato persistente centralizzato, endpoint pubblico minimale di controllo e sincronizzazione automatica tramite `LICENSE_CONTROL_URL`.
- Impostata Aquamore come licenza sospesa senza modificare dati operativi, sedi o credenziali.
- Aggiunta modifica abbonamenti da `licenze.html`, con `PATCH /api/admin/licenses/:clientId` protetto per piano, stato licenza, date commerciali, prezzo e sedi extra.
- Aggiunta interfaccia bilingue italiano/inglese al gestionale, alla demo e alle pagine operative collegate.
- Aggiunto selettore lingua persistente prima e dopo il login, con traduzione dei contenuti dinamici e formati locali per date, orari e importi.
- Aggiunti controlli automatici sul caricamento del modulo lingua e sul ridisegno dell'interfaccia.

- Aggiunta dashboard manager `licenze.html` con endpoint protetto `/api/admin/licenses` per monitorare piani, stati licenza, prove, rinnovi, MRR e deployment cliente.
- Aggiunta dashboard manager `leads.html` per consultare lead landing e accessi demo, con filtri, statistiche e download CSV.
- Separato l'accesso demo dalla app cliente: la landing apre `demo.html`, versione completa dell'app con dati dimostrativi e senza salvataggi sul database reale.
- Aggiunta `.gitignore` per il deploy e bloccato il vecchio asset logo locale dalla pubblicazione statica.
- Aggiunto logo vettoriale Turni Ristorante, favicon SVG e utilizzo del marchio nella landing.
- Aggiunto gate email sui link demo della landing, con salvataggio lead prima dell'accesso a `app.html`.
- Neutralizzati i riferimenti pubblici ai locali reali nella demo, nei dati demo e nei fallback applicativi.
- Corretto il pulsante Mansionario della demo usando un percorso relativo e aggiornato il link di ritorno ai turni.
- Rimossi dalla landing i riferimenti ai locali interni e ad Aquamore, sostituiti con esempi generici.
- Aggiunte immagini originali alla landing per hero, presenze QR e controllo operativo.
- Rimossa dalla landing la sezione interna su codebase, licenze e primi account per mantenere il messaggio centrato sul valore per i ristoratori.
- Riallineata la landing commerciale ai piani Turni, Gestione e Controllo, con prova gratuita di 2 mesi e messaggio multi-cliente.
- Spostato l'accesso al gestionale aggiornato su `app.html` e aggiornati i QR presenze per aprire direttamente l'app.

- Disaccoppiati i test licenze dalle configurazioni commerciali dei clienti reali.
- Aggiunte fixture temporanee per Turni, Gestione, Controllo ed eccezioni feature.
- Aggiornato lo stato comune per riflettere Aquamore sul piano Gestione.

- Implementato il motore licenze con ereditarieta dei piani e override cliente.
- Aggiunto `GET /api/capabilities` e protezione centralizzata delle API per feature.
- Aggiunti stati licenza attiva, prova, sola lettura e sospesa.
- Filtrati dal payload i dati dei moduli non acquistati, preservandoli nel database.
- Aggiunta l'interfaccia piano/upgrade e la visibilita dei comandi basata sulle capabilities.
- Protetti dal download web configurazioni cliente, catalogo piani e test.
- Configurato `CLIENT_ID=bar-flora-muretto` per il servizio Render esistente e documentato `CLIENT_ID=aquamore`.
- Aggiunti test automatici per piani, ereditarieta, mapping API e stato licenza.

- Promossa `v127-fix-gruppi-statistiche` a versione ufficiale del progetto condiviso.
- Conservata la precedente versione in `backups/pre-v127-2026-07-20`.
- Aggiunta la struttura di coordinamento per task prodotto e task cliente.
- Definiti i piani commerciali Turni, Gestione e Controllo.
- Configurato il primo account interno `Bar Flora e Muretto` con piano Controllo.
- Stabilito che la configurazione commerciale non deve sovrascrivere luoghi, gruppi o moduli gia impostati nell'app.

## Versione importata

- Matching dei nomi dei luoghi normalizzato.
- Aggregazione del fatturato per gruppi e singoli luoghi corretta.
- KPI gruppi aggiornati con numero di luoghi inclusi.
