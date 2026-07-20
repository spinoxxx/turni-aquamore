const fs = require("fs");
const path = require("path");

const DEFAULT_CLIENT_ID = "bar-flora-muretto";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PUBLIC_MUTATION_PATHS = new Set(["/api/login", "/api/logout", "/api/leads", "/api/external/login"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function inheritedFeatures(catalog, planCode, visited = new Set()) {
  if (visited.has(planCode)) throw new Error(`Ereditarieta circolare nel piano ${planCode}`);
  const plan = catalog.plans?.[planCode];
  if (!plan) throw new Error(`Piano licenza non riconosciuto: ${planCode}`);
  visited.add(planCode);
  const inherited = plan.inherits ? inheritedFeatures(catalog, plan.inherits, visited) : [];
  return [...new Set([...inherited, ...(Array.isArray(plan.features) ? plan.features : [])])];
}

function licenseAccess(config, now = new Date()) {
  const status = config.licenseStatus || "suspended";
  if (status === "active") return { accessMode: "active", canWrite: true };
  if (status === "trial") {
    const trialEnd = config.trialEndsAt ? new Date(config.trialEndsAt) : null;
    if (!trialEnd) {
      return { accessMode: "trial", canWrite: true };
    }
    if (!Number.isNaN(trialEnd.getTime()) && trialEnd >= now) return { accessMode: "trial", canWrite: true };
    return { accessMode: "read_only", canWrite: false };
  }
  if (status === "past_due") return { accessMode: "read_only", canWrite: false };
  return { accessMode: "blocked", canWrite: false };
}

function safeClientId(value) {
  const clientId = String(value || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(clientId)) {
    throw new Error("CLIENT_ID non valido");
  }
  return clientId;
}

function mergeClientConfig(config, override = {}) {
  return {
    ...config,
    ...override,
    clientId: config.clientId,
    billing: {
      ...(config.billing || {}),
      ...(override.billing || {})
    },
    featureOverrides: {
      ...(config.featureOverrides || {}),
      ...(override.featureOverrides || {})
    }
  };
}

function loadLicenseContext({ root, env = process.env, now = new Date(), configOverride = {} }) {
  const catalog = readJson(path.join(root, "plans", "features.json"));
  const clientId = safeClientId(env.CLIENT_ID || DEFAULT_CLIENT_ID);
  const configPath = path.join(root, "clients", clientId, "config.json");
  if (!fs.existsSync(configPath)) throw new Error(`Configurazione cliente non trovata: ${clientId}`);
  const baseConfig = readJson(configPath);
  if (baseConfig.clientId !== clientId) throw new Error(`clientId non coerente in ${configPath}`);
  const config = mergeClientConfig(baseConfig, configOverride);
  const planCode = config.plan || catalog.defaultPlan;
  const plan = catalog.plans?.[planCode];
  if (!plan) throw new Error(`Piano licenza non riconosciuto: ${planCode}`);
  const features = new Set(inheritedFeatures(catalog, planCode));
  const overrides = config.featureOverrides || {};
  (overrides.enabled || []).forEach((feature) => features.add(feature));
  (overrides.disabled || []).forEach((feature) => features.delete(feature));
  const access = licenseAccess(config, now);
  const planOrder = Object.keys(catalog.plans || {});
  const nextPlanCode = planOrder[planOrder.indexOf(planCode) + 1] || null;
  const nextPlan = nextPlanCode ? catalog.plans[nextPlanCode] : null;
  return {
    clientId,
    displayName: config.displayName || clientId,
    planCode,
    planName: plan.name || planCode,
    monthlyPriceEur: Number(plan.monthlyPriceEur) || 0,
    licenseStatus: config.licenseStatus || "suspended",
    trialEndsAt: config.trialEndsAt || null,
    accessMode: access.accessMode,
    canWrite: access.canWrite,
    features: [...features].sort(),
    nextPlan: nextPlan ? {
      code: nextPlanCode,
      name: nextPlan.name || nextPlanCode,
      monthlyPriceEur: Number(nextPlan.monthlyPriceEur) || 0
    } : null
  };
}

function hasFeature(context, feature) {
  return context.features.includes(feature);
}

function featureForApiRequest(pathname) {
  const rules = [
    [/^\/api\/tips\//, "tips"],
    [/^\/api\/payroll(?:\/|$)/, "payroll_documents"],
    [/^\/api\/employee-documents(?:\/|$)/, "employee_documents"],
    [/^\/api\/external\/(?:schedule|login)$/, "task_module"],
    [/^\/api\/task-(?:module|templates|assignments|photos)(?:\/|$)/, "task_module"],
    [/^\/api\/push-(?:public-key|subscriptions)$/, "push_notifications"],
    [/^\/api\/totem\/token$/, "attendance_totem"],
    [/^\/api\/attendance\/revenue$/, "revenue_productivity"],
    [/^\/api\/attendance\/import$/, "attendance_import_export"],
    [/^\/api\/attendance\/(?:manual-request|manual)(?:\/|$)/, "manual_attendance"],
    [/^\/api\/(?:attendance|me\/attendance)(?:\/|$)/, "attendance"],
    [/^\/api\/activity(?:\/|$)/, "activity_history"],
    [/^\/api\/backups(?:\/|$)/, "backup"],
    [/^\/api\/employees(?:\/|$)/, "employees"],
    [/^\/api\/time-off-requests(?:\/|$)/, "time_off_requests"],
    [/^\/api\/weeks\/.+\/publication$/, "publish_schedule"],
    [/^\/api\/weeks\/.+\/days\/.+\/publication$/, "publish_schedule"],
    [/^\/api\/shifts(?:\/|$)/, "schedule"],
    [/^\/api\/me\/pin$/, "employee_portal"]
  ];
  return rules.find(([pattern]) => pattern.test(pathname))?.[1] || null;
}

function isProtectedMutation(pathname, method) {
  return pathname.startsWith("/api/")
    && MUTATING_METHODS.has(method)
    && !PUBLIC_MUTATION_PATHS.has(pathname);
}

module.exports = {
  DEFAULT_CLIENT_ID,
  featureForApiRequest,
  hasFeature,
  inheritedFeatures,
  isProtectedMutation,
  licenseAccess,
  loadLicenseContext,
  mergeClientConfig
};
