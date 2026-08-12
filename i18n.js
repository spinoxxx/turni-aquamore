(function () {
  const storageKey = "turniRistoranteLanguage";
  const supportedLanguages = new Set(["it", "en"]);
  const english = {
    "Accesso": "Access",
    "Accesso capoturno turni del giorno": "Supervisor access to daily shifts",
    "Account": "Account",
    "Aggiorna anteprima": "Refresh preview",
    "Aggiorna lista": "Refresh list",
    "Aggiorna presenze": "Refresh attendance",
    "Aggiorna storico": "Refresh history",
    "Aggiungi al calendario": "Add to schedule",
    "Aggiungi dipendente": "Add employee",
    "Aggiungi timbratura": "Add clock entry",
    "Aggiungi turno": "Add shift",
    "Al": "To",
    "Al giorno": "To day",
    "Alle": "At",
    "Altro": "Other",
    "Anagrafica": "Employee details",
    "Annulla": "Cancel",
    "Annulla modifica": "Cancel edit",
    "Anteprima import": "Import preview",
    "Apri totem QR": "Open QR time clock",
    "Archivio": "Archive",
    "Archivio riservato": "Private archive",
    "Area dipendente": "Employee area",
    "Assegnazione": "Assignment",
    "Attestato": "Certificate",
    "Avvisa dipendenti": "Notify employees",
    "Avvisi": "Notices",
    "Azienda": "Company",
    "Bozza": "Draft",
    "Buste paga": "Payslips",
    "Buste paga caricate": "Uploaded payslips",
    "Calendario turni dipendente": "Employee shift calendar",
    "Cambia PIN": "Change PIN",
    "Capoturno": "Supervisor",
    "Carica documento": "Upload document",
    "Carica e distribuisci": "Upload and distribute",
    "Carica un file o incolla le righe, poi fai anteprima.": "Upload a file or paste rows, then preview them.",
    "Categoria": "Category",
    "Cerca": "Search",
    "Certificazione": "Certification",
    "Chiamate": "On-call",
    "Chiamate intermittenti": "On-call employees",
    "Chiudi": "Close",
    "Ciao, questi sono i tuoi turni aggiornati:": "Hi, here are your updated shifts:",
    "Codice comunicazione": "Communication code",
    "Codice fiscale": "Tax ID",
    "Codice fiscale azienda": "Company tax ID",
    "Codice fiscale datore": "Employer tax ID",
    "Codice fiscale dipendente": "Employee tax ID",
    "Colore avatar": "Avatar colour",
    "Colore scheda": "Card colour",
    "Completa mansione": "Complete task",
    "Condivisa nel turno": "Shared during the shift",
    "Conferma import": "Confirm import",
    "Contratto": "Contract",
    "Controlla i dati inseriti.": "Check the information entered.",
    "Controlla il PIN inserito.": "Check the PIN entered.",
    "Controlli settimana": "Week controls",
    "Copertura media": "Average coverage",
    "Copia": "Copy",
    "Copia periodo": "Copy period",
    "Credenziali non valide.": "Invalid credentials.",
    "Da 4 a 8 numeri": "4 to 8 digits",
    "Dal": "From",
    "Dal giorno": "From day",
    "Dalle": "From",
    "Dashboard manager": "Manager dashboard",
    "Data": "Date",
    "Data finale": "End date",
    "Data iniziale": "Start date",
    "Data rilascio": "Issue date",
    "Data scadenza": "Expiry date",
    "Descrizione": "Description",
    "Dettagli operativi per il dipendente": "Operational details for the employee",
    "Dipendente": "Employee",
    "Dipendente a chiamata": "On-call employee",
    "Dipendente assegnato": "Assigned employee",
    "Dipendente se il file non contiene il nome": "Employee if the file does not contain a name",
    "Dipendenti": "Employees",
    "Dipendenti da includere": "Employees to include",
    "Distribuzione buste paga": "Payslip distribution",
    "Documenti": "Documents",
    "Documenti caricati": "Uploaded documents",
    "Documenti dipendenti": "Employee documents",
    "Documenti riservati": "Private documents",
    "Documento": "Document",
    "Duplicazione": "Duplication",
    "Elenco dipendenti": "Employee list",
    "Elimina": "Delete",
    "Email aziendale": "Company email",
    "Email invio": "Delivery email",
    "Email invio chiamate": "On-call delivery email",
    "Entra": "Sign in",
    "Entra nell'app turni": "Sign in to the shift app",
    "Entrata": "Clock in",
    "Es. chiusura, affiancamento": "E.g. closing, training",
    "Es. Contratto di assunzione": "E.g. employment contract",
    "Es. Controllo banco e frigo": "E.g. check counter and fridge",
    "Es. dimenticata uscita": "E.g. missed clock-out",
    "Es. evento, pioggia, chiusura": "E.g. event, rain, closure",
    "Es. Pranzo extra": "E.g. extra lunch",
    "Esci": "Sign out",
    "Esporta CSV": "Export CSV",
    "Esporta Excel": "Export Excel",
    "Esporta dettaglio": "Export details",
    "Esporta riepilogo": "Export summary",
    "Esportazione": "Export",
    "Esportazione...": "Exporting...",
    "Esportazione Excel non riuscita.": "Excel export failed.",
    "Prospetto Excel esportato.": "Excel report exported.",
    "L'esportazione Excel è disponibile nell'app autenticata.": "Excel export is available in the authenticated app.",
    "Fatturato": "Revenue",
    "Ferie": "Leave",
    "File Excel / CSV": "Excel / CSV file",
    "File PDF, JPG o PNG": "PDF, JPG or PNG file",
    "Filtra mese": "Filter month",
    "Fine": "End",
    "Foto": "Photo",
    "Foto obbligatoria": "Photo required",
    "Genera messaggi": "Generate messages",
    "Genera per settimana": "Generate for week",
    "Gestione turni": "Shift management",
    "Gestisci dipendenti": "Manage employees",
    "Gestisci mansioni": "Manage tasks",
    "Giorno": "Day",
    "Giorno da avvisare": "Day to notify",
    "Giorno da copiare": "Day to copy",
    "Giorno da includere": "Day to include",
    "Giorno da pubblicare": "Day to publish",
    "Giorno da stampare": "Day to print",
    "Giorno destinazione": "Target day",
    "Giorno di riposo": "Day off",
    "Giorno fatturato": "Revenue day",
    "Giorno mansione": "Task day",
    "Gruppi statistiche": "Reporting groups",
    "I miei turni": "My shifts",
    "Importa Excel": "Import Excel",
    "Impostazioni": "Settings",
    "Inizio": "Start",
    "Inquadra il QR del totem per registrare entrata o uscita.": "Scan the time clock QR code to clock in or out.",
    "Inserisci password o PIN": "Enter password or PIN",
    "Intestazione messaggio": "Message introduction",
    "Invia richiesta": "Send request",
    "Leggi dal file": "Read from file",
    "Luoghi di lavoro": "Workplaces",
    "Luogo": "Workplace",
    "Luogo / gruppo": "Workplace / group",
    "Luogo di lavoro": "Workplace",
    "Sede / locale": "Venue / location",
    "Sedi / locali": "Venues / locations",
    "Postazione": "Station",
    "Postazioni": "Stations",
    "Nessuna postazione": "No station",
    "Manager": "Manager",
    "Mance": "Tips",
    "Mance contanti": "Cash tips",
    "Mance dipendenti": "Employee tips",
    "Mance POS": "Card tips",
    "Mansionario": "Tasks",
    "Mansionario attivo": "Tasks enabled",
    "Mansionario non configurato.": "Tasks are not configured.",
    "Mansione": "Task",
    "Mansione attiva": "Active task",
    "Mansioni del giorno": "Today's tasks",
    "Mese": "Month",
    "Mese buste paga": "Payslip month",
    "Messaggi dipendenti": "Employee messages",
    "Mezza giornata": "Half day",
    "Motivo o dettaglio opzionale": "Optional reason or details",
    "Nessun dato generato.": "No data generated.",
    "Nessun dipendente a chiamata.": "No on-call employees.",
    "Nessun dettaglio": "No details",
    "Nessun errore rilevato": "No errors found",
    "Nessun messaggio generato.": "No messages generated.",
    "Nessun turno": "No shifts",
    "Nessun turno pianificato": "No shifts scheduled",
    "Nessun turno pianificato.": "No shifts scheduled.",
    "Nessun turno pubblicato": "No published shifts",
    "Nessuna": "None",
    "Nessuna mansione assegnata.": "No tasks assigned.",
    "Nessuna mansione da verificare.": "No tasks to verify.",
    "Nessuna richiesta": "No requests",
    "Nessuna richiesta in attesa.": "No pending requests.",
    "Nessuna richiesta inviata.": "No requests sent.",
    "Nessuna scadenza": "No expiry date",
    "Nome": "Name",
    "Nome attività": "Business name",
    "Nome del ristorante": "Restaurant name",
    "Nome dipendente o turno": "Employee name or shift",
    "Nome e cognome": "Full name",
    "Nome nuovo predefinito": "New preset name",
    "Nota": "Note",
    "Nota obbligatoria": "Note required",
    "Nota opzionale o obbligatoria": "Optional or required note",
    "Note": "Notes",
    "Nuovo elemento": "New item",
    "Nuovo PIN": "New PIN",
    "Nuovo turno": "New shift",
    "Oggi": "Today",
    "Ogni salvataggio crea una copia automatica dei dati. Puoi ripristinare un backup se una modifica crea problemi.": "Every save creates an automatic data copy. You can restore a backup if a change causes problems.",
    "Oppure incolla righe da Excel": "Or paste rows from Excel",
    "Ora": "Time",
    "Ora mansione": "Task time",
    "Ore contratto": "Contract hours",
    "Ore programmate": "Scheduled hours",
    "Passa al piano superiore": "Upgrade plan",
    "Password / PIN": "Password / PIN",
    "PDF singolo o più PDF": "Single or multiple PDFs",
    "Periodo": "Period",
    "Personalizzato": "Custom",
    "Piano": "Plan",
    "PIN accesso": "Access PIN",
    "PIN aggiornato.": "PIN updated.",
    "PIN attuale": "Current PIN",
    "PIN mancanti": "Missing PINs",
    "Predefinito": "Preset",
    "Presenze": "Attendance",
    "Presenze dipendenti": "Employee attendance",
    "Prova richiesta": "Required proof",
    "Pubblica": "Publish",
    "Pubblica giorno": "Publish day",
    "Pubblica settimana": "Publish week",
    "Puoi scattare o caricare una foto normale: l'app la riduce automaticamente prima dell'invio.": "You can take or upload a regular photo: the app automatically reduces it before sending.",
    "Questa settimana": "This week",
    "Questo mese": "This month",
    "Registro manager": "Manager log",
    "Reparti": "Departments",
    "Reparto": "Department",
    "Richiedi riposo o ferie": "Request time off or leave",
    "Richiesta": "Request",
    "Richieste": "Requests",
    "Richieste dipendenti": "Employee requests",
    "Richieste in attesa": "Pending requests",
    "Riepilogo settimana": "Weekly summary",
    "Ripartizione mensile": "Monthly allocation",
    "Ripeti nuovo PIN": "Repeat new PIN",
    "Riposi": "Days off",
    "Riposi e ferie da approvare": "Time-off requests to approve",
    "Riposo o ferie": "Time off or leave",
    "Ripristina ore da presenze": "Reset hours from attendance",
    "Salva": "Save",
    "Salva fatturato": "Save revenue",
    "Salva impostazioni": "Save settings",
    "Salva mansione": "Save task",
    "Salva PIN": "Save PIN",
    "Salva predefinito": "Save preset",
    "Salva prospetto": "Save allocation",
    "Salva turno": "Save shift",
    "Scansiona QR": "Scan QR",
    "Scarica CSV": "Download CSV",
    "Scarica PDF": "Download PDF",
    "Scrivi più voci separate da virgola. Saranno disponibili nei filtri, nelle schede dipendente e nei turni.": "Enter multiple comma-separated values. They will be available in filters, employee records and shifts.",
    "Separa le voci con una virgola. Le sedi identificano i locali; le postazioni indicano dove lavora la persona durante il turno.": "Separate entries with commas. Venues identify the locations; stations indicate where the employee works during the shift.",
    "Es. Bar Flora": "E.g. Bar Flora",
    "Se disponibile": "If available",
    "Se la fotocamera non si apre, usa la fotocamera dell'iPhone e apri il link del QR.": "If the camera does not open, use your phone camera and open the QR link.",
    "Segna completata": "Mark complete",
    "Settimana": "Week",
    "Settimana destinazione": "Target week",
    "Settimana intera": "Full week",
    "Settimana precedente": "Previous week",
    "Settimana richiesta": "Requested week",
    "Settimana successiva": "Next week",
    "Sicurezza dati": "Data safety",
    "Singolo giorno": "Single day",
    "Scegli uno o più dipendenti a chiamata.": "Choose one or more on-call employees.",
    "Seleziona almeno un dipendente.": "Select at least one employee.",
    "Solo una persona": "One person only",
    "Sostituisci i turni già presenti": "Replace existing shifts",
    "Stampa / PDF": "Print / PDF",
    "Stampa / Salva PDF": "Print / Save PDF",
    "Stampa foglio": "Print sheet",
    "Stampa riepilogo": "Print summary",
    "Storico": "History",
    "Storico operativo": "Activity history",
    "Telefono": "Phone",
    "Tiene traccia di pubblicazioni, chiamate generate, timbrature e ripristini backup.": "Tracks publications, generated on-call files, clock entries and backup restores.",
    "Timbratura": "Time clock",
    "Timbrature": "Clock entries",
    "Timbrature aperte": "Open clock entries",
    "Tipo": "Type",
    "Tipo account": "Account type",
    "Tipo richiesta": "Request type",
    "Titolo": "Title",
    "Titolo mansione": "Task title",
    "Turni": "Shifts",
    "Turni del giorno": "Daily shifts",
    "Turni settimana": "Weekly shifts",
    "Turno": "Shift",
    "Tutte": "All",
    "Tutti": "All",
    "Tutti i dipendenti a chiamata": "All on-call employees",
    "Controlla il periodo selezionato.": "Check the selected period.",
    "Inserisci la data iniziale e finale.": "Enter the start and end dates.",
    "La data finale deve essere uguale o successiva a quella iniziale.": "The end date must be the same as or later than the start date.",
    "Ultimo backup": "Latest backup",
    "Usa le credenziali impostate dal manager.": "Use the credentials set by the manager.",
    "Uscita": "Clock out",
    "Verifica mansioni": "Task verification",
    "Verificatore": "Reviewer",
    "Vista manager": "Manager view",
    "Visuale calendario": "Calendar view",
    "Non disponibile": "Not available",
    "Licenza attiva": "Active licence",
    "Account in sola lettura": "Read-only account",
    "Licenza sospesa": "Suspended licence",
    "Funzione non inclusa nel piano": "Feature not included in this plan",
    "Errore richiesta": "Request failed",
    "Connessione al server non riuscita. Ricarica la pagina o riprova tra qualche secondo.": "Could not connect to the server. Reload the page or try again in a few seconds.",
    "Accesso...": "Signing in...",
    "Accesso non riuscito.": "Sign-in failed.",
    "Aggiorna": "Refresh",
    "Aggiorno...": "Refreshing...",
    "Aggiornamento...": "Refreshing...",
    "Caricamento...": "Loading...",
    "Caricamento non riuscito.": "Upload failed.",
    "Caricamento archivio non riuscito.": "Could not load the archive.",
    "Da approvare": "Pending approval",
    "Da avvisare": "To be notified",
    "Da fare": "To do",
    "Da rifare": "To redo",
    "Da verificare": "To review",
    "Data non disponibile": "Date unavailable",
    "Data richiesta non disponibile": "Request date unavailable",
    "Dipendenti non disponibili": "Employees unavailable",
    "Dipendenti non disponibili.": "Employees unavailable.",
    "Dipendenti del turno": "Employees on shift",
    "Fuori servizio": "Off duty",
    "Import non riuscito.": "Import failed.",
    "Importazione...": "Importing...",
    "Invio...": "Sending...",
    "Mancante": "Missing",
    "Mansione del tuo turno": "Task for your shift",
    "Mansioni generate": "Generated tasks",
    "Mansioni di oggi": "Today's tasks",
    "Nascondi giorno": "Hide day",
    "Nascondi settimana": "Hide week",
    "Nessun backup": "No backups",
    "Nessuna mansione.": "No tasks.",
    "Nessuna mansione ricorrente salvata.": "No recurring tasks saved.",
    "Nessuna nuova mansione generata.": "No new tasks generated.",
    "Nessuna nuova mansione generata per questa settimana.": "No new tasks generated for this week.",
    "Nessuna prova": "No proof",
    "Nessuna timbratura registrata": "No clock entries recorded",
    "Non attiva": "Inactive",
    "Non lavorato": "Not worked",
    "Operazione non riuscita": "Operation failed",
    "Orario non impostato": "Time not set",
    "Prima attiva il mansionario.": "Enable tasks first.",
    "Pubblicata": "Published",
    "Pubblicato": "Published",
    "QR non disponibile, controlla la connessione": "QR code unavailable; check the connection",
    "Richiesta non inviata": "Request not sent",
    "Richiesta non inviata.": "Request not sent.",
    "Richiesta respinta.": "Request rejected.",
    "Richiesta inviata. Il manager e stato avvisato via email.": "Request sent. The manager was notified by email.",
    "Richiesta inviata. Il manager la vedra in rosso nelle presenze.": "Request sent. The manager will see it highlighted in attendance.",
    "Salvataggio...": "Saving...",
    "Scanner non disponibile su questo browser. Usa la fotocamera del telefono e apri il link del QR.": "The scanner is unavailable in this browser. Use your phone camera and open the QR link.",
    "Segna la mansione come completata.": "Mark the task as complete.",
    "Timbratura manuale approvata.": "Manual clock entry approved.",
    "Turno aperto": "Open shift",
    "Verifica": "Review",
    "Verificata": "Reviewed",
    "App Turni Ristorante": "Restaurant Shift App",
    "Turni Ristorante": "Restaurant Shifts",
    "Demo App Turni Ristorante": "Restaurant Shift App Demo",
    "Demo Turni Ristorante": "Restaurant Shift Demo",
    "Accesso prototipo": "Prototype access",
    "Dati dimostrativi: non e l'account reale del locale": "Demo data: this is not the venue's real account",
    "Copia turno": "Copy shift",
    "Elimina turno": "Delete shift",
    "Diurno 1": "Day shift 1",
    "Diurno 2": "Day shift 2",
    "Apertura": "Opening",
    "Serale": "Evening",
    "Serale weekend": "Weekend evening",
    "Totem QR timbrature": "QR Time Clock",
    "Richiesta correzione presenze": "Attendance correction request",
    "Mansionario ristorante": "Restaurant tasks",
    "Lead App Turni": "Shift App Leads"
  };

  const sourceText = new WeakMap();
  const renderedText = new WeakMap();
  const sourceAttributes = new WeakMap();
  function storedLanguage() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  let currentLanguage = supportedLanguages.has(storedLanguage()) ? storedLanguage() : "it";
  const originalTitle = document.title;

  function locale() {
    return currentLanguage === "en" ? "en-GB" : "it-IT";
  }

  function translatePattern(text) {
    const patterns = [
      [/^Piano (Turni|Gestione|Controllo)$/, (_, plan) => `Plan ${{ Turni: "Scheduling", Gestione: "Management", Controllo: "Control" }[plan]}`],
      [/^Passa a (Turni|Gestione|Controllo)(.*)$/, (_, plan, rest) => `Upgrade to ${{ Turni: "Scheduling", Gestione: "Management", Controllo: "Control" }[plan]}${rest}`],
      [/^Vista capoturno: (.+)$/, (_, name) => `Supervisor view: ${name}`],
      [/^Vista dipendente: (.+)$/, (_, name) => `Employee view: ${name}`],
      [/^Prova attiva fino al (.+)$/, (_, date) => `Trial active until ${date}`],
      [/^Ultima: (.+)$/, (_, value) => `Latest: ${value}`],
      [/^Inviata il (.+) alle (.+)$/, (_, date, time) => `Sent on ${date} at ${time}`],
      [/^Avvisato (.+)$/, (_, value) => `Notified ${value}`],
      [/^Scade il (.+)$/, (_, date) => `Expires on ${date}`],
      [/^Scaduto il (.+)$/, (_, date) => `Expired on ${date}`],
      [/^(\d+) luoghi$/, (_, count) => `${count} workplaces`],
      [/^(\d+) mansioni generate\.$/, (_, count) => `${count} tasks generated.`],
      [/^(\d+) righe da controllare$/, (_, count) => `${count} rows to review`],
      [/^Caricamento (\d+)\/(\d+)\.\.\.$/, (_, current, total) => `Uploading ${current}/${total}...`],
      [/^Nuovo QR tra (\d+)s$/, (_, seconds) => `New QR code in ${seconds}s`],
      [/^(\d+) mansioni generate dalla ricorrenza\.$/, (_, count) => `${count} recurring tasks generated.`],
      [/^Completata da: (.+)$/, (_, name) => `Completed by: ${name}`],
      [/^Verificata da: (.+)$/, (_, name) => `Reviewed by: ${name}`],
      [/^Verifica: (.+)$/, (_, name) => `Review: ${name}`],
      [/^zᶻ Giorno di riposo$/, () => "zᶻ Day off"],
      [/^Aggiungi turno per (.+)$/, (_, value) => `Add shift for ${value}`],
      [/^(.+) - Giorno di riposo$/, (_, name) => `${name} - Day off`],
      [/^(.+) - Diurno 1$/, (_, name) => `${name} - Day shift 1`],
      [/^(.+) - Diurno 2$/, (_, name) => `${name} - Day shift 2`],
      [/^(.+) - Apertura$/, (_, name) => `${name} - Opening`],
      [/^(.+) - Serale weekend$/, (_, name) => `${name} - Weekend evening`],
      [/^(.+) - Serale$/, (_, name) => `${name} - Evening`],
      [/^([\d.,]+)\/g$/, (_, value) => `${value}/day`],
      [/^Settimana (.+)$/, (_, value) => `Week ${value}`]
    ];
    for (const [pattern, replacement] of patterns) {
      if (pattern.test(text)) return text.replace(pattern, replacement);
    }
    return text;
  }

  function translate(value) {
    if (currentLanguage !== "en" || typeof value !== "string") return value;
    const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = match ? match[2] : value;
    const translated = english[core] || translatePattern(core);
    return match ? `${match[1]}${translated}${match[3]}` : translated;
  }

  function translateTextNode(node, recapture = false) {
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.nodeValue.trim()) return;
    if (node.parentElement?.closest("script, style, [data-i18n-skip]")) return;
    if (recapture && node.nodeValue !== renderedText.get(node)) sourceText.set(node, node.nodeValue);
    if (!sourceText.has(node)) sourceText.set(node, node.nodeValue);
    const next = currentLanguage === "it" ? sourceText.get(node) : translate(sourceText.get(node));
    renderedText.set(node, next);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || element.closest("[data-i18n-skip]")) return;
    const attributes = ["placeholder", "aria-label", "title"];
    let sources = sourceAttributes.get(element);
    if (!sources) {
      sources = {};
      sourceAttributes.set(element, sources);
    }
    attributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      if (!(attribute in sources)) sources[attribute] = element.getAttribute(attribute);
      const next = currentLanguage === "it" ? sources[attribute] : translate(sources[attribute]);
      if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
    });
  }

  function translateTree(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      translateTextNode(node);
      node = walker.nextNode();
    }
    root.querySelectorAll?.("[placeholder], [aria-label], [title]").forEach(translateAttributes);
  }

  function syncSelectors() {
    document.querySelectorAll("[data-language-selector]").forEach((selector) => {
      selector.value = currentLanguage;
    });
  }

  function setLanguage(language) {
    if (!supportedLanguages.has(language)) return;
    currentLanguage = language;
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // The selection still applies for the current page when storage is unavailable.
    }
    document.documentElement.lang = language;
    document.title = currentLanguage === "it" ? originalTitle : translate(originalTitle);
    translateTree(document.body);
    syncSelectors();
    window.dispatchEvent(new CustomEvent("app-language-change", { detail: { language, locale: locale() } }));
  }

  function installSelector() {
    if (document.querySelector("[data-language-selector]")) return;
    const container = document.createElement("label");
    container.className = "global-language-switcher";
    container.setAttribute("data-i18n-skip", "");
    container.innerHTML = '<span aria-hidden="true">🌐</span><select data-language-selector aria-label="Language"><option value="it">Italiano</option><option value="en">English</option></select>';
    container.querySelector("select").addEventListener("change", (event) => setLanguage(event.target.value));
    document.body.appendChild(container);
    syncSelectors();
  }

  function installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .global-language-switcher {
        position: fixed;
        top: 10px;
        right: 12px;
        z-index: 1000;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgba(113, 128, 150, .35);
        border-radius: 999px;
        background: rgba(255, 255, 255, .96);
        padding: 5px 9px;
        box-shadow: 0 6px 20px rgba(31, 41, 55, .12);
      }
      .global-language-switcher select {
        width: auto;
        border: 0;
        background: transparent;
        color: #26313f;
        font: 800 12px/1.2 Inter, system-ui, sans-serif;
        cursor: pointer;
      }
      @media (max-width: 720px) {
        .global-language-switcher { top: 6px; right: 7px; }
      }
      @media print {
        .global-language-switcher { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        translateTextNode(mutation.target, true);
        return;
      }
      mutation.addedNodes.forEach((node) => translateTree(node));
    });
  });

  window.appI18n = {
    language: () => currentLanguage,
    locale,
    setLanguage,
    t: (value) => currentLanguage === "it" ? value : translate(value),
    translatePage: () => translateTree(document.body)
  };

  document.addEventListener("DOMContentLoaded", () => {
    installStyles();
    installSelector();
    document.documentElement.lang = currentLanguage;
    document.title = currentLanguage === "it" ? originalTitle : translate(originalTitle);
    translateTree(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
