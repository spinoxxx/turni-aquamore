const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const appHtml = fs.readFileSync(path.join(root, "app.html"), "utf8");
const demoHtml = fs.readFileSync(path.join(root, "demo.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const i18n = fs.readFileSync(path.join(root, "i18n.js"), "utf8");

for (const [name, html] of [["app", appHtml], ["demo", demoHtml]]) {
  assert.match(html, /id="intermittentiEmployeeList"/, `${name}: manca il filtro dipendenti`);
  assert.match(html, /id="intermittentiSelectAllEmployees"/, `${name}: manca la selezione di tutti i dipendenti`);
  assert.match(html, /id="intermittentiDateFrom" type="date"/, `${name}: manca la data iniziale`);
  assert.match(html, /id="intermittentiDateTo" type="date"/, `${name}: manca la data finale`);
  assert.doesNotMatch(html, /name="intermittentiScope"/, `${name}: il vecchio filtro settimana/giorno non deve restare`);
}

assert.match(app, /function selectedIntermittentiEmployeeIds\(\)/);
assert.match(app, /const startOffset = weekOffsetForDate\(period\.from\)/);
assert.match(app, /const endOffset = weekOffsetForDate\(period\.to\)/);
assert.match(app, /selectedIds\.has\(shift\.employeeId\)/);
assert.match(app, /date < period\.from \|\| date > period\.to/);
assert.match(app, /intermittentiPeriodLabel\(\)/);
assert.match(app, /downloadButtons\.forEach/);

[
  "Dipendenti da includere",
  "Tutti i dipendenti a chiamata",
  "Data iniziale",
  "Data finale",
  "Seleziona almeno un dipendente."
].forEach((label) => assert.ok(i18n.includes(`"${label}"`), `Manca la traduzione di: ${label}`));

console.log("Test filtri chiamate intermittenti superati");
