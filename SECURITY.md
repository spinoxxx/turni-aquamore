# Pubblicazione sicura

Questa app contiene dati personali dei dipendenti, turni, richieste di riposo, ferie, contatti e storico. Prima di metterla online, usa queste regole.

## Prima della pubblicazione

- Imposta una password manager diversa da quella demo con `MANAGER_PASSWORD`.
- Pubblica solo tramite HTTPS.
- Non caricare online le cartelle `backups` e `versions` se non sono protette dal server.
- Conserva `restaurant-data.json` in un archivio privato, non pubblico.
- Dai a ogni dipendente un PIN provvisorio diverso e faglielo cambiare al primo accesso.

## Variabili consigliate

```bash
NODE_ENV=production
MANAGER_PASSWORD=una-password-lunga-e-unica
PORT=3000
```

## Protezioni gia attive

- I PIN dei dipendenti sono salvati cifrati, non in chiaro.
- Il browser non riceve PIN o hash dei PIN.
- I dipendenti vedono solo i propri turni pubblicati e le proprie richieste.
- Le sessioni scadono dopo 12 ore.
- I cookie sono `HttpOnly` e diventano `Secure` quando l'app e servita in HTTPS.
- Il server blocca l'accesso diretto a dati, backup, versioni e file interni.

## Da fare quando si sceglie l'hosting

- Attivare backup automatici privati.
- Limitare l'accesso al pannello manager.
- Verificare che il provider non esponga file interni come download pubblico.
- Aggiungere una pagina privacy o informativa per i dipendenti, se l'app viene usata realmente in azienda.
