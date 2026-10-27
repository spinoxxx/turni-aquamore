const assert = require("node:assert/strict");
const {
  DEFAULT_STATIONS,
  canonicalStation,
  migrateLegacyStationState
} = require("../stations");

assert.deepEqual(DEFAULT_STATIONS, ["Sala", "Bar", "Ristorante", "Lavaggio", "Cucina"]);
assert.equal(canonicalStation(" cucina "), "Cucina");

const multiVenueLegacy = migrateLegacyStationState(
  {
    companyName: "Bar Flora e Muretto",
    workplaces: ["Bar Flora", "Muretto", "Sala", "Lavaggio"]
  },
  {
    0: [
      { id: "s1", workplace: "Sala" },
      { id: "s2", workplace: "Muretto" }
    ]
  }
);
assert.deepEqual(multiVenueLegacy.companySettings.workplaces, ["Bar Flora", "Muretto"]);
assert.deepEqual(multiVenueLegacy.migratedLegacyWorkplaces, ["Sala", "Lavaggio"]);
assert.equal(multiVenueLegacy.shiftsByWeek[0][0].station, "Sala");
assert.equal(multiVenueLegacy.shiftsByWeek[0][0].workplace, "");
assert.equal(multiVenueLegacy.shiftsByWeek[0][1].workplace, "Muretto");
assert.equal(multiVenueLegacy.shiftsByWeek[0][1].station, "");

const singleVenueLegacy = migrateLegacyStationState(
  {
    companyName: "Locale Centro",
    workplaces: ["Locale Centro", "Bar"]
  },
  { 0: [{ id: "s1", workplace: "Bar" }] }
);
assert.equal(singleVenueLegacy.shiftsByWeek[0][0].workplace, "Locale Centro");
assert.equal(singleVenueLegacy.shiftsByWeek[0][0].station, "Bar");

const groupedLegacy = migrateLegacyStationState(
  {
    companyName: "Bar Flora e Muretto",
    workplaces: ["Sala", "Bar", "Cucina"],
    workplaceGroups: [
      { name: "Bar Flora", workplaces: ["Sala", "Bar"] },
      { name: "Muretto", workplaces: ["Cucina"] }
    ]
  },
  { 0: [{ id: "s1", workplace: "Cucina" }] }
);
assert.deepEqual(groupedLegacy.companySettings.workplaces, ["Bar Flora", "Muretto"]);
assert.equal(groupedLegacy.shiftsByWeek[0][0].workplace, "");
assert.equal(groupedLegacy.shiftsByWeek[0][0].station, "Cucina");

const currentState = migrateLegacyStationState(
  {
    companyName: "Bar",
    workplaces: ["Bar"],
    stations: ["Sala", "Cucina"]
  },
  { 0: [{ id: "s1", workplace: "Bar", station: "Sala" }] }
);
assert.deepEqual(currentState.companySettings.workplaces, ["Bar"]);
assert.equal(currentState.shiftsByWeek[0][0].workplace, "Bar");
assert.equal(currentState.shiftsByWeek[0][0].station, "Sala");

console.log("Station tests passed");
