# Deploy su Render

## 1. Crea il repository

Carica su GitHub solo i file del progetto. Non caricare:

- `restaurant-data.json`
- `backups`
- `versions`
- `.env`

Sono gia esclusi da `.gitignore`.

## 2. Crea il servizio su Render

In Render scegli:

- New
- Blueprint
- collega il repository GitHub
- seleziona il file `render.yaml`

Render usera:

- runtime Node
- start `npm start`
- health check `/api/health`
- disco persistente `/var/data`

## 3. Imposta la password manager

Quando Render chiede le variabili, imposta:

```text
MANAGER_PASSWORD = una password lunga e unica
```

`NODE_ENV` e `DATA_DIR` sono gia nel file `render.yaml`.

## 4. Primo accesso

Dopo il deploy:

1. apri l'URL `onrender.com`;
2. entra come manager con la password scelta;
3. modifica i dipendenti reali;
4. assegna un PIN provvisorio a ogni dipendente;
5. pubblica un giorno di prova;
6. prova l'accesso dipendente.

## 5. Nota importante sui dati

Il primo avvio online parte da `seed-data.json`, che contiene dati demo anonimi e nessun PIN leggibile. I dati reali verranno creati e salvati nel disco privato di Render.
