# Stato prodotto

Aggiornato: 14 agosto 2026

## Versione corrente

- Base sorgente: `v127-fix-gruppi-statistiche`.
- La cartella ufficiale condivisa e `App Turni Ristorante`.
- La precedente versione della cartella e conservata in `backups/pre-v127-2026-07-20`.
- Strategia commerciale: tre piani, un'unica codebase e configurazioni separate per cliente.
- Strategia tecnica iniziale: un'installazione Render per cliente; migrazione SaaS multi-tenant dopo la validazione commerciale.

## Funzioni presenti

- Pianificazione turni, pubblicazione per settimana o giorno e area dipendente.
- La settimana visualizzata dal manager resta invariata dopo i salvataggi e le
  sincronizzazioni con il server.
- Ogni turno distingue la sede dalla postazione operativa; le postazioni
  predefinite sono Sala, Bar, Ristorante, Lavaggio e Cucina e possono essere
  personalizzate nelle impostazioni azienda.
- I dati precedenti che usavano esattamente questi nomi come luoghi vengono
  migrati in modo conservativo: le sedi reali restano invariate e, quando un
  account ha più sedi, i vecchi turni ambigui richiedono una nuova assegnazione
  della sede invece di sceglierne una arbitrariamente.
- Richieste di ferie e riposo, capoturno, messaggi e notifiche.
- Timbrature, totem, presenze, importazione ed esportazione.
- Chiamate intermittenti con filtro multiplo per dipendenti e intervallo libero
  di date, mance, buste paga e documenti dipendenti.
- Il modulo Mance esporta il prospetto mensile in formato Excel `.xlsx`, con
  riepilogo, ore, percentuali, quote contanti/POS e totali per dipendente.
- Mansionario, verifiche, fatturato, produttivita e raggruppamenti multi-luogo.
- Backup e storico attivita.

## Muretto Cucina

- Disponibile la PWA standalone `/kitchen/`, separata nell'uso dall'app turni
  ma servita dalla stessa codebase e dallo stesso deployment.
- Il modulo registra disponibilita, quantita indicativa, data di preparazione,
  posizione, note, foto e storico delle preparazioni della cucina.
- Elena e Azmi gestiscono catalogo e posizioni; Reyen e Ivan possono aggiornare
  disponibilita, quantita e ubicazione. I PIN vengono impostati al primo avvio
  e sono conservati esclusivamente in forma cifrata nel disco persistente.
- La consegna giornaliera richiede il controllo di tutte le zone, viene
  pubblicata dal turno del mattino e presa in carico da Azmi.
- L'app conserva l'ultimo stato sul telefono, accoda le modifiche offline e
  presenta un confronto esplicito se due dispositivi modificano lo stesso dato.
- Archivio, foto, backup giornalieri e notifiche sono separati dai dati
  dell'app turni. La funzione `kitchen_handover` appartiene al piano Controllo.

## Interfaccia bilingue

- Il gestionale, la demo, la richiesta manuale presenze, il totem, il mansionario e le dashboard lead/licenze sono disponibili in italiano e inglese.
- Il selettore lingua e visibile anche prima del login e la preferenza viene salvata nel browser.
- Date, orari, importi e contenuti generati dinamicamente seguono la lingua attiva.
- La lingua e una funzione comune a tutti i piani e non modifica nomi, luoghi, reparti o altri dati inseriti dai clienti.

## Licenze e piani

- Implementata la selezione cliente tramite `CLIENT_ID`; il valore predefinito resta `bar-flora-muretto` per preservare il servizio esistente.
- Implementato `GET /api/capabilities` con piano, stato licenza, feature effettive e piano successivo.
- Gli endpoint dei moduli non inclusi restituiscono `403 FEATURE_NOT_AVAILABLE`.
- Le licenze scadute o `past_due` sono in sola lettura; le licenze `suspended` bloccano le API operative.
- Lo stato restituito non include dati di presenze, mance, buste paga, documenti, mansionario o storico quando il piano non li comprende.
- Upgrade e downgrade non cancellano i dati: i campi sensibili e i moduli avanzati vengono preservati sul server.
- L'interfaccia mostra cliente e piano e rimuove i comandi non disponibili.
- Le modifiche effettuate dalla dashboard licenze sono salvate nel disco persistente del servizio principale e distribuite ai deployment cliente tramite `LICENSE_CONTROL_URL`.
- I deployment cliente aggiornano lo stato licenza automaticamente ogni 15 secondi e mantengono una cache persistente dell'ultimo stato valido.

## Turni Ristorante Starter

- Aggiunta una linea di prodotto digitale autonoma e una tantum, distinta dai
  piani SaaS e conservata in `products/turni-ristorante-starter/`.
- La mini-app bilingue funziona direttamente tramite `file://`, salva nel
  browser e non usa server, account, licenze, analytics o chiamate di rete.
- Ambito Starter: una sede, massimo 20 dipendenti, anagrafica, ruoli,
  disponibilita, planning settimanale, conflitti, ore, stampa e backup/ripristino
  JSON versionato 1.0.
- Preparati workbook Excel e PDF bilingui, inclusi i prodotti derivati
  Restaurant Shift Planner Excel e Weekly Staff Schedule Printable.
- Pubblicate nel negozio Etsy `Digitatone` le tre inserzioni digitali ai prezzi
  base di 24,90 EUR, 14,90 EUR e 7,90 EUR, con rinnovo manuale.
- Verificati in vetrina i tre articoli e i rispettivi download; il negozio usa
  logo e slogan dedicati e mostra la localita `Milano, Lombardia`.
- Le gallerie includono schede funzionali e anteprime reali Excel/PDF; Starter
  ed Excel sono classificati come `Modelli per agende`.
- Disponibile un PDF dimostrativo di una pagina, con dati fittizi e filigrana,
  da inviare in risposta alle richieste di prova prima dell'acquisto.
- Starter non appartiene a `plans/features.json`: quel catalogo resta
  esclusivamente SaaS in abbonamento.

## Landing commerciale

- La home pubblica e una one-page commerciale aggiornata sui piani Turni, Gestione e Controllo.
- Dominio commerciale scelto: `turniristorante.it`, con canonical SEO sulla landing.
- Aggiunte pagine `privacy.html` e `cookie.html`; i form lead richiedono consenso privacy e il consenso viene esportato nel CSV.
- Il gestionale completo resta accessibile da `app.html`.
- I QR di timbratura aprono direttamente `app.html?punch=...` per non passare dalla landing.
- Il modulo contatti della landing salva lead tramite `/api/leads`.
- I link demo della landing richiedono una email e salvano un lead prima di aprire `demo.html`, versione completa dell'app con dati dimostrativi e senza accesso al database del cliente attivo.
- I lead sono consultabili da `leads.html` con accesso manager, filtri, statistiche e download CSV protetto.
- Da `leads.html` un lead puo essere convertito in cliente commerciale con piano, prova di 2 mesi, prezzo e riferimenti Render salvati nel controllo licenze persistente.
- Licenze, prove, rinnovi e deployment cliente sono consultabili e modificabili da `licenze.html` con accesso manager.
- Aggiunto logo vettoriale Turni Ristorante con marchio SVG e favicon.
- Completata la base SEO tecnica con metadati social, dati strutturati `WebApplication`, sitemap immagini, `robots.txt` e `noindex` per gestionale e dashboard operative.
- Aggiunte pagine SEO pubbliche per app turni ristoranti, presenze e timbrature QR, software personale multi-sede e prezzi, con link interni dalla home e sitemap aggiornata.
- Le pagine SEO usano visual originali distinti per differenziare turni, presenze QR, multi-sede e prezzi anche in condivisione social.
- Pubblicate tre guide operative approfondite su organizzazione dei turni, presenze/timbrature e gestione di ferie, permessi e disponibilita, ciascuna con visual originale, dati strutturati Article/FAQ e collegamenti al prodotto.
- Aggiunte due guide SEO su cambi turno e sostituzioni e sul controllo del costo del personale, con visual originali, dati strutturati Article/FAQ, fonti ufficiali dove pertinenti e collegamenti interni.
- Il messaggio commerciale chiarisce che la prova di 2 mesi parte senza carta di credito.

## Prossimo intervento di prodotto

Collegare il cambio stato licenza a un flusso di pagamento e automatizzare la creazione del deployment dedicato quando un lead diventa cliente.

## Lancio Ads Lombardia

- Disponibile `ads-lombardia.html`, landing dedicata ai ristoranti lombardi con 6-25 persone e prova di 2 mesi con onboarding.
- Lead Ads qualificati automaticamente per regione, staff, ruolo e tempistica; attribuzione UTM, GCLID e FBCLID salvata nel controllo lead.
- Pipeline commerciale estesa da nuovo a cliente/perso, con storico stato, motivo perdita ed export conversioni offline Google Ads.
- Google tag, Meta Pixel e Meta Conversions API sono opzionali e attivati solo dopo consenso; gli identificativi si configurano tramite ambiente.
- Ogni nuovo lead può inviare un avviso a `assistenza@turniristorante.it`; SMTP e l'eventuale destinatario alternativo `LEAD_NOTIFICATION_EMAIL` restano esclusivamente nelle variabili d'ambiente del servizio.
- Kit campagne, budget, annunci Search, negative, brief Meta, storyboard e report settimanale conservati in `marketing/` e non esposti dal server.
- Due creativita originali senza volto sono disponibili sotto `assets/ads/`.

## Cliente interno attivo

- Account: Bar Flora e Muretto.
- Piano: Controllo, accesso completo.
- Struttura: unico account multi-luogo; preservare i luoghi e i gruppi gia configurati nell'app.
- Configurazione: `clients/bar-flora-muretto/config.json`.

## Cliente Aquamore

- Piano: Gestione, licenza sospesa, 69 EUR/mese.
- Selezione deployment: `CLIENT_ID=aquamore`.
- Autorita licenze: `LICENSE_CONTROL_URL=https://turni-ristorante.onrender.com`.
- Sedi, tipo account e riferimenti Render restano da definire nella task cliente.

## Test licenze

- I test dei piani usano configurazioni cliente temporanee e isolate.
- Nessun test deve dipendere dal piano commerciale corrente di Aquamore, Bar Flora/Muretto o altri clienti reali.

## Regola per le task cliente

Ogni task cliente deve trattare questo file come fonte dello stato corrente. La cronologia delle altre task non e sincronizzata automaticamente; i file condivisi sono il meccanismo ufficiale di coordinamento.
