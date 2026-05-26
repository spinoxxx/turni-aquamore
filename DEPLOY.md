# Pubblicare l'app

Questa versione e pronta per essere pubblicata come app Node.

## Impostazioni obbligatorie

Nel servizio di hosting imposta queste variabili:

```bash
NODE_ENV=production
MANAGER_PASSWORD=una-password-lunga-e-unica
DATA_DIR=/var/data
```

`DATA_DIR` deve essere una cartella privata e persistente. Li dentro l'app salva `restaurant-data.json` e i backup automatici.

Alla prima partenza online l'app copia `seed-data.json` nella cartella dati privata. Il seed e dimostrativo e non contiene PIN leggibili: il manager deve impostare i PIN reali dalle schede dipendente.

## Avvio

```bash
npm start
```

L'hosting deve esporre la porta indicata dalla variabile `PORT`.

## Controllo

Dopo la pubblicazione apri:

```text
/api/health
```

Se risponde `ok: true`, il server e attivo.

## File da non pubblicare come download

Il server gia blocca questi file dal browser:

- `restaurant-data.json`
- `backups`
- `versions`
- `server.js`
- `package.json`

Nel repository GitHub per Render lascia fuori `restaurant-data.json`, `backups` e `versions`: sono esclusi da `.gitignore`.

Se l'hosting permette file statici separati, non caricare queste cartelle come statiche pubbliche.

## Procedura consigliata

1. Pubblica il progetto come app Node.
2. Imposta `MANAGER_PASSWORD`.
3. Attiva HTTPS.
4. Entra come manager.
5. Cambia/assegna PIN personali ai dipendenti.
6. Crea un turno di prova e pubblica un singolo giorno.
7. Entra come dipendente e verifica che si veda solo quel giorno.
