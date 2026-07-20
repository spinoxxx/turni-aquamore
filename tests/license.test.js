const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  featureForApiRequest,
  hasFeature,
  isProtectedMutation,
  licenseAccess,
  loadLicenseContext
} = require("../license");

const root = path.resolve(__dirname, "..");
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "turni-license-test-"));
fs.mkdirSync(path.join(fixtureRoot, "plans"), { recursive: true });
fs.mkdirSync(path.join(fixtureRoot, "clients"), { recursive: true });
fs.copyFileSync(path.join(root, "plans", "features.json"), path.join(fixtureRoot, "plans", "features.json"));

function addFixtureClient(clientId, plan, overrides = {}) {
  const clientDir = path.join(fixtureRoot, "clients", clientId);
  fs.mkdirSync(clientDir, { recursive: true });
  fs.writeFileSync(path.join(clientDir, "config.json"), JSON.stringify({
    schemaVersion: 1,
    clientId,
    displayName: `Fixture ${clientId}`,
    plan,
    licenseStatus: "active",
    trialEndsAt: null,
    featureOverrides: {
      enabled: overrides.enabled || [],
      disabled: overrides.disabled || []
    }
  }));
  return loadLicenseContext({ root: fixtureRoot, env: { CLIENT_ID: clientId } });
}

const turni = addFixtureClient("fixture-turni", "turni");
assert.equal(turni.planCode, "turni");
assert.equal(turni.accessMode, "active");
assert.equal(turni.canWrite, true);
assert.equal(hasFeature(turni, "schedule"), true);
assert.equal(hasFeature(turni, "time_off_requests"), true);
assert.equal(hasFeature(turni, "attendance"), false);
assert.equal(hasFeature(turni, "payroll_documents"), false);
assert.equal(turni.nextPlan.code, "gestione");

const gestione = addFixtureClient("fixture-gestione", "gestione");
assert.equal(gestione.planCode, "gestione");
assert.equal(hasFeature(gestione, "schedule"), true);
assert.equal(hasFeature(gestione, "attendance"), true);
assert.equal(hasFeature(gestione, "attendance_import_export"), true);
assert.equal(hasFeature(gestione, "payroll_documents"), false);
assert.equal(gestione.nextPlan.code, "controllo");

const gestioneSospesa = loadLicenseContext({
  root: fixtureRoot,
  env: { CLIENT_ID: "fixture-gestione" },
  configOverride: { licenseStatus: "suspended" }
});
assert.equal(gestioneSospesa.licenseStatus, "suspended");
assert.equal(gestioneSospesa.accessMode, "blocked");
assert.equal(gestioneSospesa.canWrite, false);
assert.equal(hasFeature(gestioneSospesa, "attendance"), true);

const controllo = addFixtureClient("fixture-controllo", "controllo");
assert.equal(controllo.planCode, "controllo");
assert.equal(hasFeature(controllo, "schedule"), true);
assert.equal(hasFeature(controllo, "attendance"), true);
assert.equal(hasFeature(controllo, "task_module"), true);
assert.equal(hasFeature(controllo, "workplace_groups"), true);
assert.equal(controllo.nextPlan, null);

const overridden = addFixtureClient("fixture-override", "turni", {
  enabled: ["attendance"],
  disabled: ["backup"]
});
assert.equal(hasFeature(overridden, "attendance"), true);
assert.equal(hasFeature(overridden, "backup"), false);

assert.equal(featureForApiRequest("/api/shifts/abc"), "schedule");
assert.equal(featureForApiRequest("/api/attendance/revenue"), "revenue_productivity");
assert.equal(featureForApiRequest("/api/attendance/import"), "attendance_import_export");
assert.equal(featureForApiRequest("/api/payroll/doc/file"), "payroll_documents");
assert.equal(featureForApiRequest("/api/state"), null);
assert.equal(isProtectedMutation("/api/shifts", "POST"), true);
assert.equal(isProtectedMutation("/api/login", "POST"), false);
assert.equal(isProtectedMutation("/api/leads", "POST"), false);
assert.equal(isProtectedMutation("/api/state", "GET"), false);
assert.deepEqual(licenseAccess({ licenseStatus: "past_due" }), { accessMode: "read_only", canWrite: false });
assert.deepEqual(licenseAccess({ licenseStatus: "suspended" }), { accessMode: "blocked", canWrite: false });
assert.deepEqual(
  licenseAccess({ licenseStatus: "trial", trialEndsAt: "2026-07-01T00:00:00.000Z" }, new Date("2026-07-20T00:00:00.000Z")),
  { accessMode: "read_only", canWrite: false }
);

fs.rmSync(fixtureRoot, { recursive: true, force: true });
console.log("Test licenze superati");
