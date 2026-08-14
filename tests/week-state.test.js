const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveVisibleWeekOffset } = require("../week-state");

assert.equal(resolveVisibleWeekOffset({
  backendEnabled: true,
  authenticated: true,
  currentWeekOffset: 6,
  stateWeekOffset: 0
}), 6, "un salvataggio autenticato deve mantenere la settimana visualizzata");

assert.equal(resolveVisibleWeekOffset({
  backendEnabled: true,
  authenticated: false,
  currentWeekOffset: 6,
  stateWeekOffset: 2
}), 2, "al primo caricamento deve essere applicata la settimana dello stato");

assert.equal(resolveVisibleWeekOffset({
  backendEnabled: false,
  authenticated: true,
  currentWeekOffset: 6,
  stateWeekOffset: -3
}), -3, "lo stato locale deve continuare a ripristinare la propria settimana");

for (const page of ["app.html", "demo.html"]) {
  const html = fs.readFileSync(path.resolve(__dirname, "..", page), "utf8");
  assert.ok(html.indexOf('src="week-state.js') < html.indexOf('src="app.js'), `${page} deve caricare week-state.js prima di app.js`);
}

console.log("Test permanenza settimana superati");
