let employees = [
  { id: "e1", name: "Dipendente 01", role: "Sala", color: "#d94f9b", target: 35, hasPin: true },
  { id: "e2", name: "Dipendente 02", role: "Sala", color: "#4aa7b3", target: 35, hasPin: true },
  { id: "e3", name: "Dipendente 03", role: "Sala", color: "#7f65e8", target: 40, hasPin: true },
  { id: "e4", name: "Dipendente 04", role: "Bar", color: "#5d8f78", target: 40, hasPin: true },
  { id: "e5", name: "Dipendente 05", role: "Sala", color: "#5368df", target: 35.5, hasPin: true },
  { id: "e6", name: "Dipendente 06", role: "Cucina", color: "#5f9af4", target: 40, hasPin: true },
  { id: "e7", name: "Dipendente 07", role: "Sala", color: "#3d9db0", target: 35.5, hasPin: true },
  { id: "e8", name: "Dipendente 08", role: "Bar", color: "#83bd45", target: 35.5, hasPin: true },
  { id: "e9", name: "Dipendente 09", role: "Sala", color: "#4a9dbb", target: 35, hasPin: true },
  { id: "e10", name: "Dipendente 10", role: "Sala", color: "#ef5794", target: 40, hasPin: true },
  { id: "e11", name: "Dipendente 11", role: "Cucina", color: "#c76c8e", target: 35, hasPin: true },
  { id: "e12", name: "Dipendente 12", role: "Bar", color: "#547d5c", target: 38, hasPin: true },
  { id: "e13", name: "Dipendente 13", role: "Sala", color: "#c37c58", target: 40, hasPin: true },
  { id: "e14", name: "Dipendente 14", role: "Cucina", color: "#9b7a53", target: 40, hasPin: true },
  { id: "e15", name: "Dipendente 15", role: "Sala", color: "#619c87", target: 35, hasPin: true },
  { id: "e16", name: "Dipendente 16", role: "Bar", color: "#4b8a9c", target: 35, hasPin: true },
  { id: "e17", name: "Dipendente 17", role: "Sala", color: "#4678b8", target: 35, hasPin: true },
  { id: "e18", name: "Dipendente 18", role: "Cucina", color: "#8a74bd", target: 35, hasPin: true }
];

const storageKey = "restaurantShiftPlannerState";
const baseWeekStart = new Date(2026, 4, 18);
const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
let weekDays = buildWeekDays(0);

let shiftPresets = {
  "Diurno 1": { start: "12:00", end: "18:00", category: "day", color: "#95ddd8" },
  "Diurno 2": { start: "10:00", end: "17:00", category: "day", color: "#95ddd8" },
  Apertura: { start: "08:30", end: "15:00", category: "open", color: "#69bea7" },
  Serale: { start: "17:00", end: "01:00 +1d", category: "evening", color: "#f2a08e" },
  "Serale weekend": { start: "16:00", end: "00:00 +1d", category: "evening", color: "#f2a08e" },
  "Giorno di riposo": { start: "", end: "", category: "rest", color: "#f1f1f3" },
  Ferie: { start: "", end: "", category: "leave", color: "#f7ecd6" }
};

const seedShifts = [
  ["e1", "mon", "Giorno di riposo"], ["e1", "tue", "Serale weekend", "15:00", "21:00"], ["e1", "wed", "Serale weekend"], ["e1", "thu", "Giorno di riposo"], ["e1", "fri", "Serale"], ["e1", "sat", "Diurno 1"], ["e1", "sun", "Diurno 2", "09:00", "15:00"],
  ["e2", "mon", "Giorno di riposo"], ["e2", "tue", "Giorno di riposo"], ["e2", "wed", "Diurno 2"], ["e2", "thu", "Diurno 2"], ["e2", "fri", "Diurno 2"], ["e2", "sat", "Diurno 2"], ["e2", "sun", "Diurno 2"],
  ["e3", "mon", "Giorno di riposo"], ["e3", "tue", "Giorno di riposo"], ["e3", "wed", "Giorno di riposo"], ["e3", "thu", "Serale weekend", "17:00", "01:00 +1d"], ["e3", "fri", "Giorno di riposo"], ["e3", "sat", "Serale weekend"], ["e3", "sun", "Serale"],
  ["e4", "mon", "Giorno di riposo"], ["e4", "tue", "Serale weekend"], ["e4", "wed", "Serale weekend", "15:00", "21:00"], ["e4", "thu", "Giorno di riposo"], ["e4", "fri", "Diurno 2", "15:00", "21:00"], ["e4", "sat", "Serale"], ["e4", "sun", "Serale weekend"],
  ["e5", "mon", "Diurno 2"], ["e5", "tue", "Diurno 2", "10:00", "16:00"], ["e5", "wed", "Giorno di riposo"], ["e5", "thu", "Diurno 2", "09:00", "16:00"], ["e5", "fri", "Diurno 2", "11:00", "18:00"], ["e5", "sat", "Giorno di riposo"], ["e5", "sun", "Apertura", "08:30", "17:00"],
  ["e6", "tue", "Altro", "", "", "mar 19 → mer 20"], ["e6", "thu", "Diurno 2"], ["e6", "fri", "Serale"], ["e6", "sat", "Giorno di riposo"], ["e6", "sun", "Diurno 1", "10:00", "17:00"],
  ["e7", "mon", "Diurno 2", "14:30", "20:00"], ["e7", "tue", "Serale weekend", "18:00", "01:00 +1d"], ["e7", "wed", "Serale weekend", "19:00", "01:00 +1d"], ["e7", "thu", "Giorno di riposo"], ["e7", "fri", "Giorno di riposo"], ["e7", "sat", "Diurno 2", "14:00", "19:00"], ["e7", "sun", "Giorno di riposo"],
  ["e8", "mon", "Diurno 2", "09:00", "15:00"], ["e8", "tue", "Diurno 2", "09:00", "16:00"], ["e8", "wed", "Apertura", "08:30", "15:00"], ["e8", "thu", "Apertura", "08:30", "16:00"], ["e8", "fri", "Apertura", "08:30", "15:00"], ["e8", "sat", "Giorno di riposo"], ["e8", "sun", "Giorno di riposo"],
  ["e9", "mon", "Giorno di riposo"], ["e9", "tue", "Diurno 2", "10:30", "17:00"], ["e9", "wed", "Giorno di riposo"], ["e9", "thu", "Giorno di riposo"], ["e9", "fri", "Diurno 2", "11:00", "18:00"], ["e9", "sat", "Diurno 2", "11:00", "17:00"], ["e9", "sun", "Diurno 2", "10:30", "18:00"],
  ["e10", "mon", "Serale"], ["e10", "tue", "Ferie", "", "", "mar 19 → mer 20"], ["e10", "thu", "Serale"], ["e10", "fri", "Serale weekend", "18:00", "02:00 +1d"], ["e10", "sat", "Serale", "17:00", "02:00 +1d"], ["e10", "sun", "Serale"],
  ["e11", "mon", "Ferie", "", "", "lun 18"], ["e11", "tue", "Giorno di riposo"], ["e11", "wed", "Giorno di riposo"], ["e11", "thu", "Serale weekend", "18:00", "01:00 +1d"], ["e11", "fri", "Serale weekend", "18:00", "02:00 +1d"], ["e11", "sat", "Diurno 2", "09:00", "14:00"], ["e11", "sun", "Serale", "19:00", "01:00 +1d"],
  ["e12", "mon", "Apertura", "08:30", "14:30"], ["e12", "tue", "Apertura", "08:30", "15:00"], ["e12", "wed", "Diurno 2", "09:00", "16:00"], ["e12", "thu", "Diurno 2", "11:00", "17:00"], ["e12", "fri", "Diurno 2", "09:00", "17:00"],
  ["e13", "mon", "Serale weekend", "17:00", "01:00 +1d"], ["e13", "wed", "Serale weekend", "17:00", "01:00 +1d"], ["e13", "sat", "Serale weekend"], ["e13", "sun", "Serale weekend", "14:30", "22:00"],
  ["e14", "mon", "Serale", "20:00", "01:00 +1d"], ["e14", "tue", "Serale weekend"], ["e14", "wed", "Diurno 2", "12:00", "19:00"], ["e14", "sat", "Diurno 2", "09:30", "16:00"], ["e14", "sun", "Diurno 2", "12:00", "18:00"],
  ["e15", "mon", "Diurno 2", "11:00", "17:00"], ["e15", "thu", "Diurno 2", "10:30", "17:00"], ["e15", "fri", "Diurno 2", "10:30", "17:00"], ["e15", "sat", "Diurno 2", "10:30", "18:00"],
  ["e16", "wed", "Diurno 2", "10:30", "17:00"], ["e16", "sat", "Apertura", "08:30", "14:30"], ["e16", "sun", "Diurno 2", "08:30", "15:00"],
  ["e17", "fri", "Serale weekend", "17:00", "02:00 +1d"], ["e17", "sun", "Serale", "18:00", "01:00 +1d"],
  ["e18", "tue", "Diurno 2", "11:00", "19:00"], ["e18", "wed", "Diurno 2", "11:00", "19:00"], ["e18", "thu", "Diurno 2", "11:00", "19:00"]
];

let currentView = "employee";
let weekOffset = 0;
let draggedShiftId = null;
let editingShiftId = null;
let editingShiftWeekOffset = null;
let editingEmployeeId = null;
let appMode = "manager";
let activeEmployeeId = employees[0].id;
let timeOffRequests = [];
let publishedWeeks = { 0: true };
let publishedDays = {};
let notificationLog = [];
let notificationStatus = {};
let generatedNotificationMessages = [];
let currentUser = null;
let attendanceRecords = [];
let manualAttendanceRequests = [];
let attendanceNoWorkDays = [];
let attendanceRevenue = {};
let attendanceImportRows = [];
let tipMonths = {};
let currentTipDraft = null;
let payrollDocuments = [];
let employeeDocuments = [];
let activityLog = [];
let taskModule = { enabled: false, reminderMinutesBefore: 30 };
let taskTemplates = [];
let taskAssignments = [];
let editingTaskTemplateId = null;
let completingTaskId = null;
let pendingPunchToken = new URLSearchParams(window.location.search).get("punch") || "";
let companySettings = {
  companyName: "Bar Flora srl",
  roles: ["Sala", "Cucina", "Bar"],
  workplaces: ["Bar Flora srl"],
  workplaceGroups: [],
  employerFiscalCode: "",
  agencyEmail: ""
};
const backendEnabled = location.protocol.startsWith("http");
let licenseCapabilities = null;

function hasFeature(feature) {
  if (!backendEnabled || !licenseCapabilities) return true;
  return licenseCapabilities.features?.includes(feature);
}

function applyCapabilitiesUi() {
  if (!backendEnabled || !licenseCapabilities) return;
  const featureSelectors = {
    time_off_requests: ["#openRequestDialog"],
    employee_messages: ["#openNotifications"],
    intermittent_calls: ["#openIntermittenti", "#quickIntermittenti"],
    attendance: ["#openAttendance", "#quickAttendance", ".attendance-card"],
    attendance_totem: [".attendance-tools a[href='totem.html']", ".scan-qr-button"],
    manual_attendance: ["#openAttendanceCorrection", ".manual-attendance-link"],
    attendance_import_export: ["#toggleAttendanceImport", "#attendanceImportPanel", "#exportAttendanceSummaryCsv", "#exportAttendanceDetailCsv"],
    revenue_productivity: [".attendance-revenue-panel"],
    tips: ["#openTips"],
    payroll_documents: ["#openPayroll", "#myPayroll"],
    employee_documents: ["#openEmployeeDocuments", "#myEmployeeDocuments"],
    task_module: ["#openTaskManager", "#myTasks", "#taskVerificationPanel"],
    backup: ["#openBackups", "#dashBackupCard"],
    workplace_groups: ["#companyWorkplaceGroupsField"],
    supervisor: ["#employeeSupervisorField"],
    activity_history: ["#openHistory"]
  };
  Object.entries(featureSelectors).forEach(([feature, selectors]) => {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.classList.toggle("feature-locked", !hasFeature(feature));
      });
    });
  });
  ["#roleMode option[value='supervisor']", "#loginRole option[value='supervisor']"].forEach((selector) => {
    document.querySelectorAll(selector).forEach((option) => {
      option.disabled = !hasFeature("supervisor");
      option.hidden = !hasFeature("supervisor");
    });
  });
  document.body.classList.toggle("license-read-only", !licenseCapabilities.canWrite);
  renderLicenseBanner();
}

function renderLicenseBanner() {
  const banner = document.querySelector("#licenseBanner");
  if (!banner || !licenseCapabilities) return;
  banner.classList.remove("hidden", "read-only", "blocked");
  if (licenseCapabilities.accessMode === "read_only") banner.classList.add("read-only");
  if (licenseCapabilities.accessMode === "blocked") banner.classList.add("blocked");
  document.querySelector("#licenseClientName").textContent = licenseCapabilities.displayName;
  document.querySelector("#licensePlanName").textContent = `Piano ${licenseCapabilities.planName}`;
  document.querySelector("#licenseStatusText").textContent = licenseCapabilities.accessMode === "active"
    ? "Licenza attiva"
    : licenseCapabilities.accessMode === "trial"
      ? `Prova attiva${licenseCapabilities.trialEndsAt ? ` fino al ${new Date(licenseCapabilities.trialEndsAt).toLocaleDateString("it-IT")}` : ""}`
      : licenseCapabilities.accessMode === "read_only"
        ? "Account in sola lettura"
        : "Licenza sospesa";
  const upgrade = document.querySelector("#licenseUpgradeLink");
  const nextPlan = licenseCapabilities.nextPlan;
  upgrade.classList.toggle("hidden", !nextPlan);
  if (nextPlan) {
    upgrade.textContent = `Passa a ${nextPlan.name} · ${nextPlan.monthlyPriceEur} €/mese`;
    upgrade.href = `mailto:assistenza@turniristorante.it?subject=${encodeURIComponent(`Upgrade ${licenseCapabilities.displayName} a ${nextPlan.name}`)}`;
  }
}

function canManage() {
  return appMode === "manager" && (!backendEnabled || currentUser?.role === "manager");
}

function canUseEmployeeArea() {
  return appMode === "employee" && (!backendEnabled || currentUser?.role === "employee");
}

function canUseSupervisorView() {
  return appMode === "supervisor" && (!backendEnabled || currentUser?.role === "supervisor");
}

function createInitialShifts() {
  return seedShifts.map(([employeeId, day, type, start, end, note], index) => {
  const preset = shiftPresets[type] || { start: "", end: "", category: "leave", color: "#f7ecd6" };
  return {
    id: `s${index + 1}`,
    employeeId,
    day,
    type,
    start: start ?? preset.start,
    end: end ?? preset.end,
    workplace: defaultWorkplace(),
    color: preset.color,
    note: note || "",
    category: preset.category
  };
});
}

let shiftsByWeek = { 0: createInitialShifts() };
let shifts = shiftsByWeek[0];

const employeeView = document.querySelector("#employeeView");
const dayView = document.querySelector("#dayView");
const searchInput = document.querySelector("#searchInput");
const roleFilter = document.querySelector("#roleFilter");
const weekLabel = document.querySelector("#weekLabel");
const dialog = document.querySelector("#shiftDialog");
const employeeDialog = document.querySelector("#employeeDialog");
const copyDialog = document.querySelector("#copyDialog");
const requestDialog = document.querySelector("#requestDialog");
const backupDialog = document.querySelector("#backupDialog");
const pinDialog = document.querySelector("#pinDialog");
const notificationDialog = document.querySelector("#notificationDialog");
const printDialog = document.querySelector("#printDialog");
const attendanceDialog = document.querySelector("#attendanceDialog");
const tipsDialog = document.querySelector("#tipsDialog");
const payrollDialog = document.querySelector("#payrollDialog");
const employeeDocumentsDialog = document.querySelector("#employeeDocumentsDialog");
const taskDialog = document.querySelector("#taskDialog");
const taskCompleteDialog = document.querySelector("#taskCompleteDialog");
const companySettingsDialog = document.querySelector("#companySettingsDialog");
const intermittentiDialog = document.querySelector("#intermittentiDialog");
const historyDialog = document.querySelector("#historyDialog");
const qrScanDialog = document.querySelector("#qrScanDialog");
const attendanceCorrectionDialog = document.querySelector("#attendanceCorrectionDialog");
let qrScanStream = null;
let qrScanTimer = null;
let editingAttendanceId = null;

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch {
    throw new Error("Connessione al server non riuscita. Ricarica la pagina o riprova tra qualche secondo.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Errore richiesta");
  return payload;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildWeekDays(offset) {
  const start = addDays(baseWeekStart, offset * 7);
  const today = startOfDay();
  return dayKeys.map((key, index) => {
    const date = addDays(start, index);
    const dayNumber = date.getDate();
    const weekday = date.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "");
    return {
      key,
      date,
      label: `${dayNumber} ${weekday}`,
      short: `${weekday} ${dayNumber}`,
      today: date.toDateString() === today.toDateString()
    };
  });
}

function requestDayRange(request) {
  const startIndex = dayKeys.indexOf(request.day);
  const endIndex = dayKeys.indexOf(request.endDay || request.day);
  if (startIndex < 0) return [];
  const safeEndIndex = endIndex >= startIndex ? endIndex : startIndex;
  return dayKeys.slice(startIndex, safeEndIndex + 1);
}

function requestIncludesDay(request, dayKey) {
  return requestDayRange(request).includes(dayKey);
}

function requestDayLabel(request) {
  const days = buildWeekDays(request.weekOffset);
  const startDay = days.find((item) => item.key === request.day);
  const endDayKey = request.endDay || request.day;
  const endDay = days.find((item) => item.key === endDayKey);
  if (!startDay) return request.day || "";
  if (!endDay || endDay.key === startDay.key) return startDay.label;
  return `${startDay.label} → ${endDay.label}`;
}

function requestCreatedLabel(request) {
  if (!request.createdAt) return "Data richiesta non disponibile";
  const date = new Date(request.createdAt);
  if (Number.isNaN(date.getTime())) return "Data richiesta non disponibile";
  return `Inviata il ${date.toLocaleDateString("it-IT")} alle ${date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatWeekRange() {
  return formatWeekRangeForOffset(weekOffset);
}

function formatWeekRangeForOffset(offset) {
  const days = buildWeekDays(offset);
  const start = days[0].date;
  const end = days[6].date;
  const startLabel = start.toLocaleDateString("it-IT", { day: "numeric", month: start.getMonth() === end.getMonth() ? undefined : "long" });
  const endLabel = end.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  return `${startLabel}-${endLabel}`;
}

function ensureWeek(offset) {
  if (!shiftsByWeek[offset]) shiftsByWeek[offset] = [];
  return shiftsByWeek[offset];
}

function isWeekPublished(offset = weekOffset) {
  return Boolean(publishedWeeks[String(offset)] || publishedWeeks[offset]);
}

function isDayPublished(dayKey, offset = weekOffset) {
  return Boolean(publishedDays[String(offset)]?.[dayKey] || publishedDays[offset]?.[dayKey]);
}

function isPeriodPublished(dayKey, offset = weekOffset) {
  return isWeekPublished(offset) || isDayPublished(dayKey, offset);
}

function hasAnyPublishedDay(offset = weekOffset) {
  return dayKeys.some((dayKey) => isDayPublished(dayKey, offset));
}

function visibleWeekShifts(offset = weekOffset) {
  const week = ensureWeek(offset);
  if (canUseSupervisorView()) return week.filter((shift) => isPeriodPublished(shift.day, offset));
  if (appMode !== "employee") return week;
  return week.filter((shift) => isPeriodPublished(shift.day, offset));
}

function saveState() {
  shiftsByWeek[weekOffset] = shifts;
  const state = {
    employees,
    shiftPresets,
    shiftsByWeek,
    weekOffset,
    appMode,
    activeEmployeeId,
    companySettings,
    timeOffRequests,
    manualAttendanceRequests,
    attendanceNoWorkDays,
    attendanceRevenue,
    tipMonths,
    payrollDocuments,
    employeeDocuments,
    taskModule,
    taskTemplates,
    taskAssignments,
    publishedWeeks,
    publishedDays,
    notificationLog,
    notificationStatus,
    activityLog
  };
  if (!backendEnabled) {
    state.attendanceRecords = attendanceRecords;
  }
  if (backendEnabled) {
    if (currentUser?.role === "manager") {
      apiRequest("/api/state", {
        method: "POST",
        body: JSON.stringify({ state })
      }).catch(() => {});
    }
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadState() {
  if (backendEnabled) {
    localStorage.removeItem(storageKey);
    return;
  }
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;
  try {
    applyState(JSON.parse(saved));
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function applyState(state) {
  if (!state) return;
  employees = Array.isArray(state.employees) ? state.employees.map(normalizeEmployee) : employees.map(normalizeEmployee);
  companySettings = normalizeCompanySettings(state.companySettings);
  shiftPresets = state.shiftPresets || shiftPresets;
  shiftsByWeek = state.shiftsByWeek || shiftsByWeek;
  weekOffset = Number(state.weekOffset) || 0;
  appMode = state.appMode || appMode;
  activeEmployeeId = state.activeEmployeeId || activeEmployeeId;
  timeOffRequests = Array.isArray(state.timeOffRequests) ? state.timeOffRequests : timeOffRequests;
  publishedWeeks = state.publishedWeeks || publishedWeeks;
  publishedDays = state.publishedDays || publishedDays;
  notificationLog = Array.isArray(state.notificationLog) ? state.notificationLog : notificationLog;
  notificationStatus = state.notificationStatus || notificationStatus;
  attendanceRecords = Array.isArray(state.attendanceRecords) ? state.attendanceRecords : attendanceRecords;
  manualAttendanceRequests = Array.isArray(state.manualAttendanceRequests) ? state.manualAttendanceRequests : manualAttendanceRequests;
  attendanceNoWorkDays = Array.isArray(state.attendanceNoWorkDays) ? state.attendanceNoWorkDays : attendanceNoWorkDays;
  attendanceRevenue = state.attendanceRevenue && typeof state.attendanceRevenue === "object" ? state.attendanceRevenue : attendanceRevenue;
  tipMonths = state.tipMonths && typeof state.tipMonths === "object" ? state.tipMonths : tipMonths;
  payrollDocuments = Array.isArray(state.payrollDocuments) ? state.payrollDocuments : payrollDocuments;
  employeeDocuments = Array.isArray(state.employeeDocuments) ? state.employeeDocuments : employeeDocuments;
  activityLog = Array.isArray(state.activityLog) ? state.activityLog : activityLog;
  taskModule = state.taskModule || taskModule;
  taskTemplates = Array.isArray(state.taskTemplates) ? state.taskTemplates.map(normalizeTaskTemplate) : taskTemplates;
  taskAssignments = Array.isArray(state.taskAssignments) ? state.taskAssignments.map(normalizeTaskAssignment) : taskAssignments;
  weekDays = buildWeekDays(weekOffset);
  shifts = ensureWeek(weekOffset);
}

function applyUser(user) {
  currentUser = user;
  if (!user) return;
  document.body.classList.remove("auth-gated");
  appMode = user.role;
  if (user.employeeId) activeEmployeeId = user.employeeId;
  if (user.role === "supervisor") currentView = "day";
}

function switchWeek(nextOffset) {
  shiftsByWeek[weekOffset] = shifts;
  weekOffset = nextOffset;
  weekDays = buildWeekDays(weekOffset);
  shifts = ensureWeek(weekOffset);
  populateForm();
  render();
  if (!backendEnabled) saveState();
}

function weekOptionLabel(offset) {
  if (offset === weekOffset) return `Questa settimana (${formatWeekRangeForOffset(offset)})`;
  if (offset === weekOffset + 1) return `Settimana prossima (${formatWeekRangeForOffset(offset)})`;
  if (offset === weekOffset - 1) return `Settimana precedente (${formatWeekRangeForOffset(offset)})`;
  return formatWeekRangeForOffset(offset);
}

function populateCopyDialog() {
  const dayOptions = weekDays
    .map((day) => `<option value="${day.key}">${escapeHtml(day.label)}</option>`)
    .join("");
  document.querySelector("#copySourceDay").innerHTML = dayOptions;
  document.querySelector("#copyTargetDay").innerHTML = dayOptions;

  const weekOptions = [];
  for (let offset = weekOffset - 4; offset <= weekOffset + 8; offset += 1) {
    weekOptions.push(`<option value="${offset}">${escapeHtml(weekOptionLabel(offset))}</option>`);
  }
  document.querySelector("#copyTargetWeek").innerHTML = weekOptions.join("");
  document.querySelector("#copyTargetWeek").value = String(weekOffset + 1);
  document.querySelector("#replaceTarget").checked = true;
  updateCopyModeFields();
}

function populateNotificationDialog() {
  document.querySelector("#notificationDay").innerHTML = weekDays
    .map((day) => `<option value="${day.key}">${escapeHtml(day.label)}</option>`)
    .join("");
  document.querySelector("input[name='notificationScope'][value='week']").checked = true;
  document.querySelector("#notificationIntro").value = "Ciao, questi sono i tuoi turni aggiornati:";
  generatedNotificationMessages = [];
  document.querySelector("#notificationSummary").textContent = "Nessun messaggio generato.";
  document.querySelector("#notificationList").innerHTML = "";
  updateNotificationScopeFields();
}

function populatePrintDialog() {
  document.querySelector("#printDay").innerHTML = weekDays
    .map((day) => `<option value="${day.key}">${escapeHtml(day.label)}</option>`)
    .join("");
  document.querySelector("input[name='printScope'][value='week']").checked = true;
  document.querySelector("#printTitle").value = `Turni ${companyLabel()}`;
  updatePrintScopeFields();
  renderPrintPreview();
}

function updatePrintScopeFields() {
  const scope = document.querySelector("input[name='printScope']:checked").value;
  document.querySelectorAll(".print-day-field").forEach((field) => {
    field.classList.toggle("hidden", scope !== "day");
  });
}

function updateNotificationScopeFields() {
  const scope = document.querySelector("input[name='notificationScope']:checked").value;
  document.querySelectorAll(".notification-day-field").forEach((field) => {
    field.classList.toggle("hidden", scope !== "day");
  });
}

function updateCopyModeFields() {
  const mode = document.querySelector("input[name='copyMode']:checked").value;
  document.querySelectorAll(".day-copy-field").forEach((field) => {
    field.classList.toggle("hidden", mode !== "day");
  });
}

function duplicateShiftForPeriod(shift, overrides = {}) {
  return {
    ...shift,
    ...overrides,
    id: `s${Date.now()}-${Math.random().toString(16).slice(2)}`
  };
}

function copyPeriod() {
  const mode = document.querySelector("input[name='copyMode']:checked").value;
  const sourceDay = document.querySelector("#copySourceDay").value;
  const targetDay = document.querySelector("#copyTargetDay").value;
  const targetOffset = Number(document.querySelector("#copyTargetWeek").value);
  const replaceTarget = document.querySelector("#replaceTarget").checked;
  const sourceShifts = mode === "week" ? [...shifts] : shifts.filter((shift) => shift.day === sourceDay);
  const copiedShifts = sourceShifts.map((shift) => duplicateShiftForPeriod(shift, {
    day: mode === "day" ? targetDay : shift.day
  }));
  const targetShifts = ensureWeek(targetOffset);
  const remainingShifts = replaceTarget
    ? targetShifts.filter((shift) => mode === "day" ? shift.day !== targetDay : false)
    : targetShifts;

  shiftsByWeek[targetOffset] = [...remainingShifts, ...copiedShifts];
  if (targetOffset === weekOffset) shifts = shiftsByWeek[targetOffset];
  copyDialog.close();
  render();
  saveState();
}

function getEmployee(id) {
  return employees.find((employee) => employee.id === id);
}

function isArchivedEmployee(employee) {
  return Boolean(employee?.archivedAt || employee?.active === false);
}

function activeEmployees(list = employees) {
  return list.filter((employee) => !isArchivedEmployee(employee));
}

function sortedEmployees(list = employees, options = {}) {
  const source = options.includeArchived ? list : activeEmployees(list);
  return [...source].sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
}

function normalizeEmployee(employee) {
  const { pin, pinHash, ...safeEmployee } = employee;
  return {
    ...safeEmployee,
    hasPin: Boolean(employee.hasPin || pin || pinHash),
    phone: employee.phone || "",
    email: employee.email || "",
    intermittent: Boolean(employee.intermittent),
    supervisor: Boolean(employee.supervisor),
    fiscalCode: employee.fiscalCode || "",
    communicationCode: employee.communicationCode || "",
    active: employee.active !== false,
    archivedAt: employee.archivedAt || ""
  };
}

function normalizeList(value, fallback) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",");
  const cleaned = list.map((item) => String(item).trim()).filter(Boolean);
  return [...new Set(cleaned.length ? cleaned : fallback)];
}

function normalizedPlaceName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeWorkplaceGroups(value, workplaces = []) {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(/\n+/).map((line) => {
      const [name, places] = line.split(":");
      return { name, workplaces: places };
    });
  const workplaceByName = new Map(workplaces.map((workplace) => [normalizedPlaceName(workplace), workplace]));
  return source
    .map((group) => ({
      name: String(group?.name || "").trim(),
      workplaces: normalizeList(group?.workplaces || [], [])
    }))
    .filter((group) => group.name && group.workplaces.length)
    .map((group) => ({
      ...group,
      workplaces: [...new Set(group.workplaces.map((workplace) => workplaceByName.get(normalizedPlaceName(workplace)) || workplace))]
    }))
    .filter((group) => group.workplaces.length);
}

function workplaceGroupsToText(groups = []) {
  return groups.map((group) => `${group.name}: ${group.workplaces.join(", ")}`).join("\n");
}

function normalizeCompanySettings(settings = {}) {
  const workplaces = normalizeList(settings.workplaces, [String(settings.companyName || "Bar Flora srl").trim() || "Bar Flora srl"]);
  return {
    companyName: String(settings.companyName || "Bar Flora srl").trim() || "Bar Flora srl",
    roles: normalizeList(settings.roles, ["Sala", "Cucina", "Bar"]),
    workplaces,
    workplaceGroups: normalizeWorkplaceGroups(settings.workplaceGroups, workplaces),
    employerFiscalCode: String(settings.employerFiscalCode || "").trim().toUpperCase(),
    agencyEmail: String(settings.agencyEmail || "").trim()
  };
}

function workingShiftTypes() {
  const fromPresets = Object.entries(shiftPresets || {})
    .filter(([, preset]) => preset.category !== "rest" && preset.category !== "leave")
    .map(([name]) => name);
  const fromShifts = Object.values(shiftsByWeek || {})
    .flat()
    .filter((shift) => shift.category !== "rest" && shift.category !== "leave")
    .map((shift) => shift.type)
    .filter(Boolean);
  return [...new Set([...fromPresets, ...fromShifts])].sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

function taskStatusLabel(status) {
  return {
    assigned: "Da fare",
    done: "Da verificare",
    verified: "Verificata",
    rejected: "Da rifare"
  }[status] || status;
}

function taskProofLabel(value) {
  return {
    none: "Nessuna prova",
    note: "Nota obbligatoria",
    photo: "Foto obbligatoria"
  }[value] || "Nessuna prova";
}

function dayLabelFromKey(dayKey) {
  return {
    mon: "Lunedi",
    tue: "Martedi",
    wed: "Mercoledi",
    thu: "Giovedi",
    fri: "Venerdi",
    sat: "Sabato",
    sun: "Domenica"
  }[dayKey] || dayKey;
}

function taskDayLabel(task) {
  const day = buildWeekDays(Number(task.weekOffset)).find((item) => item.key === task.day);
  return day ? day.label : task.day;
}

function currentVisibleTasks() {
  return (taskAssignments || []).filter((task) => String(task.weekOffset) === String(weekOffset));
}

function normalizeTaskAssignment(task) {
  return {
    ...task,
    employeeIds: [...new Set([...(Array.isArray(task.employeeIds) ? task.employeeIds : []), task.employeeId].filter(Boolean))],
    verifierEmployeeId: task.verifierEmployeeId || ""
  };
}

function normalizeTaskTemplate(template) {
  return {
    ...template,
    assignmentMode: template.assignmentMode === "single" ? "single" : "shared",
    assigneeEmployeeId: template.assigneeEmployeeId || "",
    day: dayKeys.includes(template.day) ? template.day : "all",
    taskTime: template.taskTime || "",
    verifierEmployeeId: template.verifierEmployeeId || ""
  };
}

function todayTaskFilter() {
  const todayOffset = weekOffsetForDate(new Date());
  const todayDay = buildWeekDays(todayOffset).find((day) => day.today)?.key || dayKeys[0];
  return { weekOffset: todayOffset, day: todayDay };
}

function taskEmployeeIds(task) {
  return [...new Set([...(Array.isArray(task.employeeIds) ? task.employeeIds : []), task.employeeId].filter(Boolean))];
}

function taskEmployeeNames(task) {
  return taskEmployeeIds(task)
    .map((employeeId) => getEmployee(employeeId)?.name)
    .filter(Boolean)
    .join(", ");
}

function taskShiftLabel(task) {
  const time = task.taskTime ? ` · ore ${task.taskTime}` : task.start ? ` · ${task.start}${task.end ? `-${task.end}` : ""}` : "";
  return `${taskDayLabel(task)} · ${task.shiftType || "Turno"}${time}`;
}

function isTaskForSelectedDay(task) {
  const selectedDay = document.querySelector("#dayPublicationSelect")?.value || weekDays.find((day) => day.today)?.key || weekDays[0]?.key;
  return String(task.weekOffset) === String(weekOffset) && task.day === selectedDay;
}

function defaultWorkplace() {
  return companySettings.workplaces[0] || companySettings.companyName || "Bar Flora srl";
}

function companyLabel() {
  return companySettings.companyName || "Bar Flora srl";
}

function shouldShowMurettoLogo() {
  return companyLabel().toLowerCase().includes("muretto");
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function timeToMinutes(value) {
  if (!value) return null;
  const clean = value.replace(" +1d", "");
  const [hours, minutes] = clean.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes + (value.includes("+1d") ? 1440 : 0);
}

function normalizeTimeValue(value) {
  const text = String(value || "").trim();
  const colonMatch = text.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    return "";
  }
  const digits = text.replace(/\D/g, "");
  if (!digits) return "";
  const padded = digits.length <= 2 ? `${digits.padStart(2, "0")}00` : digits.padStart(4, "0").slice(0, 4);
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2, 4));
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function isValidTimeValue(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "").trim());
}

function normalizedTimeInput(selector) {
  const input = document.querySelector(selector);
  const normalized = normalizeTimeValue(input.value);
  input.value = normalized || input.value;
  return normalized;
}

function requireTimeInput(selector, label) {
  const input = document.querySelector(selector);
  const normalized = normalizeTimeValue(input.value);
  input.value = normalized || input.value;
  if (!isValidTimeValue(input.value)) {
    alert(`Inserisci ${label} in formato 24h, es. 09:30.`);
    input.focus();
    return null;
  }
  return input.value;
}

function setupTimeInputs() {
  ["#startTime", "#endTime", "#requestStartTime", "#requestEndTime", "#attendanceCorrectionTime"].forEach((selector) => {
    const input = document.querySelector(selector);
    if (!input) return;
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^\d:]/g, "").slice(0, 5);
    });
    input.addEventListener("blur", () => {
      const normalized = normalizeTimeValue(input.value);
      if (normalized) input.value = normalized;
    });
  });
}

function shiftHours(shift) {
  const start = timeToMinutes(shift.start);
  const end = shiftEndMinutes(shift);
  if (start === null || end === null || shift.category === "rest" || shift.category === "leave") return 0;
  return Math.max(0, end - start) / 60;
}

function shiftEndMinutes(shift) {
  const start = timeToMinutes(shift.start);
  const end = timeToMinutes(shift.end);
  if (start === null || end === null) return null;
  if (!String(shift.end || "").includes("+1d") && end < start) return end + 1440;
  return end;
}

function shiftSortValue(shift) {
  const dayIndex = dayKeys.indexOf(shift.day);
  return (dayIndex < 0 ? 99 : dayIndex) * 2000 + (timeToMinutes(shift.start) || 0);
}

function dateForOffsetDay(dayKey, offset = weekOffset) {
  return buildWeekDays(offset).find((item) => item.key === dayKey)?.date || buildWeekDays(offset)[0].date;
}

function shiftDateTime(shift, edge = "start") {
  const date = new Date(shift.date || dateForOffsetDay(shift.day, shift.weekOffset ?? weekOffset));
  const minutes = edge === "end" ? shiftEndMinutes(shift) : timeToMinutes(shift.start);
  if (minutes === null) return startOfDay(date);
  date.setHours(0, minutes, 0, 0);
  return date;
}

function weekOffsetForDate(date) {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(date) - startOfDay(baseWeekStart)) / oneWeek);
}

function knownWeekOffsetsFromToday() {
  const todayOffset = weekOffsetForDate(new Date());
  const offsets = Object.keys(shiftsByWeek)
    .map(Number)
    .filter(Number.isFinite)
    .filter((offset) => offset >= todayOffset);
  offsets.push(todayOffset, weekOffset);
  return [...new Set(offsets)].filter((offset) => offset >= todayOffset).sort((a, b) => a - b);
}

function shiftLineForMessage(shift, offset = weekOffset) {
  const day = buildWeekDays(offset).find((item) => item.key === shift.day);
  const time = shift.start && shift.end ? ` ${shift.start}-${shift.end}` : "";
  const workplace = shift.workplace ? ` · ${shift.workplace}` : "";
  const note = shift.note ? ` · ${shift.note}` : "";
  return `- ${day ? day.label : shift.day}: ${shift.type}${time}${workplace}${note}`;
}

function nextEmployeeShift(employeeId = activeEmployeeId) {
  const now = new Date();
  const today = startOfDay(now);
  return knownWeekOffsetsFromToday()
    .flatMap((offset) => (shiftsByWeek[offset] || shiftsByWeek[String(offset)] || []).map((shift) => ({
      ...shift,
      weekOffset: offset,
      date: dateForOffsetDay(shift.day, offset)
    })))
    .filter((shift) => shift.employeeId === employeeId && shift.date >= today && isPeriodPublished(shift.day, shift.weekOffset))
    .filter((shift) => shift.category !== "rest" && shift.category !== "leave")
    .filter((shift) => shiftDateTime(shift, "end") >= now)
    .sort((a, b) => shiftDateTime(a, "start") - shiftDateTime(b, "start"))[0] || null;
}

function notificationKey(scope, dayKey, employeeId, offset = weekOffset) {
  return `${offset}:${scope}:${scope === "day" ? dayKey : "week"}:${employeeId}`;
}

function notificationStatusFor(key) {
  return notificationStatus[key] || null;
}

function attendanceDayKey(record) {
  return new Date(record.timestamp).toLocaleDateString("it-IT");
}

function todayAttendanceRecords(employeeId = activeEmployeeId) {
  const today = new Date().toLocaleDateString("it-IT");
  return attendanceRecords
    .filter((record) => record.employeeId === employeeId && attendanceDayKey(record) === today)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function latestAttendance(employeeId = activeEmployeeId) {
  return attendanceRecords
    .filter((record) => record.employeeId === employeeId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;
}

function attendanceLabel(type) {
  return type === "in" ? "Entrata" : "Uscita";
}

function attendanceTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function timeInputValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyValue(date) {
  return dateInputValue(startOfDay(date));
}

function attendanceBusinessDate(date) {
  const businessDate = new Date(date);
  businessDate.setHours(businessDate.getHours() - 6);
  return startOfDay(businessDate);
}

function attendanceBusinessDateInput(timestamp) {
  return dateInputValue(attendanceBusinessDate(new Date(timestamp)));
}

function attendanceRowBusinessDate(row) {
  const timestamp = row.in?.timestamp || row.out?.timestamp || row.sortDate;
  return attendanceBusinessDate(new Date(timestamp));
}

function italianDateInputValue(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function monthInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dateFromInput(value, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function dateFromItalianInput(value, endOfDay = false) {
  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const italianMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  let date = null;
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    date = new Date(year, month - 1, day);
  } else if (italianMatch) {
    const [, day, month, year] = italianMatch.map(Number);
    date = new Date(year, month - 1, day);
  }
  if (!date || Number.isNaN(date.getTime())) date = new Date();
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function setAttendancePeriod(period = document.querySelector("#attendancePeriod").value) {
  const now = new Date();
  let from = new Date(now);
  let to = new Date(now);
  if (period === "open") {
    const firstOpen = openAttendanceRows()[0];
    from = firstOpen ? new Date(firstOpen.in.timestamp) : new Date(now);
  } else if (period === "week") {
    const day = (now.getDay() + 6) % 7;
    from = addDays(now, -day);
    to = addDays(from, 6);
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  document.querySelector("#attendanceFrom").value = italianDateInputValue(from);
  document.querySelector("#attendanceTo").value = italianDateInputValue(to);
  document.querySelector("#attendanceMonth").value = monthInputValue(from);
}

function attendanceRange() {
  const fromValue = document.querySelector("#attendanceFrom").value || italianDateInputValue(new Date());
  const toValue = document.querySelector("#attendanceTo").value || fromValue;
  return {
    from: dateFromItalianInput(fromValue),
    to: dateFromItalianInput(toValue, true)
  };
}

function setAttendanceMonth(value = document.querySelector("#attendanceMonth").value) {
  if (!value) return;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return;
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  document.querySelector("#attendancePeriod").value = "month";
  document.querySelector("#attendanceFrom").value = italianDateInputValue(from);
  document.querySelector("#attendanceTo").value = italianDateInputValue(to);
}

function populateAttendanceEmployeeFilter() {
  const current = document.querySelector("#attendanceEmployeeFilter").value || "all";
  document.querySelector("#attendanceEmployeeFilter").innerHTML = [
    '<option value="all">Tutti</option>',
    ...sortedEmployees(employees, { includeArchived: true }).map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}${isArchivedEmployee(employee) ? " (archiviato)" : ""}</option>`)
  ].join("");
  document.querySelector("#attendanceEmployeeFilter").value = employees.some((employee) => employee.id === current) ? current : "all";
}

function attendanceDuration(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, new Date(end) - new Date(start)) / 3600000;
}

function formatHours(value) {
  return `${value.toFixed(value % 1 ? 1 : 0)}h`;
}

function formatAttendanceExportHours(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1")
    .replace(".", ",");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function parseItalianNumber(value) {
  const normalized = String(value || "").trim().replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function revenueScopeKey(scope) {
  return `${scope.kind}:${scope.name}`;
}

function revenueScopes() {
  const groupScopes = (companySettings.workplaceGroups || []).map((group) => ({
    kind: "group",
    name: group.name,
    label: group.name,
    workplaces: group.workplaces
  }));
  const workplaceScopes = (companySettings.workplaces || []).map((workplace) => ({
    kind: "workplace",
    name: workplace,
    label: workplace,
    workplaces: [workplace]
  }));
  return [...groupScopes, ...workplaceScopes];
}

function defaultRevenueScope() {
  return revenueScopes().find((scope) => scope.kind === "workplace" && scope.name === defaultWorkplace()) || revenueScopes()[0] || {
    kind: "workplace",
    name: defaultWorkplace(),
    label: defaultWorkplace(),
    workplaces: [defaultWorkplace()]
  };
}

function revenueScopeFromKey(key = "") {
  return revenueScopes().find((scope) => revenueScopeKey(scope) === key) || defaultRevenueScope();
}

function selectedRevenueScope() {
  const select = document.querySelector("#attendanceRevenueScope");
  return revenueScopeFromKey(select?.value || revenueScopeKey(defaultRevenueScope()));
}

function attendanceRevenueEntry(dateInput, scope = selectedRevenueScope()) {
  const day = attendanceRevenue?.[dateInput];
  if (!day) return {};
  const scopeKey = revenueScopeKey(scope);
  if (day.scopes && typeof day.scopes === "object") return day.scopes[scopeKey] || {};
  if (Number(day.amount || 0) && scopeKey === revenueScopeKey(defaultRevenueScope())) return day;
  return {};
}

function attendanceRevenueValue(dateInput, scope = selectedRevenueScope()) {
  const direct = Number(attendanceRevenueEntry(dateInput, scope).amount || 0);
  if (direct || scope.kind !== "group") return direct;
  const day = attendanceRevenue?.[dateInput];
  if (!day?.scopes || typeof day.scopes !== "object") return 0;
  const scopePlaces = new Set((scope.workplaces || []).map(normalizedPlaceName));
  return Object.values(day.scopes).reduce((sum, entry) => {
    if (!entry || String(entry.scopeKey || "").startsWith("group:")) return sum;
    const entryPlaces = Array.isArray(entry.workplaces) && entry.workplaces.length
      ? entry.workplaces
      : [String(entry.scopeLabel || "").trim()];
    const matches = entryPlaces.some((workplace) => scopePlaces.has(normalizedPlaceName(workplace)));
    return matches ? sum + Number(entry.amount || 0) : sum;
  }, 0);
}

function attendanceRevenueTotal(from, to, scope = selectedRevenueScope()) {
  const periodStart = startOfDay(from);
  const periodEnd = startOfDay(to);
  return Object.entries(attendanceRevenue || {}).reduce((sum, [dateInput, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput) || !entry) return sum;
    const date = dateFromInput(dateInput);
    if (date < periodStart || date > periodEnd) return sum;
    return sum + attendanceRevenueValue(dateInput, scope);
  }, 0);
}

function attendanceAbsenceLabel(reason = "non_lavorato") {
  return {
    malattia: "Malattia",
    assenza: "Assenza",
    permesso: "Permesso",
    non_lavorato: "Non lavorato",
    altro: "Assenza"
  }[reason] || "Non lavorato";
}

function showAppNotice(message, type = "success") {
  const existing = document.querySelector(".app-notice");
  if (existing) existing.remove();
  const notice = document.createElement("div");
  notice.className = `app-notice ${type}`;
  notice.textContent = message;
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 3200);
}

function filteredEmployees() {
  if (appMode === "employee") {
    return employees.filter((employee) => employee.id === activeEmployeeId);
  }
  const query = searchInput.value.trim().toLowerCase();
  const role = roleFilter.value;
  return activeEmployees().filter((employee) => {
    const roleMatch = role === "all" || employee.role === role;
    const shiftText = visibleWeekShifts()
      .filter((shift) => shift.employeeId === employee.id)
      .map((shift) => `${shift.type} ${shift.workplace} ${shift.note}`)
      .join(" ")
      .toLowerCase();
    const queryMatch = !query || employee.name.toLowerCase().includes(query) || shiftText.includes(query);
    return roleMatch && queryMatch;
  }).sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
}

function visibleShifts(employeeIds) {
  const ids = new Set(employeeIds);
  return visibleWeekShifts().filter((shift) => ids.has(shift.employeeId));
}

function renderHeader(includeEmployeeColumn) {
  const first = includeEmployeeColumn ? '<div class="header-cell">Dipendenti</div>' : "";
  return `
    <div class="grid-header">
      ${first}
      ${weekDays.map((day) => `
        <div class="header-cell">
          ${day.today ? `<span class="today-pill">${day.label.split(" ")[0]}</span>` : ""}
          <span>${day.today ? day.label.split(" ").slice(1).join(" ") : day.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderShiftCard(shift, showEmployee = false) {
  const employee = getEmployee(shift.employeeId);
  const employeeName = employee ? employee.name : "Dipendente";
  const time = shift.start && shift.end ? `${shift.start} - ${shift.end}` : "";
  const canEditShift = canManage();
  const className = {
    day: "shift-day",
    open: "shift-open",
    evening: "shift-evening",
    rest: "shift-rest",
    leave: "shift-leave"
  }[shift.category] || "shift-leave";

  return `
    <article class="shift-card ${className}" draggable="${canEditShift ? "true" : "false"}" data-shift-id="${shift.id}" style="background:${escapeHtml(shift.color || shiftPresets[shift.type]?.color || "#95ddd8")}" title="${escapeHtml(employeeName)} - ${escapeHtml(shift.type)}">
      <div class="shift-card-head">
        <strong>${shift.category === "rest" ? "zᶻ " : ""}${escapeHtml(shift.type)}</strong>
        ${canEditShift ? `<div class="shift-actions">
          <button class="copy-shift" type="button" data-copy-shift="${shift.id}" aria-label="Copia turno">⧉</button>
          <button class="delete-shift" type="button" data-delete-shift="${shift.id}" aria-label="Elimina turno">×</button>
        </div>` : ""}
      </div>
      ${time ? `<p>${escapeHtml(time)}</p>` : ""}
      <p>${showEmployee ? escapeHtml(employeeName) : escapeHtml(shift.workplace || defaultWorkplace())}</p>
      ${shift.note ? `<small>${escapeHtml(shift.note)}</small>` : ""}
    </article>
  `;
}

function renderInlineRequestCard(request, showEmployee = false) {
  const employee = getEmployee(request.employeeId);
  const statusLabels = { pending: "In attesa", approved: "Approvata", rejected: "Rifiutata" };
  const dayLabel = requestDayLabel(request);
  const createdLabel = requestCreatedLabel(request);
  const time = request.type === "Mezza giornata" && request.startTime && request.endTime
    ? `${request.startTime} - ${request.endTime}`
    : "";
  const actions = canManage()
    ? `<button class="delete-request inline-delete-request" type="button" data-request-id="${request.id}" aria-label="Elimina richiesta">Elimina</button>`
    : "";
  return `
    <article class="request-card-inline request-${request.status}">
      <strong>Richiesta: ${escapeHtml(request.type)}</strong>
      ${dayLabel ? `<p>${escapeHtml(dayLabel)}</p>` : ""}
      ${time ? `<p>${escapeHtml(time)}</p>` : ""}
      <p>${escapeHtml(statusLabels[request.status] || request.status)}</p>
      <small class="request-created-at">${escapeHtml(createdLabel)}</small>
      ${showEmployee && employee ? `<p>${escapeHtml(employee.name)}</p>` : ""}
      ${request.note ? `<small>${escapeHtml(request.note)}</small>` : ""}
      ${actions}
    </article>
  `;
}

function renderEmployeeMobileSchedule(employee) {
  const employeeShifts = visibleWeekShifts().filter((shift) => shift.employeeId === employee.id);
  const employeeRequests = timeOffRequests.filter((request) => request.employeeId === employee.id && request.weekOffset === weekOffset);
  const workingHours = employeeShifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
  const rows = weekDays.map((day) => {
    const dayIsVisible = isPeriodPublished(day.key);
    const dayShifts = employeeShifts.filter((shift) => shift.day === day.key);
    const dayRequests = employeeRequests.filter((request) => requestIncludesDay(request, day.key));
    const content = dayIsVisible
      ? `${dayShifts.length ? dayShifts.map((shift) => renderShiftCard(shift)).join("") : '<div class="day-empty">Nessun turno</div>'}${dayRequests.map((request) => renderInlineRequestCard(request)).join("")}`
      : '<div class="day-empty">Non pubblicato</div>';
    return `
      <section class="mobile-day-card ${day.today ? "today" : ""}">
        <div class="mobile-day-head">
          <strong>${escapeHtml(day.label)}</strong>
          <span>${dayIsVisible ? "Pubblicato" : "Bozza"}</span>
        </div>
        ${content}
      </section>
    `;
  }).join("");

  employeeView.innerHTML = `
    <div class="employee-mobile-schedule">
      <section class="mobile-employee-summary">
        <div class="avatar" style="background:${employee.color}">${initials(employee.name)}</div>
        <div>
          <strong>${escapeHtml(employee.name)}</strong>
          <span>${escapeHtml(employee.role)} · ${workingHours.toFixed(workingHours % 1 ? 1 : 0)}h programmate</span>
        </div>
      </section>
      ${rows}
    </div>
  `;
}

function renderEmployeeView() {
  const people = filteredEmployees();
  if (appMode === "employee" && !isWeekPublished() && !hasAnyPublishedDay()) {
    employeeView.innerHTML = `<div class="unpublished-notice">Questa settimana non è ancora stata pubblicata dal manager.</div>`;
    return;
  }
  if (appMode === "employee") {
    const employee = getEmployee(activeEmployeeId);
    if (employee) renderEmployeeMobileSchedule(employee);
    return;
  }
  const rows = people.map((employee) => {
    const employeeShifts = visibleWeekShifts().filter((shift) => shift.employeeId === employee.id);
    const employeeRequests = timeOffRequests.filter((request) => request.employeeId === employee.id && request.weekOffset === weekOffset);
    const hours = employeeShifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
    const balance = hours - employee.target;
    const cells = weekDays.map((day) => {
      const dayShifts = employeeShifts.filter((shift) => shift.day === day.key);
      const dayRequests = employeeRequests.filter((request) => requestIncludesDay(request, day.key));
      const dayIsVisible = appMode !== "employee" || isPeriodPublished(day.key);
      return `
        <div class="schedule-cell drop-zone ${dayShifts.length ? "has-shifts" : "empty-cell"}" data-employee-id="${employee.id}" data-day="${day.key}">
          ${canManage() ? `<button class="add-cell-shift" type="button" data-add-employee="${employee.id}" data-add-day="${day.key}" aria-label="Aggiungi turno per ${escapeHtml(employee.name)} ${escapeHtml(day.short)}">+</button>` : ""}
          ${dayIsVisible ? dayShifts.map((shift) => renderShiftCard(shift)).join("") : '<div class="day-empty">Non pubblicato</div>'}
          ${dayIsVisible ? dayRequests.map((request) => renderInlineRequestCard(request)).join("") : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="employee-row">
        <div class="employee-cell">
          <div class="avatar" style="background:${employee.color}">${initials(employee.name)}</div>
          <div>
            <div class="employee-name">${escapeHtml(employee.name)}</div>
            <div class="employee-role">${escapeHtml(employee.role)}</div>
            <div class="employee-hours"><strong>${hours.toFixed(hours % 1 ? 1 : 0)}h</strong> / ${employee.target}h</div>
            <div class="employee-hours">${balance >= 0 ? "+" : ""}${balance.toFixed(1)}h</div>
          </div>
        </div>
        ${cells}
      </div>
    `;
  }).join("");

  employeeView.innerHTML = `<div class="employee-grid">${renderHeader(true)}${rows}</div>`;
}

function renderDayView() {
  const people = filteredEmployees();
  if ((appMode === "employee" || canUseSupervisorView()) && !isWeekPublished() && !hasAnyPublishedDay()) {
    dayView.innerHTML = `<div class="unpublished-notice">Questa settimana non è ancora stata pubblicata dal manager.</div>`;
    return;
  }
  const employeeIds = people.map((employee) => employee.id);
  const visibleEmployeeIds = new Set(employeeIds);
  const allVisible = visibleShifts(employeeIds)
    .filter((shift) => shift.category !== "rest" && shift.category !== "leave")
    .sort((a, b) => (timeToMinutes(a.start) || 0) - (timeToMinutes(b.start) || 0));
  const visibleRequests = timeOffRequests.filter((request) => request.weekOffset === weekOffset && visibleEmployeeIds.has(request.employeeId));
  const workplaceGroups = groupShiftsByWorkplace(allVisible);

  const workplaceSections = workplaceGroups.map((group) => {
    const dayColumns = weekDays.map((day) => {
      if ((appMode === "employee" || canUseSupervisorView()) && !isPeriodPublished(day.key)) {
        return `
          <div class="day-column ${day.today ? "today" : ""}" data-day="${day.key}" data-workplace="${escapeHtml(group.workplace)}">
            <div class="day-empty">Non pubblicato</div>
          </div>
        `;
      }
      const dayShifts = group.shifts
        .filter((shift) => shift.day === day.key)
        .sort((a, b) => (timeToMinutes(a.start) || 0) - (timeToMinutes(b.start) || 0));
      return `
        <div class="day-column drop-zone workplace-day-column ${day.today ? "today" : ""}" data-day="${day.key}" data-workplace="${escapeHtml(group.workplace)}">
          ${dayShifts.length
            ? dayShifts.map((shift) => renderShiftCard(shift, true)).join("")
            : '<div class="day-empty compact-empty">Nessun turno</div>'}
        </div>
      `;
    }).join("");
    return `
      <section class="day-workplace-section">
        <div class="day-workplace-section-title">
          <span>${escapeHtml(group.workplace)}</span>
          <small>${group.shifts.length} turni</small>
        </div>
        <div class="workplace-week-grid">${dayColumns}</div>
      </section>
    `;
  }).join("");

  const requestSection = visibleRequests.length ? `
    <section class="day-workplace-section request-day-section">
      <div class="day-workplace-section-title">
        <span>Richieste</span>
        <small>${visibleRequests.length}</small>
      </div>
      <div class="workplace-week-grid">
        ${weekDays.map((day) => {
          const dayRequests = visibleRequests.filter((request) => requestIncludesDay(request, day.key));
          return `
            <div class="day-column ${day.today ? "today" : ""}" data-day="${day.key}">
              ${dayRequests.length
                ? dayRequests.map((request) => renderInlineRequestCard(request, true)).join("")
                : '<div class="day-empty compact-empty">Nessuna richiesta</div>'}
            </div>
          `;
        }).join("")}
      </div>
    </section>
  ` : "";

  const emptySection = !workplaceGroups.length && !visibleRequests.length ? `
    <section class="day-workplace-section">
      <div class="workplace-week-grid">
        ${weekDays.map((day) => `
          <div class="day-column drop-zone ${day.today ? "today" : ""}" data-day="${day.key}">
            <div class="day-empty">Nessun turno pianificato</div>
          </div>
        `).join("")}
      </div>
    </section>
  ` : "";

  dayView.innerHTML = `<div class="day-view-inner day-grid workplace-day-view">${renderHeader(false)}${workplaceSections}${requestSection}${emptySection}</div>`;
}

function groupShiftsByWorkplace(weekShifts) {
  const groups = new Map();
  weekShifts.forEach((shift) => {
    const workplace = shift.workplace || defaultWorkplace();
    if (!groups.has(workplace)) groups.set(workplace, []);
    groups.get(workplace).push(shift);
  });
  return [...groups.entries()]
    .map(([workplace, shifts]) => ({
      workplace,
      shifts: shifts.sort((a, b) => shiftSortValue(a) - shiftSortValue(b))
    }))
    .sort((a, b) => {
      const firstA = a.shifts[0] ? shiftSortValue(a.shifts[0]) : 0;
      const firstB = b.shifts[0] ? shiftSortValue(b.shifts[0]) : 0;
      return firstA - firstB || a.workplace.localeCompare(b.workplace, "it", { sensitivity: "base" });
    });
}

function renderStats() {
  const people = filteredEmployees();
  const employeeIds = people.map((employee) => employee.id);
  const shownShifts = visibleShifts(employeeIds);
  const workingShifts = shownShifts.filter((shift) => shift.category !== "rest" && shift.category !== "leave");
  const rests = shownShifts.filter((shift) => shift.category === "rest").length;
  const hours = workingShifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
  document.querySelector("#totalShifts").textContent = String(workingShifts.length);
  document.querySelector("#totalHours").textContent = `${hours.toFixed(hours % 1 ? 1 : 0)}h`;
  document.querySelector("#totalRest").textContent = String(rests);
  document.querySelector("#avgCoverage").textContent = `${(workingShifts.length / weekDays.length).toFixed(1)}/g`;
}

function renderWeekLabel() {
  weekLabel.textContent = formatWeekRange();
}

function render() {
  if (canUseSupervisorView()) currentView = "day";
  updateAccountUi();
  renderManagerDashboard();
  renderWeekLabel();
  renderStats();
  renderEmployeeView();
  renderDayView();
  renderPortal();
  renderManagerRequests();
  renderTaskVerificationPanel();
  employeeView.classList.toggle("hidden", currentView !== "employee");
  dayView.classList.toggle("hidden", currentView !== "day");
  bindShiftInteractions();
  applyCapabilitiesUi();
}

function renderManagerDashboard() {
  const dashboard = document.querySelector("#managerDashboard");
  dashboard.classList.toggle("hidden", !canManage());
  if (!canManage()) return;
  const pending = timeOffRequests.filter((request) => request.status === "pending").length;
  const workingShifts = shifts.filter((shift) => shift.category !== "rest" && shift.category !== "leave").length;
  const defaultPins = employees.filter((employee) => !employee.hasPin).length;
  document.querySelector("#dashPendingRequests").textContent = String(pending);
  document.querySelector("#dashWeekShifts").textContent = String(workingShifts);
  document.querySelector("#dashEmployees").textContent = String(employees.length);
  document.querySelector("#dashDefaultPins").textContent = String(defaultPins);
  refreshLastBackupSummary();
}

let lastBackupSummaryLoading = false;

async function refreshLastBackupSummary() {
  if (!backendEnabled || currentUser?.role !== "manager" || lastBackupSummaryLoading || !hasFeature("backup")) return;
  lastBackupSummaryLoading = true;
  try {
    const payload = await apiRequest("/api/backups");
    const latest = payload.backups[0];
    document.querySelector("#dashLastBackup").textContent = latest
      ? new Date(latest.createdAt).toLocaleString("it-IT")
      : "Nessun backup";
  } catch {
    document.querySelector("#dashLastBackup").textContent = "Non disponibile";
  } finally {
    lastBackupSummaryLoading = false;
  }
}

function cloneShift(shift, overrides = {}) {
  shifts.push({
    ...shift,
    ...overrides,
    id: `s${Date.now()}-${Math.random().toString(16).slice(2)}`
  });
  saveState();
}

function findShiftEntry(shiftId) {
  const currentShift = shifts.find((item) => item.id === shiftId);
  if (currentShift) return { shift: currentShift, weekOffset };
  for (const [offset, weekShifts] of Object.entries(shiftsByWeek || {})) {
    const shift = (weekShifts || []).find((item) => item.id === shiftId);
    if (shift) return { shift, weekOffset: Number(offset) };
  }
  return null;
}

function moveOrCopyShift(shiftId, target) {
  const entry = findShiftEntry(shiftId);
  if (!entry) return;
  const shift = entry.shift;
  const employeeId = target.employeeId || shift.employeeId;
  const day = target.day || shift.day;
  const workplace = target.workplace || shift.workplace || defaultWorkplace();

  if (target.copy) {
    cloneShift(shift, { employeeId, day, workplace });
  } else {
    shift.employeeId = employeeId;
    shift.day = day;
    shift.workplace = workplace;
  }
  render();
  saveState();
}

function bindShiftInteractions() {
  document.querySelectorAll(".shift-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (!canManage()) return;
      openShiftDialogForEdit(card.dataset.shiftId);
    });

    card.addEventListener("dragstart", (event) => {
      if (!canManage()) {
        event.preventDefault();
        return;
      }
      draggedShiftId = card.dataset.shiftId;
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setData("text/plain", draggedShiftId);
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      draggedShiftId = null;
      card.classList.remove("dragging");
      document.querySelectorAll(".drop-zone.active-drop").forEach((zone) => zone.classList.remove("active-drop"));
    });
  });

  document.querySelectorAll(".drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      if (!canManage()) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = event.altKey || event.ctrlKey || event.metaKey ? "copy" : "move";
      zone.classList.add("active-drop");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("active-drop");
    });

    zone.addEventListener("drop", (event) => {
      if (!canManage()) return;
      event.preventDefault();
      zone.classList.remove("active-drop");
      const shiftId = event.dataTransfer.getData("text/plain") || draggedShiftId;
      moveOrCopyShift(shiftId, {
        employeeId: zone.dataset.employeeId,
        day: zone.dataset.day,
        workplace: zone.dataset.workplace,
        copy: event.altKey || event.ctrlKey || event.metaKey
      });
    });
  });

  document.querySelectorAll(".add-cell-shift").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!canManage()) return;
      openShiftDialog(button.dataset.addEmployee, button.dataset.addDay);
    });
  });

  document.querySelectorAll(".copy-shift").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!canManage()) return;
      const entry = findShiftEntry(button.dataset.copyShift);
      if (!entry) return;
      cloneShift(entry.shift);
      render();
    });
  });

  document.querySelectorAll(".delete-shift").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!canManage()) return;
      const shiftId = button.dataset.deleteShift;
      if (backendEnabled && currentUser?.role === "manager") {
        try {
          const payload = await apiRequest(`/api/shifts/${shiftId}?weekOffset=${weekOffset}`, { method: "DELETE" });
          applyState(payload.state);
          applyUser(currentUser);
          populateForm();
          render();
          showAppNotice("Turno eliminato dal server.");
        } catch (error) {
          showAppNotice(error.message || "Turno non eliminato. Ricarica la pagina e riprova.", "error");
        }
        return;
      }
      shifts = shifts.filter((shift) => shift.id !== shiftId);
      render();
      saveState();
    });
  });
}

function populateForm() {
  const orderedEmployees = sortedEmployees();
  const roleOptions = companySettings.roles
    .map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`)
    .join("");
  document.querySelector("#employeeSelect").innerHTML = orderedEmployees
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("");
  document.querySelector("#employeeAccountSelect").innerHTML = orderedEmployees
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("");
  const taskEmployeeOptions = orderedEmployees
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("");
  document.querySelector("#taskAssigneeInput").innerHTML = `<option value="">Scegli dipendente</option>${taskEmployeeOptions}`;
  document.querySelector("#taskVerifierInput").innerHTML = `<option value="">Manager / capoturno</option>${orderedEmployees
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("")}`;
  document.querySelector("#taskDayInput").innerHTML = `<option value="all">Tutti i giorni</option>${dayKeys
    .map((key) => `<option value="${key}">${escapeHtml(dayLabelFromKey(key))}</option>`)
    .join("")}`;
  document.querySelector("#loginEmployee").innerHTML = orderedEmployees
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("");
  document.querySelector("#daySelect").innerHTML = weekDays
    .map((day) => `<option value="${day.key}">${escapeHtml(day.short)}</option>`)
    .join("");
  document.querySelector("#dayPublicationSelect").innerHTML = weekDays
    .map((day) => `<option value="${day.key}">${escapeHtml(day.label)}</option>`)
    .join("");
  document.querySelector("#roleFilter").innerHTML = `<option value="all">Tutti</option>${roleOptions}`;
  document.querySelector("#newEmployeeRole").innerHTML = roleOptions;
  document.querySelector("#taskRoleInput").innerHTML = `<option value="all">Tutti i reparti</option>${roleOptions}`;
  document.querySelector("#taskWorkplaceInput").innerHTML = `<option value="all">Tutti i luoghi</option>${companySettings.workplaces
    .map((workplace) => `<option value="${escapeHtml(workplace)}">${escapeHtml(workplace)}</option>`)
    .join("")}`;
  document.querySelector("#taskShiftTypeInput").innerHTML = `<option value="all">Tutti i turni</option><option value="day">Tutti i diurni</option><option value="evening">Tutti i serali</option>${workingShiftTypes()
    .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
    .join("")}`;
  document.querySelector("#workplaceOptions").innerHTML = companySettings.workplaces
    .map((workplace) => `<option value="${escapeHtml(workplace)}"></option>`)
    .join("");
  populateRequestWeekOptions();
  populateRequestDayOptions(weekOffset);
  populatePresetOptions();
}

function populateRequestWeekOptions(selectedOffset = weekOffset) {
  const options = [];
  for (let offset = weekOffset - 4; offset <= weekOffset + 26; offset += 1) {
    options.push(`<option value="${offset}">${escapeHtml(weekOptionLabel(offset))}</option>`);
  }
  document.querySelector("#requestWeek").innerHTML = options.join("");
  document.querySelector("#requestWeek").value = String(selectedOffset);
}

function populateRequestDayOptions(offset = Number(document.querySelector("#requestWeek").value)) {
  const days = buildWeekDays(offset);
  const options = days
    .map((day) => `<option value="${day.key}">${escapeHtml(day.label)}</option>`)
    .join("");
  document.querySelector("#requestDay").innerHTML = options;
  document.querySelector("#requestEndDay").innerHTML = options;
}

function updateAccountUi() {
  const brandName = document.querySelector("#brandCompanyName");
  const brandLogo = document.querySelector("#brandCompanyLogo");
  const showMurettoLogo = shouldShowMurettoLogo();
  brandName.textContent = companyLabel();
  brandName.classList.toggle("hidden", showMurettoLogo);
  brandLogo?.classList.toggle("hidden", !showMurettoLogo);
  document.body.classList.toggle("employee-mode", appMode === "employee");
  document.body.classList.toggle("manager-mode", canManage());
  document.body.classList.toggle("supervisor-mode", canUseSupervisorView());
  document.querySelector("#roleMode").value = appMode;
  document.querySelector("#employeeAccountSelect").value = activeEmployeeId;
  document.querySelector(".employee-account-field").classList.toggle("hidden", appMode !== "employee" && appMode !== "supervisor");
  document.querySelector(".toolbar").classList.toggle("manager-only-hidden", !canManage());
  document.querySelector("#weekPublication").classList.toggle("hidden", !canManage());
  document.querySelector("#openTaskManager").classList.toggle("hidden", !canManage());
  document.querySelector("#logoutButton").classList.toggle("hidden", !backendEnabled || !currentUser);
  document.querySelector("#roleMode").disabled = backendEnabled && Boolean(currentUser);
  document.querySelector("#employeeAccountSelect").disabled = backendEnabled && (currentUser?.role === "employee" || currentUser?.role === "supervisor");
  document.querySelector("#managerRequests").classList.toggle("hidden", !canManage() || !timeOffRequests.some((request) => request.status === "pending"));
  document.querySelectorAll(".segment").forEach((segment) => {
    const disabled = canUseSupervisorView() && segment.dataset.view !== "day";
    segment.disabled = disabled;
    segment.classList.toggle("hidden", disabled);
    if (canUseSupervisorView() && segment.dataset.view === "day") {
      segment.classList.add("active");
      segment.setAttribute("aria-selected", "true");
    }
  });
  const activeEmployee = getEmployee(activeEmployeeId);
  document.querySelector("#accountSummary").textContent = canManage()
    ? "Vista manager"
    : canUseSupervisorView()
      ? `Vista capoturno: ${activeEmployee ? activeEmployee.name : ""}`
    : `Vista dipendente: ${activeEmployee ? activeEmployee.name : ""}`;
  renderWeekPublicationStatus();
}

function renderWeekPublicationStatus() {
  const container = document.querySelector("#weekPublication");
  const status = document.querySelector("#weekPublicationStatus");
  const button = document.querySelector("#toggleWeekPublication");
  const daySelect = document.querySelector("#dayPublicationSelect");
  const dayButton = document.querySelector("#toggleDayPublication");
  const published = isWeekPublished();
  const selectedDay = daySelect.value || weekDays[0]?.key || "mon";
  const selectedDayPublished = isDayPublished(selectedDay);
  container.classList.toggle("published", published);
  status.textContent = published ? "Pubblicata" : "Bozza";
  button.textContent = published ? "Nascondi settimana" : "Pubblica settimana";
  dayButton.textContent = selectedDayPublished ? "Nascondi giorno" : "Pubblica giorno";
}

async function toggleWeekPublication() {
  if (!canManage()) return;
  const nextPublished = !isWeekPublished();
  publishedWeeks = {
    ...publishedWeeks,
    [weekOffset]: nextPublished
  };
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest(`/api/weeks/${weekOffset}/publication`, {
      method: "PATCH",
      body: JSON.stringify({ published: nextPublished })
    });
    applyState(payload.state);
    applyUser(currentUser);
  } else {
    saveState();
  }
  render();
}

async function toggleDayPublication() {
  if (!canManage()) return;
  const dayKey = document.querySelector("#dayPublicationSelect").value;
  const nextPublished = !isDayPublished(dayKey);
  publishedDays = {
    ...publishedDays,
    [weekOffset]: {
      ...(publishedDays[String(weekOffset)] || publishedDays[weekOffset] || {}),
      [dayKey]: nextPublished
    }
  };
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest(`/api/weeks/${weekOffset}/days/${dayKey}/publication`, {
      method: "PATCH",
      body: JSON.stringify({ published: nextPublished })
    });
    applyState(payload.state);
    applyUser(currentUser);
  } else {
    saveState();
  }
  render();
}

function renderPortal() {
  const portal = document.querySelector("#employeePortal");
  portal.classList.toggle("hidden", !canUseEmployeeArea());
  if (!canUseEmployeeArea()) return;
  const employee = getEmployee(activeEmployeeId);
  document.querySelector("#portalEmployeeName").textContent = employee ? employee.name : "I miei turni";
  const requests = timeOffRequests.filter((request) => request.employeeId === activeEmployeeId);
  const latest = latestAttendance();
  const todayRecords = todayAttendanceRecords();
  const openStatus = latest?.type === "in";
  const nextShift = nextEmployeeShift();
  const nextShiftDay = nextShift ? buildWeekDays(nextShift.weekOffset).find((day) => day.key === nextShift.day) : null;
  const nextShiftWeekLabel = nextShift ? formatWeekRangeForOffset(nextShift.weekOffset) : formatWeekRange();
  const attendanceHtml = `
    <div class="attendance-card ${openStatus ? "active" : ""}">
      <div>
        <span>Timbratura</span>
        <strong>${openStatus ? "Turno aperto" : "Fuori servizio"}</strong>
        <small>${latest ? `Ultima: ${attendanceLabel(latest.type)} ${attendanceTime(latest.timestamp)}` : "Nessuna timbratura registrata"}</small>
      </div>
      <div class="attendance-mini-list">
        ${todayRecords.length
          ? todayRecords.map((record) => `<span>${attendanceLabel(record.type)} ${attendanceTime(record.timestamp)}</span>`).join("")
          : "<span>Oggi nessuna timbratura</span>"}
        <button class="primary-button scan-qr-button" type="button">${openStatus ? "Chiudi con QR" : "Timbra con QR"}</button>
        <a class="mini-action manual-attendance-link" href="/manual-attendance.html">Richiedi manuale</a>
      </div>
    </div>
  `;
  const nextShiftHtml = nextShift ? `
    <div class="next-shift-card">
      <div>
        <span>Prossimo turno</span>
        <strong>${escapeHtml(nextShift.type)} · ${escapeHtml(nextShift.start || "-")}${nextShift.end ? `-${escapeHtml(nextShift.end)}` : ""}</strong>
        <small>${escapeHtml(nextShiftDay ? nextShiftDay.label : nextShift.day)}${nextShift.workplace ? ` · ${escapeHtml(nextShift.workplace)}` : ""}</small>
      </div>
      <small>${escapeHtml(nextShiftWeekLabel)}</small>
    </div>
  ` : `
    <div class="next-shift-card">
      <div>
        <span>Prossimo turno</span>
        <strong>Nessun turno pubblicato</strong>
        <small>${escapeHtml(formatWeekRange())}</small>
      </div>
    </div>
  `;
  const visibilityNotice = isWeekPublished()
    ? ""
    : hasAnyPublishedDay()
      ? '<div class="unpublished-notice">Sono visibili solo i giorni già pubblicati dal manager. Puoi comunque inviare richieste.</div>'
      : '<div class="unpublished-notice">La settimana selezionata non è ancora pubblicata. Puoi comunque inviare richieste.</div>';
  const requestList = requests.length ? requests.map(renderRequestRow).join("") : '<div class="empty-state">Nessuna richiesta inviata.</div>';
  document.querySelector("#myRequests").innerHTML = `${nextShiftHtml}${attendanceHtml}${visibilityNotice}${requestList}`;
  renderMyPayroll();
  renderMyEmployeeDocuments();
  renderEmployeeTasks();
  document.querySelector(".scan-qr-button")?.addEventListener("click", openQrScanner);
}

function payrollMonthLabel(month) {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  if (!year || !monthNumber) return month || "";
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function renderMyPayroll() {
  const container = document.querySelector("#myPayroll");
  if (!container) return;
  const documents = payrollDocuments
    .filter((document) => document.employeeId === activeEmployeeId)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)));
  if (!documents.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <div class="portal-section-head">
      <div>
        <p class="eyebrow">Documenti</p>
        <h3>Le mie buste paga</h3>
      </div>
    </div>
    <div class="payroll-employee-list">
      ${documents.map((document) => `
        <div class="payroll-employee-row">
          <div>
            <strong>${escapeHtml(payrollMonthLabel(document.month))}</strong>
            <small>${document.pageCount || 1} ${Number(document.pageCount) === 1 ? "pagina" : "pagine"}</small>
          </div>
          <a class="primary-link-button" href="/api/payroll/${encodeURIComponent(document.id)}/file" download>Scarica PDF</a>
        </div>
      `).join("")}
    </div>
  `;
}

function documentDateLabel(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return italianDateInputValue(new Date(year, month - 1, day));
}

function employeeDocumentExpiry(document) {
  if (!document.expiryDate) return { label: "Nessuna scadenza", className: "" };
  const expiry = dateFromInput(document.expiryDate, true);
  const days = Math.ceil((expiry - new Date()) / 86_400_000);
  if (days < 0) return { label: `Scaduto il ${documentDateLabel(document.expiryDate)}`, className: "document-expired" };
  if (days <= 30) return { label: `Scade il ${documentDateLabel(document.expiryDate)}`, className: "document-expiring" };
  return { label: `Scade il ${documentDateLabel(document.expiryDate)}`, className: "" };
}

function renderMyEmployeeDocuments() {
  const container = document.querySelector("#myEmployeeDocuments");
  if (!container) return;
  const documents = employeeDocuments
    .filter((document) => document.employeeId === activeEmployeeId)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  if (!documents.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <div class="portal-section-head">
      <div>
        <p class="eyebrow">Archivio personale</p>
        <h3>I miei documenti</h3>
      </div>
    </div>
    <div class="payroll-employee-list">
      ${documents.map((document) => {
        const expiry = employeeDocumentExpiry(document);
        return `
          <div class="payroll-employee-row ${expiry.className}">
            <div>
              <strong>${escapeHtml(document.title || "Documento")}</strong>
              <small>${escapeHtml(document.category || "Altro")} · ${escapeHtml(expiry.label)}</small>
            </div>
            <a class="primary-link-button" href="/api/employee-documents/${encodeURIComponent(document.id)}/file" download>Scarica</a>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderEmployeeTasks() {
  const container = document.querySelector("#myTasks");
  if (!container) return;
  if (!taskModule.enabled) {
    container.innerHTML = "";
    return;
  }
  const today = todayTaskFilter();
  const tasks = (taskAssignments || [])
    .filter((task) => (
      taskEmployeeIds(task).includes(activeEmployeeId) &&
      String(task.weekOffset) === String(today.weekOffset) &&
      task.day === today.day
    ))
    .sort((a, b) => dayKeys.indexOf(a.day) - dayKeys.indexOf(b.day) || (timeToMinutes(a.start) || 0) - (timeToMinutes(b.start) || 0));
  const verificationTasks = (taskAssignments || [])
    .filter((task) => (
      task.verifierEmployeeId === activeEmployeeId &&
      !taskEmployeeIds(task).includes(activeEmployeeId) &&
      String(task.weekOffset) === String(today.weekOffset) &&
      task.day === today.day &&
      task.status === "done"
    ))
    .sort((a, b) => (timeToMinutes(a.start) || 0) - (timeToMinutes(b.start) || 0));
  container.innerHTML = `
    <div class="task-section-title">
      <span>Mansionario di oggi</span>
      <small>${tasks.length} mansioni</small>
    </div>
    <button class="ghost-button enable-task-push" type="button">Attiva promemoria push</button>
    ${tasks.length ? tasks.map(renderEmployeeTaskCard).join("") : '<div class="empty-state">Nessuna mansione assegnata.</div>'}
    ${verificationTasks.length ? `
      <div class="task-section-title">
        <span>Da verificare</span>
        <small>${verificationTasks.length}</small>
      </div>
      ${verificationTasks.map(renderVerificationTaskCard).join("")}
    ` : ""}
  `;
  bindTaskButtons(container);
  container.querySelector(".enable-task-push")?.addEventListener("click", enableTaskPush);
}

function renderEmployeeTaskCard(task) {
  const colleagues = taskEmployeeIds(task)
    .filter((employeeId) => employeeId !== activeEmployeeId)
    .map((employeeId) => getEmployee(employeeId)?.name)
    .filter(Boolean)
    .join(", ");
  return `
    <article class="task-card task-${escapeHtml(task.status)}">
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(taskShiftLabel(task))}${task.workplace ? ` · ${escapeHtml(task.workplace)}` : ""}</span>
        ${colleagues ? `<small>Condivisa con: ${escapeHtml(colleagues)}</small>` : ""}
        ${task.description ? `<small>${escapeHtml(task.description)}</small>` : ""}
        ${task.rejectionNote ? `<small>Da rifare: ${escapeHtml(task.rejectionNote)}</small>` : ""}
      </div>
      <div class="task-card-actions">
        <span class="task-status">${escapeHtml(taskStatusLabel(task.status))}</span>
        ${(task.status === "assigned" || task.status === "rejected") ? `<button class="primary-button complete-task" type="button" data-task-id="${escapeHtml(task.id)}">Completa</button>` : ""}
      </div>
    </article>
  `;
}

function renderManagerRequests() {
  const pending = timeOffRequests.filter((request) => request.status === "pending");
  document.querySelector("#pendingRequests").innerHTML = pending.length ? pending.map(renderRequestRow).join("") : '<div class="empty-state">Nessuna richiesta in attesa.</div>';
  bindRequestActions();
}

function renderTaskVerificationPanel() {
  const panel = document.querySelector("#taskVerificationPanel");
  const list = document.querySelector("#taskVerificationList");
  const visible = taskModule.enabled && (canManage() || canUseSupervisorView()) && currentView === "day";
  panel.classList.toggle("hidden", !visible);
  if (!visible) return;
  const tasks = currentVisibleTasks()
    .filter((task) => canManage() || isTaskForSelectedDay(task))
    .sort((a, b) => dayKeys.indexOf(a.day) - dayKeys.indexOf(b.day) || (timeToMinutes(a.start) || 0) - (timeToMinutes(b.start) || 0));
  list.innerHTML = tasks.length ? tasks.map(renderVerificationTaskCard).join("") : '<div class="empty-state">Nessuna mansione da verificare.</div>';
  bindTaskButtons(list);
}

function renderVerificationTaskCard(task) {
  const employee = getEmployee(task.employeeId);
  const verifier = getEmployee(task.verifierEmployeeId);
  const completedBy = getEmployee(task.completedBy);
  const photo = task.photo?.file ? `<a class="mini-action" href="/api/task-photos/${encodeURIComponent(task.photo.file)}" target="_blank" rel="noopener">Apri foto</a>` : "";
  return `
    <article class="task-card task-${escapeHtml(task.status)}">
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(taskEmployeeNames(task) || employee?.name || "Dipendente")} · ${escapeHtml(taskShiftLabel(task))}${task.workplace ? ` · ${escapeHtml(task.workplace)}` : ""}</span>
        ${completedBy ? `<small>Completata da: ${escapeHtml(completedBy.name)}</small>` : ""}
        ${verifier ? `<small>Verifica: ${escapeHtml(verifier.name)}</small>` : ""}
        ${task.description ? `<small>${escapeHtml(task.description)}</small>` : ""}
        ${task.note ? `<small>Nota: ${escapeHtml(task.note)}</small>` : ""}
        ${task.rejectionNote ? `<small>Rimandata: ${escapeHtml(task.rejectionNote)}</small>` : ""}
      </div>
      <div class="task-card-actions">
        <span class="task-status">${escapeHtml(taskStatusLabel(task.status))}</span>
        ${photo}
        ${task.status === "done" ? `
          <button class="primary-button verify-task" type="button" data-task-id="${escapeHtml(task.id)}">Verifica</button>
          <button class="ghost-button reject-task" type="button" data-task-id="${escapeHtml(task.id)}">Rimanda</button>
        ` : ""}
        ${canManage() ? `<button class="danger-button delete-task-assignment" type="button" data-task-id="${escapeHtml(task.id)}">Elimina</button>` : ""}
      </div>
    </article>
  `;
}

function openTaskManager() {
  if (!canManage()) return;
  resetTaskTemplateForm();
  renderTaskManager();
  taskDialog.showModal();
}

function renderTaskManager() {
  document.querySelector("#taskModuleEnabled").checked = Boolean(taskModule.enabled);
  document.querySelector("#taskSummary").textContent = taskModule.enabled
    ? `${taskTemplates.length} mansioni configurate · ${currentVisibleTasks().length} assegnazioni nella settimana`
    : "Mansionario disattivato: non genera mansioni alla pubblicazione.";
  document.querySelector("#taskTemplateList").innerHTML = taskTemplates.length
    ? taskTemplates.map(renderTaskTemplateRow).join("")
    : '<div class="empty-state">Crea la prima mansione predefinita.</div>';
  document.querySelector("#taskManagerAssignments").innerHTML = currentVisibleTasks().length
    ? `<div class="task-section-title"><span>Assegnazioni settimana</span><small>${currentVisibleTasks().length}</small></div>${currentVisibleTasks().map(renderVerificationTaskCard).join("")}`
    : '<div class="empty-state">Nessuna mansione assegnata nella settimana selezionata.</div>';
  bindTaskButtons(taskDialog);
}

function renderTaskTemplateRow(template) {
  return `
    <article class="task-card">
      <div>
        <strong>${escapeHtml(template.title)}</strong>
        <span>${escapeHtml(template.role === "all" ? "Tutti i reparti" : template.role)} · ${escapeHtml(template.workplace === "all" ? "Tutti i luoghi" : template.workplace)} · ${escapeHtml(template.shiftType === "all" ? "Tutti i turni" : template.shiftType)}</span>
        <small>${template.assignmentMode === "single" ? `Solo ${escapeHtml(getEmployee(template.assigneeEmployeeId)?.name || "dipendente")}` : "Condivisa nel turno"} · ${template.day === "all" ? "Tutti i giorni" : escapeHtml(dayLabelFromKey(template.day))}${template.taskTime ? ` · ore ${escapeHtml(template.taskTime)}` : ""}</small>
        ${template.description ? `<small>${escapeHtml(template.description)}</small>` : ""}
        <small>${escapeHtml(taskProofLabel(template.proofRequired))}${template.verifierEmployeeId ? ` · verifica: ${escapeHtml(getEmployee(template.verifierEmployeeId)?.name || "dipendente")}` : ""} · ${template.active ? "Attiva" : "Non attiva"}</small>
      </div>
      <div class="task-card-actions">
        <button class="ghost-button edit-task-template" type="button" data-template-id="${escapeHtml(template.id)}">Modifica</button>
        <button class="danger-button delete-task-template" type="button" data-template-id="${escapeHtml(template.id)}">Elimina</button>
      </div>
    </article>
  `;
}

function resetTaskTemplateForm() {
  editingTaskTemplateId = null;
  document.querySelector("#taskTitleInput").value = "";
  document.querySelector("#taskDescriptionInput").value = "";
  document.querySelector("#taskRoleInput").value = "all";
  document.querySelector("#taskWorkplaceInput").value = "all";
  document.querySelector("#taskShiftTypeInput").value = "all";
  document.querySelector("#taskAssignmentModeInput").value = "shared";
  document.querySelector("#taskAssigneeInput").value = "";
  document.querySelector("#taskDayInput").value = "all";
  document.querySelector("#taskTimeInput").value = "";
  document.querySelector("#taskVerifierInput").value = "";
  document.querySelector("#taskProofInput").value = "none";
  document.querySelector("#taskActiveInput").checked = true;
  document.querySelector("#cancelTaskEdit").classList.add("hidden");
  document.querySelector("#saveTaskTemplate").textContent = "Salva mansione";
}

function editTaskTemplate(templateId) {
  const template = taskTemplates.find((item) => item.id === templateId);
  if (!template) return;
  editingTaskTemplateId = template.id;
  document.querySelector("#taskTitleInput").value = template.title;
  document.querySelector("#taskDescriptionInput").value = template.description || "";
  document.querySelector("#taskRoleInput").value = template.role || "all";
  document.querySelector("#taskWorkplaceInput").value = template.workplace || "all";
  document.querySelector("#taskShiftTypeInput").value = template.shiftType || "all";
  document.querySelector("#taskAssignmentModeInput").value = template.assignmentMode || "shared";
  document.querySelector("#taskAssigneeInput").value = template.assigneeEmployeeId || "";
  document.querySelector("#taskDayInput").value = template.day || "all";
  document.querySelector("#taskTimeInput").value = template.taskTime || "";
  document.querySelector("#taskVerifierInput").value = template.verifierEmployeeId || "";
  document.querySelector("#taskProofInput").value = template.proofRequired || "none";
  document.querySelector("#taskActiveInput").checked = template.active !== false;
  document.querySelector("#cancelTaskEdit").classList.remove("hidden");
  document.querySelector("#saveTaskTemplate").textContent = "Aggiorna mansione";
}

async function saveTaskTemplate() {
  if (!canManage()) return;
  const template = {
    title: document.querySelector("#taskTitleInput").value.trim(),
    description: document.querySelector("#taskDescriptionInput").value.trim(),
    role: document.querySelector("#taskRoleInput").value,
    workplace: document.querySelector("#taskWorkplaceInput").value,
    shiftType: document.querySelector("#taskShiftTypeInput").value,
    assignmentMode: document.querySelector("#taskAssignmentModeInput").value,
    assigneeEmployeeId: document.querySelector("#taskAssigneeInput").value,
    day: document.querySelector("#taskDayInput").value,
    taskTime: normalizedTimeInput("#taskTimeInput"),
    verifierEmployeeId: document.querySelector("#taskVerifierInput").value,
    proofRequired: document.querySelector("#taskProofInput").value,
    active: document.querySelector("#taskActiveInput").checked
  };
  if (!template.title) {
    alert("Inserisci il titolo della mansione.");
    return;
  }
  if (template.assignmentMode === "single" && !template.assigneeEmployeeId) {
    alert("Scegli il dipendente assegnato alla mansione.");
    return;
  }
  if (document.querySelector("#taskTimeInput").value.trim() && !template.taskTime) {
    alert("Inserisci l'ora mansione in formato 24h, es. 09:30.");
    document.querySelector("#taskTimeInput").focus();
    return;
  }
  if (backendEnabled && currentUser?.role === "manager") {
    const endpoint = editingTaskTemplateId ? `/api/task-templates/${editingTaskTemplateId}` : "/api/task-templates";
    const payload = await apiRequest(endpoint, {
      method: editingTaskTemplateId ? "PATCH" : "POST",
      body: JSON.stringify(template)
    });
    applyState(payload.state);
    applyUser(currentUser);
  } else if (editingTaskTemplateId) {
    taskTemplates = taskTemplates.map((item) => item.id === editingTaskTemplateId ? { ...item, ...template, updatedAt: new Date().toISOString() } : item);
    saveState();
  } else {
    taskTemplates.push({ ...template, id: `tt${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    saveState();
  }
  resetTaskTemplateForm();
  renderTaskManager();
  render();
}

async function deleteTaskTemplate(templateId) {
  if (!canManage() || !confirm("Eliminare questa mansione predefinita?")) return;
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest(`/api/task-templates/${templateId}`, { method: "DELETE" });
    applyState(payload.state);
    applyUser(currentUser);
  } else {
    taskTemplates = taskTemplates.filter((item) => item.id !== templateId);
    taskAssignments = taskAssignments.filter((task) => task.templateId !== templateId || task.status === "done" || task.status === "verified");
    saveState();
  }
  renderTaskManager();
  render();
}

async function toggleTaskModule() {
  if (!canManage()) return;
  const enabled = document.querySelector("#taskModuleEnabled").checked;
  taskModule = { ...taskModule, enabled };
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest("/api/task-module", {
      method: "PATCH",
      body: JSON.stringify(taskModule)
    });
    applyState(payload.state);
    applyUser(currentUser);
  } else {
    saveState();
  }
  renderTaskManager();
  render();
}

async function generateTasksNow() {
  if (!canManage()) return;
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest("/api/task-assignments/generate", {
      method: "POST",
      body: JSON.stringify({ weekOffset })
    });
    applyState(payload.state);
    applyUser(currentUser);
    alert(payload.createdTasks ? `${payload.createdTasks} mansioni generate.` : "Nessuna nuova mansione generata.");
  } else {
    alert("La generazione automatica e disponibile nella versione pubblicata con server.");
  }
  renderTaskManager();
  render();
}

function openTaskComplete(taskId) {
  const task = taskAssignments.find((item) => item.id === taskId);
  if (!task) return;
  completingTaskId = task.id;
  document.querySelector("#taskCompleteTitle").textContent = task.title;
  document.querySelector("#taskCompleteDescription").textContent = `${task.description || "Segna la mansione come completata."} ${task.proofRequired !== "none" ? `Prova richiesta: ${taskProofLabel(task.proofRequired)}.` : ""}`;
  document.querySelector("#taskCompleteNote").value = task.note || "";
  document.querySelector("#taskCompletePhoto").value = "";
  document.querySelector("#taskCompleteError").classList.add("hidden");
  taskCompleteDialog.showModal();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      reject(new Error("Usa una foto JPG, PNG o WEBP."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => compressImageDataUrl(reader.result).then(resolve).catch(reject);
    reader.onerror = () => reject(new Error("Foto non leggibile."));
    reader.readAsDataURL(file);
  });
}

function compressImageDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.78;
      let compressed = canvas.toDataURL("image/jpeg", quality);
      while (compressed.length > 3_600_000 && quality > 0.45) {
        quality -= 0.08;
        compressed = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(compressed);
    };
    image.onerror = () => reject(new Error("Foto non leggibile."));
    image.src = dataUrl;
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function enableTaskPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Questo browser non supporta i promemoria push. Le mansioni restano visibili nell'app.");
      return;
    }
    const keyInfo = await apiRequest("/api/push-public-key");
    if (!keyInfo.enabled || !keyInfo.publicKey) {
      alert("Promemoria push non configurati su Render. Le mansioni restano visibili nell'app.");
      return;
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyInfo.publicKey)
    });
    const payload = await apiRequest("/api/push-subscriptions", {
      method: "POST",
      body: JSON.stringify({ subscription })
    });
    applyState(payload.state);
    applyUser(currentUser);
    alert("Promemoria push attivati.");
  } catch (error) {
    alert(error.message || "Non riesco ad attivare i promemoria push.");
  }
}

async function completeTask(event) {
  event.preventDefault();
  const task = taskAssignments.find((item) => item.id === completingTaskId);
  if (!task) return;
  const note = document.querySelector("#taskCompleteNote").value.trim();
  const file = document.querySelector("#taskCompletePhoto").files[0];
  try {
    if (task.proofRequired === "note" && !note) throw new Error("Questa mansione richiede una nota.");
    if (task.proofRequired === "photo" && !file && !task.photo) throw new Error("Questa mansione richiede una foto.");
    const photoData = await fileToDataUrl(file);
    const payload = await apiRequest(`/api/task-assignments/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "complete", note, photoData })
    });
    applyState(payload.state);
    applyUser(currentUser);
    taskCompleteDialog.close();
    render();
  } catch (error) {
    const message = document.querySelector("#taskCompleteError");
    message.textContent = error.message || "Controlla i dati inseriti.";
    message.classList.remove("hidden");
  }
}

async function verifyTask(taskId) {
  const payload = await apiRequest(`/api/task-assignments/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "verify" })
  });
  applyState(payload.state);
  applyUser(currentUser);
  render();
  if (taskDialog.open) renderTaskManager();
}

async function rejectTask(taskId) {
  const rejectionNote = prompt("Motivo o indicazione per rifarla:") || "";
  const payload = await apiRequest(`/api/task-assignments/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "reject", rejectionNote })
  });
  applyState(payload.state);
  applyUser(currentUser);
  render();
  if (taskDialog.open) renderTaskManager();
}

async function deleteTaskAssignment(taskId) {
  if (!canManage() || !confirm("Eliminare questa mansione assegnata?")) return;
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest(`/api/task-assignments/${taskId}`, { method: "DELETE" });
    applyState(payload.state);
    applyUser(currentUser);
  } else {
    taskAssignments = taskAssignments.filter((task) => task.id !== taskId);
    saveState();
  }
  render();
  if (taskDialog.open) renderTaskManager();
}

function bindTaskButtons(root = document) {
  root.querySelectorAll(".complete-task").forEach((button) => {
    button.addEventListener("click", () => openTaskComplete(button.dataset.taskId));
  });
  root.querySelectorAll(".verify-task").forEach((button) => {
    button.addEventListener("click", () => verifyTask(button.dataset.taskId));
  });
  root.querySelectorAll(".reject-task").forEach((button) => {
    button.addEventListener("click", () => rejectTask(button.dataset.taskId));
  });
  root.querySelectorAll(".edit-task-template").forEach((button) => {
    button.addEventListener("click", () => editTaskTemplate(button.dataset.templateId));
  });
  root.querySelectorAll(".delete-task-template").forEach((button) => {
    button.addEventListener("click", () => deleteTaskTemplate(button.dataset.templateId));
  });
  root.querySelectorAll(".delete-task-assignment").forEach((button) => {
    button.addEventListener("click", () => deleteTaskAssignment(button.dataset.taskId));
  });
}

function renderRequestRow(request) {
  const employee = getEmployee(request.employeeId);
  const dayLabel = requestDayLabel(request);
  const createdLabel = requestCreatedLabel(request);
  const statusLabels = { pending: "In attesa", approved: "Approvata", rejected: "Rifiutata" };
  const requestTime = request.type === "Mezza giornata" && request.startTime && request.endTime
    ? ` · ${request.startTime}-${request.endTime}`
    : "";
  const actions = canManage()
    ? `<div class="request-actions">
        ${request.status === "pending" ? `
          <button class="primary-button approve-request" type="button" data-request-id="${request.id}">Approva</button>
          <button class="ghost-button reject-request" type="button" data-request-id="${request.id}">Rifiuta</button>
        ` : ""}
        <button class="danger-button delete-request" type="button" data-request-id="${request.id}">Elimina</button>
      </div>`
    : "";
  return `
    <div class="request-row request-${request.status}">
      <div>
        <strong>${escapeHtml(request.type)} · ${escapeHtml(dayLabel)}${escapeHtml(requestTime)}</strong>
        <span>${escapeHtml(employee ? employee.name : "Dipendente")} · ${escapeHtml(formatWeekRangeForOffset(request.weekOffset))} · ${statusLabels[request.status]}</span>
        <small class="request-created-at">${escapeHtml(createdLabel)}</small>
        ${request.note ? `<small>${escapeHtml(request.note)}</small>` : ""}
      </div>
      ${actions}
    </div>
  `;
}

function renderRequestCalendar(offset = Number(document.querySelector("#requestWeek").value) || weekOffset) {
  const employee = getEmployee(activeEmployeeId);
  const requestWeekDays = buildWeekDays(offset);
  const employeeShifts = visibleWeekShifts(offset)
    .filter((shift) => shift.employeeId === activeEmployeeId);
  document.querySelector("#requestCalendar").innerHTML = `
    <div class="request-calendar-head">
      <strong>${escapeHtml(employee ? employee.name : "I miei turni")}</strong>
      <span>${escapeHtml(formatWeekRangeForOffset(offset))}</span>
    </div>
    <div class="request-calendar-grid">
      ${requestWeekDays.map((day) => {
        const dayShifts = employeeShifts.filter((shift) => shift.day === day.key);
        return `
          <button class="request-day-card" type="button" data-request-day="${day.key}">
            <strong>${escapeHtml(day.label)}</strong>
            ${dayShifts.length ? dayShifts.map((shift) => {
              const time = shift.start && shift.end ? `${shift.start}-${shift.end}` : "";
              return `<span>${escapeHtml(shift.type)}${time ? ` · ${escapeHtml(time)}` : ""}</span>`;
            }).join("") : "<span>Nessun turno</span>"}
          </button>
        `;
      }).join("")}
    </div>
  `;

  document.querySelectorAll(".request-day-card").forEach((button) => {
    button.addEventListener("click", () => {
      const dayKey = button.dataset.requestDay;
      document.querySelector("#requestDay").value = dayKey;
      const endDaySelect = document.querySelector("#requestEndDay");
      const isHalfDay = document.querySelector("#requestType").value === "Mezza giornata";
      if (isHalfDay || dayKeys.indexOf(endDaySelect.value) < dayKeys.indexOf(dayKey)) {
        endDaySelect.value = dayKey;
      }
      document.querySelectorAll(".request-day-card").forEach((card) => card.classList.toggle("active", card === button));
    });
  });
}

function updateHalfDayFields() {
  const isHalfDay = document.querySelector("#requestType").value === "Mezza giornata";
  const endDayField = document.querySelector(".request-end-day-field");
  const endDaySelect = document.querySelector("#requestEndDay");
  endDayField.classList.toggle("hidden", isHalfDay);
  endDaySelect.disabled = isHalfDay;
  if (isHalfDay) endDaySelect.value = document.querySelector("#requestDay").value;
  document.querySelectorAll(".half-day-field").forEach((field) => {
    field.classList.toggle("hidden", !isHalfDay);
    field.querySelectorAll("input").forEach((input) => {
      input.disabled = !isHalfDay;
      input.required = isHalfDay;
    });
  });
}

function isValidPin(pin) {
  return /^\d{4,8}$/.test(pin);
}

function renderEmployeeList() {
  document.querySelector("#employeeList").innerHTML = sortedEmployees().map((employee) => `
    <div class="employee-list-row">
      <div class="avatar" style="background:${employee.color}">${initials(employee.name)}</div>
      <div>
        <strong>${escapeHtml(employee.name)}</strong>
        <span>${escapeHtml(employee.role)} · ${employee.target}h · PIN ${employee.hasPin ? "impostato" : "mancante"}${employee.intermittent ? " · a chiamata" : ""}${employee.supervisor ? " · capoturno" : ""}</span>
        <span>${employee.phone ? escapeHtml(employee.phone) : "Telefono mancante"}${employee.email ? ` · ${escapeHtml(employee.email)}` : ""}</span>
        ${employee.intermittent ? `<span>CF ${employee.fiscalCode ? escapeHtml(employee.fiscalCode) : "mancante"}${employee.communicationCode ? ` · Comunicazione ${escapeHtml(employee.communicationCode)}` : ""}</span>` : ""}
      </div>
      <div class="employee-row-actions">
        <button class="edit-employee" type="button" data-edit-employee="${employee.id}" aria-label="Modifica ${escapeHtml(employee.name)}">Modifica</button>
        <button class="reset-pin-employee" type="button" data-reset-pin="${employee.id}" aria-label="Reset PIN ${escapeHtml(employee.name)}">Reset PIN</button>
        <button class="delete-employee" type="button" data-delete-employee="${employee.id}" aria-label="Elimina ${escapeHtml(employee.name)}">×</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".edit-employee").forEach((button) => {
    button.addEventListener("click", () => startEmployeeEdit(button.dataset.editEmployee));
  });

  document.querySelectorAll(".reset-pin-employee").forEach((button) => {
    button.addEventListener("click", () => resetEmployeePin(button.dataset.resetPin));
  });

  document.querySelectorAll(".delete-employee").forEach((button) => {
    button.addEventListener("click", async () => {
      const employeeId = button.dataset.deleteEmployee;
      if (backendEnabled && currentUser?.role === "manager") {
        const payload = await apiRequest(`/api/employees/${employeeId}`, { method: "DELETE" });
        applyState(payload.state);
        applyUser(currentUser);
        populateForm();
        renderEmployeeList();
        render();
        return;
      }
      employees = employees.map((employee) => employee.id === employeeId ? { ...employee, active: false, archivedAt: new Date().toISOString() } : employee);
      shifts = ensureWeek(weekOffset);
      populateForm();
      renderEmployeeList();
      render();
      saveState();
    });
  });
}

async function resetEmployeePin(employeeId) {
  const employee = getEmployee(employeeId);
  if (!employee) return;
  const nextPin = prompt(`Nuovo PIN provvisorio per ${employee.name} (4-8 numeri)`);
  if (nextPin === null) return;
  const cleanPin = nextPin.trim();
  if (!isValidPin(cleanPin)) {
    alert("Il PIN deve avere da 4 a 8 numeri.");
    return;
  }
  const updatedEmployee = { ...employee, pin: cleanPin, hasPin: true };
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest(`/api/employees/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(updatedEmployee)
    });
    applyState(payload.state);
    applyUser(currentUser);
  } else {
    employees = employees.map((item) => item.id === employeeId ? updatedEmployee : item);
    saveState();
  }
  populateForm();
  renderEmployeeList();
  render();
}

function resetEmployeeForm() {
  editingEmployeeId = null;
  document.querySelector("#newEmployeeName").value = "";
  document.querySelector("#newEmployeeRole").value = companySettings.roles[0] || "Sala";
  document.querySelector("#newEmployeeTarget").value = "35";
  document.querySelector("#newEmployeeColor").value = "#4aa7b3";
  document.querySelector("#newEmployeePin").value = "";
  document.querySelector("#newEmployeePin").placeholder = "4-8 numeri";
  document.querySelector("#newEmployeePhone").value = "";
  document.querySelector("#newEmployeeEmail").value = "";
  document.querySelector("#newEmployeeIntermittent").checked = false;
  document.querySelector("#newEmployeeSupervisor").checked = false;
  document.querySelector("#newEmployeeFiscalCode").value = "";
  document.querySelector("#newEmployeeCommunicationCode").value = "";
  document.querySelector("#addEmployeeButton").textContent = "Aggiungi dipendente";
  document.querySelector("#cancelEmployeeEdit").classList.add("hidden");
}

function startEmployeeEdit(employeeId) {
  const employee = getEmployee(employeeId);
  if (!employee) return;
  editingEmployeeId = employeeId;
  document.querySelector("#newEmployeeName").value = employee.name;
  document.querySelector("#newEmployeeRole").value = employee.role;
  document.querySelector("#newEmployeeTarget").value = employee.target;
  document.querySelector("#newEmployeeColor").value = employee.color;
  document.querySelector("#newEmployeePin").value = "";
  document.querySelector("#newEmployeePin").placeholder = "Lascia vuoto per non cambiare";
  document.querySelector("#newEmployeePhone").value = employee.phone || "";
  document.querySelector("#newEmployeeEmail").value = employee.email || "";
  document.querySelector("#newEmployeeIntermittent").checked = Boolean(employee.intermittent);
  document.querySelector("#newEmployeeSupervisor").checked = Boolean(employee.supervisor);
  document.querySelector("#newEmployeeFiscalCode").value = employee.fiscalCode || "";
  document.querySelector("#newEmployeeCommunicationCode").value = employee.communicationCode || "";
  document.querySelector("#addEmployeeButton").textContent = "Salva modifiche";
  document.querySelector("#cancelEmployeeEdit").classList.remove("hidden");
}

async function saveEmployeeForm() {
  const name = document.querySelector("#newEmployeeName").value.trim();
  if (!name) return;
  const pin = document.querySelector("#newEmployeePin").value.trim();
  const effectivePin = editingEmployeeId ? pin : pin;
  if (!editingEmployeeId && !effectivePin) {
    alert("Imposta un PIN iniziale per il nuovo dipendente.");
    return;
  }
  if (effectivePin && !isValidPin(effectivePin)) {
    alert("Il PIN deve avere da 4 a 8 numeri.");
    return;
  }
  const nextEmployee = {
    name,
    role: document.querySelector("#newEmployeeRole").value,
    color: document.querySelector("#newEmployeeColor").value,
    target: Number(document.querySelector("#newEmployeeTarget").value) || 0,
    phone: document.querySelector("#newEmployeePhone").value.trim(),
    email: document.querySelector("#newEmployeeEmail").value.trim(),
    intermittent: document.querySelector("#newEmployeeIntermittent").checked,
    supervisor: document.querySelector("#newEmployeeSupervisor").checked,
    fiscalCode: document.querySelector("#newEmployeeFiscalCode").value.trim().toUpperCase(),
    communicationCode: document.querySelector("#newEmployeeCommunicationCode").value.trim()
  };
  if (effectivePin) nextEmployee.pin = effectivePin;
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = editingEmployeeId
      ? await apiRequest(`/api/employees/${editingEmployeeId}`, {
        method: "PATCH",
        body: JSON.stringify(nextEmployee)
      })
      : await apiRequest("/api/employees", {
        method: "POST",
        body: JSON.stringify(nextEmployee)
      });
    applyState(payload.state);
    applyUser(currentUser);
    resetEmployeeForm();
    populateForm();
    renderEmployeeList();
    render();
    return;
  }
  if (editingEmployeeId) {
    employees = employees.map((employee) => employee.id === editingEmployeeId ? { ...employee, ...nextEmployee } : employee);
  } else {
    employees.push({
      id: `e${Date.now()}`,
      ...nextEmployee
    });
  }
  resetEmployeeForm();
  populateForm();
  renderEmployeeList();
  render();
  saveState();
}

function bindRequestActions() {
  document.querySelectorAll(".approve-request").forEach((button) => {
    button.addEventListener("click", () => approveRequest(button.dataset.requestId));
  });
  document.querySelectorAll(".reject-request").forEach((button) => {
    button.addEventListener("click", () => updateRequestStatus(button.dataset.requestId, "rejected"));
  });
  document.querySelectorAll(".delete-request").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteTimeOffRequest(button.dataset.requestId);
    });
  });
}

async function updateRequestStatus(requestId, status) {
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest(`/api/time-off-requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    applyState(payload.state);
    applyUser(currentUser);
    populateForm();
    render();
    return;
  }
  timeOffRequests = timeOffRequests.map((request) => request.id === requestId ? { ...request, status } : request);
  render();
  saveState();
}

async function deleteTimeOffRequest(requestId) {
  if (!canManage()) return;
  if (!confirm("Eliminare questa richiesta?")) return;
  if (backendEnabled && currentUser?.role === "manager") {
    const payload = await apiRequest(`/api/time-off-requests/${requestId}`, { method: "DELETE" });
    applyState(payload.state);
    applyUser(currentUser);
    populateForm();
    render();
    return;
  }
  timeOffRequests = timeOffRequests.filter((request) => request.id !== requestId);
  render();
  saveState();
}

async function approveRequest(requestId) {
  if (backendEnabled && currentUser?.role === "manager") {
    await updateRequestStatus(requestId, "approved");
    return;
  }
  const request = timeOffRequests.find((item) => item.id === requestId);
  if (!request) return;
  const effectiveType = request.type === "Mezza giornata" ? "Giorno di riposo" : request.type;
  const preset = shiftPresets[effectiveType] || shiftPresets["Giorno di riposo"];
  const targetWeek = ensureWeek(request.weekOffset);
  const requestDays = request.type === "Mezza giornata" ? [request.day] : requestDayRange(request);
  shiftsByWeek[request.weekOffset] = [
    ...targetWeek.filter((shift) => request.type === "Mezza giornata" || !(shift.employeeId === request.employeeId && requestDays.includes(shift.day))),
    ...requestDays.map((day) => ({
      id: `s${Date.now()}-${day}-${Math.random().toString(16).slice(2)}`,
      employeeId: request.employeeId,
      day,
      type: request.type,
      start: request.type === "Mezza giornata" ? request.startTime : "",
      end: request.type === "Mezza giornata" ? request.endTime : "",
      workplace: defaultWorkplace(),
      color: preset.color,
      note: request.note ? `Richiesta approvata: ${request.note}` : "Richiesta approvata",
      category: preset.category
    }))
  ];
  if (request.weekOffset === weekOffset) shifts = shiftsByWeek[request.weekOffset];
  updateRequestStatus(requestId, "approved");
}

async function submitTimeOffRequest(event) {
  event.preventDefault();
  const isHalfDay = document.querySelector("#requestType").value === "Mezza giornata";
  const requestDay = document.querySelector("#requestDay").value;
  const requestEndDay = isHalfDay ? requestDay : document.querySelector("#requestEndDay").value;
  if (!isHalfDay && dayKeys.indexOf(requestEndDay) < dayKeys.indexOf(requestDay)) {
    alert("Il giorno finale deve essere uguale o successivo al giorno iniziale.");
    return;
  }
  const startTime = isHalfDay ? requireTimeInput("#requestStartTime", "l'orario di inizio") : "";
  if (isHalfDay && !startTime) return;
  const endTime = isHalfDay ? requireTimeInput("#requestEndTime", "l'orario di fine") : "";
  if (isHalfDay && !endTime) return;
  const requestDraft = {
    employeeId: activeEmployeeId,
    weekOffset: Number(document.querySelector("#requestWeek").value),
    day: requestDay,
    endDay: requestEndDay,
    type: document.querySelector("#requestType").value,
    startTime,
    endTime,
    note: document.querySelector("#requestNote").value.trim()
  };

  if (backendEnabled && currentUser?.role === "employee") {
    const payload = await apiRequest("/api/time-off-requests", {
      method: "POST",
      body: JSON.stringify(requestDraft)
    });
    applyState(payload.state);
    applyUser(currentUser);
  } else {
    timeOffRequests.push({
      ...requestDraft,
      id: `r${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: "pending",
      createdAt: new Date().toISOString()
    });
  }

  document.querySelector("#requestForm").reset();
  requestDialog.close();
  populateForm();
  render();
  saveState();
}

function resetPinForm() {
  document.querySelector("#pinForm").reset();
  document.querySelector("#pinError").classList.add("hidden");
  document.querySelector("#pinSuccess").classList.add("hidden");
}

async function changeOwnPin(event) {
  event.preventDefault();
  const currentPin = document.querySelector("#currentPinInput").value.trim();
  const newPin = document.querySelector("#newPinInput").value.trim();
  const confirmPin = document.querySelector("#confirmPinInput").value.trim();
  const error = document.querySelector("#pinError");
  const success = document.querySelector("#pinSuccess");
  error.classList.add("hidden");
  success.classList.add("hidden");

  if (!isValidPin(newPin) || newPin !== confirmPin) {
    error.textContent = "Il nuovo PIN deve avere da 4 a 8 numeri e deve coincidere.";
    error.classList.remove("hidden");
    return;
  }

  try {
    if (backendEnabled && currentUser?.role === "employee") {
      const payload = await apiRequest("/api/me/pin", {
        method: "PATCH",
        body: JSON.stringify({ currentPin, newPin })
      });
      applyState(payload.state);
      applyUser(currentUser);
    } else {
      throw new Error("Per cambiare il PIN apri l'app da localhost ed effettua l'accesso dipendente.");
    }
    success.textContent = "PIN aggiornato.";
    success.classList.remove("hidden");
    setTimeout(() => {
      pinDialog.close();
      resetPinForm();
      render();
    }, 500);
  } catch (errorMessage) {
    error.textContent = errorMessage.message || "PIN attuale non corretto.";
    error.classList.remove("hidden");
  }
}

function updateLoginFields() {
  const role = document.querySelector("#loginRole").value;
  const usesEmployee = role === "employee" || role === "supervisor";
  document.querySelector(".login-employee-field").classList.toggle("hidden", !usesEmployee);
}

async function handleLogin(event) {
  event.preventDefault();
  document.querySelector("#loginError").classList.add("hidden");
  try {
    const payload = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({
        role: document.querySelector("#loginRole").value,
        employeeId: document.querySelector("#loginEmployee").value,
        password: document.querySelector("#loginPassword").value
      })
    });
    const remote = await apiRequest("/api/state");
    applyState(remote.state);
    applyUser(payload.user);
    populateForm();
    render();
    document.querySelector("#loginPassword").value = "";
    document.querySelector("#loginDialog").close();
    await processPendingPunch();
  } catch (error) {
    const message = document.querySelector("#loginError");
    message.textContent = error.message || "Accesso non riuscito.";
    message.classList.remove("hidden");
  }
}

async function logout() {
  try {
    await apiRequest("/api/logout", { method: "POST", body: "{}" });
  } catch {}
  currentUser = null;
  document.body.classList.add("auth-gated");
  await loadLoginEmployees();
  document.querySelector("#loginDialog").showModal();
  updateAccountUi();
}

async function loadLoginEmployees() {
  if (!backendEnabled) return;
  try {
    const payload = await apiRequest("/api/login/employees");
    employees = Array.isArray(payload.employees) ? payload.employees.map(normalizeEmployee) : employees;
    if (!employees.some((employee) => employee.id === activeEmployeeId)) {
      activeEmployeeId = employees[0]?.id || activeEmployeeId;
    }
    populateForm();
  } catch {}
}

async function initializeBackend() {
  if (!backendEnabled) return;
  try {
    const licensePayload = await apiRequest("/api/capabilities");
    licenseCapabilities = licensePayload.capabilities || null;
    applyCapabilitiesUi();
    const session = await apiRequest("/api/session");
    if (session.authenticated) {
      const remote = await apiRequest("/api/state");
      applyState(remote.state);
      applyUser(session.user);
      populateForm();
      render();
      await processPendingPunch();
    } else {
      document.body.classList.add("auth-gated");
      await loadLoginEmployees();
      if (pendingPunchToken) {
        document.querySelector("#loginRole").value = "employee";
        updateLoginFields();
      }
      document.querySelector("#loginDialog").showModal();
    }
  } catch {
    // If the app is opened without the local server, keep the local-only prototype usable.
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function loadBackups() {
  const list = document.querySelector("#backupList");
  list.innerHTML = '<div class="empty-state">Caricamento backup...</div>';
  try {
    const payload = await apiRequest("/api/backups");
    const hiddenCount = Math.max(0, Number(payload.total || payload.backups.length) - payload.backups.length);
    const backupNote = hiddenCount
      ? `<div class="backup-note">Mostro gli ultimi ${payload.backups.length} backup su ${payload.total}. I backup piu vecchi restano salvati sul server.</div>`
      : "";
    list.innerHTML = payload.backups.length
      ? payload.backups.map((backup) => `
        <div class="backup-row">
          <div>
            <strong>${escapeHtml(new Date(backup.createdAt).toLocaleString("it-IT"))}</strong>
            <span>${escapeHtml(backup.file)} · ${formatBytes(backup.size)}</span>
          </div>
          <button class="ghost-button restore-backup" type="button" data-backup-file="${escapeHtml(backup.file)}">Ripristina</button>
        </div>
      `).join("") + backupNote
      : '<div class="empty-state">Nessun backup ancora disponibile.</div>';
    bindBackupActions();
  } catch {
    list.innerHTML = '<div class="empty-state">Backup disponibili solo aprendo l’app da localhost come manager.</div>';
  }
}

function bindBackupActions() {
  document.querySelectorAll(".restore-backup").forEach((button) => {
    button.addEventListener("click", async () => {
      const file = button.dataset.backupFile;
      const confirmed = confirm("Ripristinare questo backup? Lo stato attuale verra salvato in un nuovo backup prima del ripristino.");
      if (!confirmed) return;
      try {
        const payload = await apiRequest("/api/backups/restore", {
          method: "POST",
          body: JSON.stringify({ file })
        });
        applyState(payload.state);
        applyUser(currentUser);
        populateForm();
        render();
        backupDialog.close();
        showAppNotice("Backup ripristinato.");
      } catch (error) {
        showAppNotice(error.message || "Ripristino backup non riuscito.", "error");
      }
    });
  });
}

async function punchAttendance(token = pendingPunchToken) {
  if (!token || !canUseEmployeeArea()) return;
  try {
    const payload = await apiRequest("/api/attendance/punch", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    applyState(payload.state);
    applyUser(currentUser);
    pendingPunchToken = "";
    const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, "", cleanUrl || "/");
    populateForm();
    render();
    showAppNotice(payload.status || "Timbratura registrata.");
  } catch (error) {
    pendingPunchToken = "";
    showAppNotice(error.message || "Non sono riuscito a registrare la timbratura.", "error");
  }
}

async function processPendingPunch() {
  if (!pendingPunchToken || !backendEnabled || !canUseEmployeeArea()) return;
  await punchAttendance(pendingPunchToken);
}

function extractPunchToken(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text, window.location.origin);
    const token = parsed.searchParams.get("punch");
    if (token) return token;
  } catch {
    // The QR may contain only the token instead of the full link.
  }
  return /^\d+\.[a-f0-9]{24}$/.test(text) ? text : "";
}

async function openQrScanner() {
  if (!canUseEmployeeArea()) return;
  const status = document.querySelector("#qrScanStatus");
  const video = document.querySelector("#qrScanVideo");
  status.textContent = "Apro la fotocamera...";
  qrScanDialog.showModal();

  if (!("BarcodeDetector" in window)) {
    status.textContent = "Scanner non disponibile su questo browser. Usa la fotocamera del telefono e apri il link del QR.";
    return;
  }

  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    qrScanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = qrScanStream;
    await video.play();
    status.textContent = "Inquadra il QR del totem.";
    qrScanTimer = window.setInterval(async () => {
      try {
        const codes = await detector.detect(video);
        const token = extractPunchToken(codes[0]?.rawValue || "");
        if (!token) return;
        closeQrScanner();
        await punchAttendance(token);
      } catch {
        status.textContent = "Non riesco a leggere il QR. Avvicina il telefono al codice.";
      }
    }, 600);
  } catch {
    status.textContent = "Fotocamera non disponibile. Controlla i permessi del browser o usa la fotocamera del telefono.";
  }
}

function closeQrScanner() {
  if (qrScanTimer) window.clearInterval(qrScanTimer);
  qrScanTimer = null;
  if (qrScanStream) {
    qrScanStream.getTracks().forEach((track) => track.stop());
  }
  qrScanStream = null;
  document.querySelector("#qrScanVideo").srcObject = null;
  if (qrScanDialog.open) qrScanDialog.close();
}

async function loadAttendanceRecords() {
  const list = document.querySelector("#attendanceList");
  list.innerHTML = '<div class="empty-state">Caricamento presenze...</div>';
  try {
    const payload = await apiRequest("/api/attendance");
    attendanceRecords = Array.isArray(payload.records) ? payload.records : [];
    manualAttendanceRequests = Array.isArray(payload.manualRequests) ? payload.manualRequests : [];
    attendanceNoWorkDays = Array.isArray(payload.noWorkDays) ? payload.noWorkDays : [];
    attendanceRevenue = payload.revenue && typeof payload.revenue === "object" ? payload.revenue : {};
    renderAttendanceList();
  } catch {
    list.innerHTML = '<div class="empty-state">Presenze disponibili solo come manager.</div>';
  }
}

function renderAttendanceList() {
  const list = document.querySelector("#attendanceList");
  const summary = document.querySelector("#attendanceSummary");
  const rows = currentAttendanceRows();
  renderAttendanceProductivity();
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const openRows = rows.filter((row) => !row.missing && !row.noWork && !row.out).length;
  const missingRows = rows.filter((row) => row.missing).length;
  const pendingRows = rows.filter((row) => row.pendingManual).length;
  const noWorkRows = rows.filter((row) => row.noWork).length;
  summary.innerHTML = `
    <div><span>Dipendenti</span><strong>${new Set(rows.map((row) => row.employeeId)).size}</strong></div>
    <div><span>Giornate</span><strong>${rows.length}</strong></div>
    <div><span>Ore totali</span><strong>${formatHours(totalHours)}</strong></div>
    <div><span>Aperte</span><strong>${openRows}</strong></div>
    <div><span>Mancanti</span><strong>${missingRows}</strong></div>
    <div><span>Non lavorati</span><strong>${noWorkRows}</strong></div>
    <div><span>Da approvare</span><strong>${pendingRows}</strong></div>
  `;
  renderAttendanceMonthlySummary(rows);

  if (!rows.length) {
    list.innerHTML = '<div class="empty-state">Nessuna timbratura nel periodo selezionato.</div>';
    return;
  }
  list.innerHTML = `
    <div class="attendance-sheet" id="attendanceSheet">
      <div class="attendance-sheet-head">
        <div>Dipendente</div>
        <div>Data</div>
        <div>Entrata</div>
        <div>Uscita</div>
        <div>Ore</div>
        <div>Stato</div>
        <div>Azioni</div>
      </div>
      ${rows.map((row) => `
        <div class="attendance-sheet-row ${row.pendingManual ? "pending-manual" : row.noWork ? "no-work" : row.missing ? "missing" : row.out ? "" : "open"}">
          <div><strong>${escapeHtml(row.employeeName)}</strong></div>
          <div>${escapeHtml(row.dateLabel)}</div>
          <div>${row.in ? escapeHtml(attendanceTime(row.in.timestamp)) : "-"}</div>
          <div>${row.out ? escapeHtml(attendanceTime(row.out.timestamp)) : "-"}</div>
          <div>${row.out ? escapeHtml(formatHours(row.hours)) : "-"}</div>
          <div class="attendance-status-cell">
            <span>${row.pendingManual ? "Da approvare" : row.noWork ? escapeHtml(attendanceAbsenceLabel(row.noWorkReason)) : row.missing ? "Mancante" : row.out ? "Completa" : "Aperta"}</span>
            ${(row.pendingManual || row.missing || row.noWork) && row.scheduledLabel ? `<small>${escapeHtml(row.scheduledLabel)}</small>` : ""}
            ${row.noWork && row.noWorkNote ? `<small>${escapeHtml(row.noWorkNote)}</small>` : ""}
          </div>
          <div class="attendance-actions">
            ${row.pendingManual
              ? `<button class="mini-action approve-manual-attendance" type="button" data-request-id="${escapeHtml(row.manualRequestId)}">Approva</button>
                <button class="mini-action danger-mini-action reject-manual-attendance" type="button" data-request-id="${escapeHtml(row.manualRequestId)}">Respingi</button>`
              : ""}
            ${!row.pendingManual && row.in ? `<button class="mini-action edit-attendance-record" type="button" data-record-id="${escapeHtml(row.in.id)}">Entrata</button>` : ""}
            ${!row.pendingManual && row.in ? `<button class="mini-action danger-mini-action delete-attendance-record" type="button" data-record-id="${escapeHtml(row.in.id)}">Elimina entrata</button>` : ""}
            ${!row.pendingManual && row.missing
              ? `<button class="mini-action add-attendance-in" type="button" data-employee-id="${escapeHtml(row.employeeId)}" data-date="${escapeHtml(row.dateInput)}">+ Entrata</button>
                <button class="mini-action mark-no-work-day" type="button" data-employee-id="${escapeHtml(row.employeeId)}" data-date="${escapeHtml(row.dateInput)}">Segna assenza</button>`
              : !row.pendingManual && row.out
              ? `<button class="mini-action edit-attendance-record" type="button" data-record-id="${escapeHtml(row.out.id)}">Uscita</button>
                <button class="mini-action danger-mini-action delete-attendance-record" type="button" data-record-id="${escapeHtml(row.out.id)}">Elimina uscita</button>`
              : !row.pendingManual ? `<button class="mini-action add-attendance-out" type="button" data-employee-id="${escapeHtml(row.employeeId)}" data-date="${escapeHtml(row.dateInput)}">+ Uscita</button>` : ""}
            ${!row.pendingManual && row.noWork ? `<button class="mini-action undo-no-work-day" type="button" data-no-work-id="${escapeHtml(row.noWorkId)}">Ripristina</button>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
  bindAttendanceCorrectionActions();
}

function currentAttendanceRows() {
  if (document.querySelector("#attendancePeriod").value === "open") return openAttendanceRows();
  const { from, to } = attendanceRange();
  const employeeFilter = document.querySelector("#attendanceEmployeeFilter").value || "all";
  return attendanceRowsForPeriod(from, to, employeeFilter);
}

function attendanceRowsForPeriod(from, to, employeeFilter = "all") {
  const periodStart = startOfDay(from);
  const periodEnd = startOfDay(to);
  const filtered = buildAttendanceRows(attendanceRecords
    .filter((record) => employeeFilter === "all" || record.employeeId === employeeFilter)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)))
    .filter((row) => {
      const businessDate = attendanceRowBusinessDate(row);
      return businessDate >= periodStart && businessDate <= periodEnd;
    });
  return withPendingManualAttendanceRows(
    withMissingScheduledAttendanceRows(filtered, from, to, employeeFilter),
    from,
    to,
    employeeFilter
  );
}

function globalAttendanceRowsForCurrentPeriod() {
  if (document.querySelector("#attendancePeriod").value === "open") {
    return buildAttendanceRows([...attendanceRecords].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
  }
  const { from, to } = attendanceRange();
  return attendanceRowsForPeriod(from, to, "all");
}

function attendanceRowWorkplaces(row) {
  if (Array.isArray(row.workplaces) && row.workplaces.length) return row.workplaces;
  const businessDate = attendanceRowBusinessDate(row);
  const dayShifts = scheduledWorkingShiftsInRange(businessDate, businessDate, row.employeeId);
  const places = [...new Set(dayShifts.map((shift) => shift.workplace || defaultWorkplace()).filter(Boolean))];
  return places.length ? places : [defaultWorkplace()];
}

function attendanceRowMatchesRevenueScope(row, scope = selectedRevenueScope()) {
  const scopePlaces = new Set((scope.workplaces || []).map(normalizedPlaceName));
  return attendanceRowWorkplaces(row).some((workplace) => scopePlaces.has(normalizedPlaceName(workplace)));
}

function renderAttendanceProductivity() {
  const container = document.querySelector("#attendanceProductivity");
  if (!container) return;
  const { from, to } = attendanceRange();
  const scope = selectedRevenueScope();
  const rows = globalAttendanceRowsForCurrentPeriod();
  const workedRows = rows.filter((row) => (
    row.out && !row.pendingManual && !row.noWork && !row.missing && attendanceRowMatchesRevenueScope(row, scope)
  ));
  const totalHours = workedRows.reduce((sum, row) => sum + row.hours, 0);
  const revenue = attendanceRevenueTotal(from, to, scope);
  const productivity = totalHours > 0 ? revenue / totalHours : 0;
  const revenueDays = Object.entries(attendanceRevenue || {}).filter(([dateInput, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput) || !Number(attendanceRevenueValue(dateInput, scope))) return false;
    const date = dateFromInput(dateInput);
    return date >= startOfDay(from) && date <= startOfDay(to);
  }).length;
  container.innerHTML = `
    <div><span>Statistiche</span><strong>${escapeHtml(scope.label)}</strong>${scope.kind === "group" ? `<small>${scope.workplaces.length} luoghi</small>` : ""}</div>
    <div><span>Fatturato periodo</span><strong>${escapeHtml(formatMoney(revenue))}</strong></div>
    <div><span>Ore team luogo</span><strong>${escapeHtml(formatHours(totalHours))}</strong></div>
    <div><span>Produttivita oraria</span><strong>${escapeHtml(formatMoney(productivity))}/h</strong></div>
    <div><span>Giorni fatturato</span><strong>${revenueDays}</strong></div>
  `;
}

function populateAttendanceRevenueScopes() {
  const select = document.querySelector("#attendanceRevenueScope");
  if (!select) return;
  const current = select.value || revenueScopeKey(defaultRevenueScope());
  const scopes = revenueScopes();
  select.innerHTML = scopes.map((scope) => `
    <option value="${escapeHtml(revenueScopeKey(scope))}">${escapeHtml(scope.label)}${scope.kind === "group" ? " (gruppo)" : ""}</option>
  `).join("");
  select.value = scopes.some((scope) => revenueScopeKey(scope) === current) ? current : revenueScopeKey(defaultRevenueScope());
}

function syncAttendanceRevenueInputs(date = dateFromItalianInput(document.querySelector("#attendanceRevenueDate")?.value || document.querySelector("#attendanceFrom")?.value)) {
  const dateInput = dateInputValue(date);
  populateAttendanceRevenueScopes();
  const entry = attendanceRevenueEntry(dateInput, selectedRevenueScope());
  const dateField = document.querySelector("#attendanceRevenueDate");
  const amountField = document.querySelector("#attendanceRevenueAmount");
  const noteField = document.querySelector("#attendanceRevenueNote");
  if (!dateField || !amountField || !noteField) return;
  dateField.value = italianDateInputValue(date);
  amountField.value = entry.amount ? formatAttendanceExportHours(entry.amount) : "";
  noteField.value = entry.note || "";
}

async function saveAttendanceRevenue() {
  if (!canManage()) return;
  const date = dateFromItalianInput(document.querySelector("#attendanceRevenueDate").value || document.querySelector("#attendanceFrom").value);
  const dateInput = dateInputValue(date);
  const scope = selectedRevenueScope();
  const amount = parseItalianNumber(document.querySelector("#attendanceRevenueAmount").value);
  const note = document.querySelector("#attendanceRevenueNote").value.trim();
  try {
    const response = await apiRequest("/api/attendance/revenue", {
      method: "POST",
      body: JSON.stringify({
        date: dateInput,
        scopeKey: revenueScopeKey(scope),
        scopeLabel: scope.label,
        workplaces: scope.workplaces,
        amount,
        note
      })
    });
    applyState(response.state);
    applyUser(currentUser);
    attendanceRecords = Array.isArray(response.records) ? response.records : attendanceRecords;
    manualAttendanceRequests = Array.isArray(response.manualRequests) ? response.manualRequests : manualAttendanceRequests;
    attendanceNoWorkDays = Array.isArray(response.noWorkDays) ? response.noWorkDays : attendanceNoWorkDays;
    attendanceRevenue = response.revenue && typeof response.revenue === "object" ? response.revenue : attendanceRevenue;
    syncAttendanceRevenueInputs(date);
    renderAttendanceList();
    showAppNotice(amount > 0 ? `Fatturato salvato per ${scope.label}.` : `Fatturato rimosso per ${scope.label}.`);
  } catch (error) {
    showAppNotice(error.message || "Fatturato non salvato. Riprova.", "error");
  }
}

function openAttendanceRows() {
  const employeeFilter = document.querySelector("#attendanceEmployeeFilter")?.value || "all";
  const filtered = attendanceRecords
    .filter((record) => employeeFilter === "all" || record.employeeId === employeeFilter)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return buildAttendanceRows(filtered).filter((row) => !row.out);
}

function attendanceSummaryRows(rows = currentAttendanceRows()) {
  const byEmployee = new Map();
  rows.forEach((row) => {
    const current = byEmployee.get(row.employeeId) || {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      days: 0,
      hours: 0,
      open: 0,
      missing: 0,
      noWork: 0,
      pending: 0
    };
    current.days += 1;
    current.hours += row.hours;
    if (row.pendingManual) current.pending += 1;
    else if (row.noWork) current.noWork += 1;
    else if (row.missing) current.missing += 1;
    else if (!row.out) current.open += 1;
    byEmployee.set(row.employeeId, current);
  });
  return [...byEmployee.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, "it", { sensitivity: "base" }));
}

function renderAttendanceMonthlySummary(rows = currentAttendanceRows()) {
  const container = document.querySelector("#attendanceMonthlySummary");
  const summaryRows = attendanceSummaryRows(rows);
  if (!summaryRows.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <div class="monthly-summary-head">
      <strong>Riepilogo periodo</strong>
      <span>${escapeHtml(document.querySelector("#attendanceFrom").value)} - ${escapeHtml(document.querySelector("#attendanceTo").value)}</span>
    </div>
    <div class="monthly-summary-table">
      <div class="monthly-summary-row head">
        <div>Dipendente</div>
        <div>Giornate</div>
        <div>Ore</div>
        <div>Aperte</div>
        <div>Mancanti</div>
        <div>Non lavorati</div>
        <div>Da approvare</div>
      </div>
      ${summaryRows.map((row) => `
        <div class="monthly-summary-row ${row.pending ? "pending-manual" : row.noWork ? "no-work" : row.missing ? "missing" : row.open ? "open" : ""}">
          <div><strong>${escapeHtml(row.employeeName)}</strong></div>
          <div>${row.days}</div>
          <div>${escapeHtml(formatHours(row.hours))}</div>
          <div>${row.open || "-"}</div>
          <div>${row.missing || "-"}</div>
          <div>${row.noWork || "-"}</div>
          <div>${row.pending || "-"}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function setPayrollNotice(message = "", type = "success") {
  const notice = document.querySelector("#payrollNotice");
  notice.textContent = message;
  notice.classList.toggle("hidden", !message);
  notice.classList.toggle("error", type === "error");
}

function renderPayrollList() {
  const container = document.querySelector("#payrollList");
  const filterMonth = document.querySelector("#payrollFilterMonth").value;
  const documents = payrollDocuments
    .filter((document) => !filterMonth || document.month === filterMonth)
    .sort((a, b) => String(b.month).localeCompare(String(a.month))
      || String(a.employeeName).localeCompare(String(b.employeeName), "it", { sensitivity: "base" }));
  if (!documents.length) {
    container.innerHTML = '<div class="empty-state">Nessuna busta paga caricata per il periodo selezionato.</div>';
    return;
  }
  container.innerHTML = documents.map((document) => `
    <div class="payroll-row">
      <div>
        <strong>${escapeHtml(document.employeeName || "Dipendente")}</strong>
        <small>${escapeHtml(payrollMonthLabel(document.month))} · ${document.pageCount || 1} ${Number(document.pageCount) === 1 ? "pagina" : "pagine"}</small>
      </div>
      <div class="payroll-row-actions">
        <a class="mini-action" href="/api/payroll/${encodeURIComponent(document.id)}/file" download>Scarica</a>
        <button class="mini-action danger-mini-action delete-payroll" type="button" data-payroll-id="${escapeHtml(document.id)}">Elimina</button>
      </div>
    </div>
  `).join("");
}

async function loadPayrollDocuments() {
  if (!canManage() || !backendEnabled) {
    payrollDocuments = [];
    renderPayrollList();
    return;
  }
  try {
    const payload = await apiRequest("/api/payroll");
    payrollDocuments = Array.isArray(payload.documents) ? payload.documents : [];
    renderPayrollList();
  } catch (error) {
    setPayrollNotice(error.message || "Caricamento archivio non riuscito.", "error");
  }
}

function renderPayrollUploadResults(results) {
  const container = document.querySelector("#payrollResults");
  if (!results.length) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  const assigned = results.flatMap((result) => result.documents || []);
  const unmatched = results.reduce((sum, result) => sum + (result.unmatchedPages?.length || 0), 0);
  const errors = results.filter((result) => result.error);
  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="payroll-result-summary">
      <strong>${assigned.length} ${assigned.length === 1 ? "busta assegnata" : "buste assegnate"}</strong>
      <span>${unmatched ? `${unmatched} pagine da verificare` : "Tutte le pagine sono state riconosciute"}</span>
    </div>
    ${assigned.map((document) => `
      <div class="payroll-result-row">
        <span>${escapeHtml(document.employeeName || "Dipendente")}</span>
        <strong>${document.pageCount || 1} ${Number(document.pageCount) === 1 ? "pagina" : "pagine"}</strong>
      </div>
    `).join("")}
    ${errors.map((result) => `<div class="payroll-result-error">${escapeHtml(result.fileName)}: ${escapeHtml(result.error)}</div>`).join("")}
  `;
}

async function uploadPayrollFiles() {
  if (!canManage() || !backendEnabled) return;
  const month = document.querySelector("#payrollMonth").value;
  const files = [...document.querySelector("#payrollFiles").files];
  if (!month) {
    setPayrollNotice("Seleziona il mese delle buste paga.", "error");
    return;
  }
  if (!files.length) {
    setPayrollNotice("Seleziona almeno un PDF.", "error");
    return;
  }
  const invalid = files.find((file) => !file.name.toLowerCase().endsWith(".pdf") || file.size > 15_000_000);
  if (invalid) {
    setPayrollNotice(`${invalid.name}: usa un PDF di massimo 15 MB.`, "error");
    return;
  }
  const button = document.querySelector("#uploadPayroll");
  button.disabled = true;
  setPayrollNotice("");
  const results = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    button.textContent = `Caricamento ${index + 1}/${files.length}...`;
    try {
      const payload = await apiRequest("/api/payroll/upload", {
        method: "POST",
        body: JSON.stringify({
          month,
          fileName: file.name,
          fileBase64: await fileToBase64(file)
        })
      });
      results.push({ fileName: file.name, ...payload });
    } catch (error) {
      results.push({ fileName: file.name, error: error.message || "Caricamento non riuscito." });
    }
  }
  button.disabled = false;
  button.textContent = "Carica e distribuisci";
  renderPayrollUploadResults(results);
  const assignedCount = results.reduce((sum, result) => sum + (result.documents?.length || 0), 0);
  const failedCount = results.filter((result) => result.error).length;
  setPayrollNotice(
    assignedCount
      ? `${assignedCount} ${assignedCount === 1 ? "busta caricata" : "buste caricate"}${failedCount ? `, ${failedCount} file non riconosciuti` : ""}.`
      : "Nessuna busta paga è stata assegnata.",
    assignedCount ? "success" : "error"
  );
  document.querySelector("#payrollFiles").value = "";
  await loadPayrollDocuments();
}

async function deletePayrollDocument(event) {
  const button = event.target.closest(".delete-payroll");
  if (!button || !canManage()) return;
  if (!confirm("Eliminare questa busta paga? Il dipendente non potrà più scaricarla.")) return;
  try {
    await apiRequest(`/api/payroll/${encodeURIComponent(button.dataset.payrollId)}`, { method: "DELETE" });
    payrollDocuments = payrollDocuments.filter((document) => document.id !== button.dataset.payrollId);
    renderPayrollList();
    setPayrollNotice("Busta paga eliminata.");
  } catch (error) {
    setPayrollNotice(error.message || "Eliminazione non riuscita.", "error");
  }
}

function setEmployeeDocumentsNotice(message = "", type = "success") {
  const notice = document.querySelector("#employeeDocumentsNotice");
  notice.textContent = message;
  notice.classList.toggle("hidden", !message);
  notice.classList.toggle("error", type === "error");
}

function populateEmployeeDocumentSelectors() {
  const options = sortedEmployees().map((employee) => (
    `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.name)}</option>`
  )).join("");
  document.querySelector("#employeeDocumentEmployee").innerHTML = options;
  document.querySelector("#employeeDocumentFilterEmployee").innerHTML = `<option value="all">Tutti</option>${options}`;
}

function employeeDocumentDateToIso(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${yearText}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function renderEmployeeDocumentsList() {
  const container = document.querySelector("#employeeDocumentsList");
  if (!container) return;
  const employeeFilter = document.querySelector("#employeeDocumentFilterEmployee").value;
  const categoryFilter = document.querySelector("#employeeDocumentFilterCategory").value;
  const documents = employeeDocuments
    .filter((document) => employeeFilter === "all" || document.employeeId === employeeFilter)
    .filter((document) => categoryFilter === "all" || document.category === categoryFilter)
    .sort((a, b) => String(a.employeeName).localeCompare(String(b.employeeName), "it", { sensitivity: "base" })
      || new Date(b.uploadedAt) - new Date(a.uploadedAt));
  if (!documents.length) {
    container.innerHTML = '<div class="empty-state">Nessun documento per i filtri selezionati.</div>';
    return;
  }
  container.innerHTML = documents.map((document) => {
    const expiry = employeeDocumentExpiry(document);
    const issue = document.issueDate ? `Rilasciato il ${documentDateLabel(document.issueDate)}` : "Data rilascio non indicata";
    return `
      <div class="payroll-row ${expiry.className}">
        <div>
          <strong>${escapeHtml(document.employeeName || "Dipendente")} · ${escapeHtml(document.title || "Documento")}</strong>
          <small>${escapeHtml(document.category || "Altro")} · ${escapeHtml(issue)} · ${escapeHtml(expiry.label)}</small>
        </div>
        <div class="payroll-row-actions">
          <a class="mini-action" href="/api/employee-documents/${encodeURIComponent(document.id)}/file" download>Scarica</a>
          <button class="mini-action danger-mini-action delete-employee-document" type="button" data-document-id="${escapeHtml(document.id)}">Elimina</button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadEmployeeDocuments() {
  if (!canManage() || !backendEnabled) {
    renderEmployeeDocumentsList();
    return;
  }
  try {
    const payload = await apiRequest("/api/employee-documents");
    employeeDocuments = Array.isArray(payload.documents) ? payload.documents : [];
    renderEmployeeDocumentsList();
  } catch (error) {
    setEmployeeDocumentsNotice(error.message || "Caricamento archivio non riuscito.", "error");
  }
}

async function uploadEmployeeDocument() {
  if (!canManage() || !backendEnabled) return;
  const employeeId = document.querySelector("#employeeDocumentEmployee").value;
  const category = document.querySelector("#employeeDocumentCategory").value;
  const title = document.querySelector("#employeeDocumentTitle").value.trim();
  const issueDate = employeeDocumentDateToIso(document.querySelector("#employeeDocumentIssueDate").value);
  const expiryDate = employeeDocumentDateToIso(document.querySelector("#employeeDocumentExpiryDate").value);
  const file = document.querySelector("#employeeDocumentFile").files[0];
  if (!employeeId || !category || !title) {
    setEmployeeDocumentsNotice("Seleziona il dipendente e inserisci categoria e titolo.", "error");
    return;
  }
  if (issueDate === null || expiryDate === null) {
    setEmployeeDocumentsNotice("Inserisci le date nel formato gg/mm/aaaa.", "error");
    return;
  }
  if (!file) {
    setEmployeeDocumentsNotice("Seleziona un documento da caricare.", "error");
    return;
  }
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type) || file.size > 10_000_000) {
    setEmployeeDocumentsNotice("Usa un file PDF, JPG o PNG di massimo 10 MB.", "error");
    return;
  }
  const button = document.querySelector("#uploadEmployeeDocument");
  button.disabled = true;
  button.textContent = "Caricamento...";
  setEmployeeDocumentsNotice("");
  try {
    const payload = await apiRequest("/api/employee-documents/upload", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        category,
        title,
        issueDate,
        expiryDate,
        fileName: file.name,
        mimeType: file.type,
        fileBase64: await fileToBase64(file)
      })
    });
    employeeDocuments.push(payload.document);
    document.querySelector("#employeeDocumentTitle").value = "";
    document.querySelector("#employeeDocumentIssueDate").value = "";
    document.querySelector("#employeeDocumentExpiryDate").value = "";
    document.querySelector("#employeeDocumentFile").value = "";
    renderEmployeeDocumentsList();
    setEmployeeDocumentsNotice("Documento caricato e reso disponibile al dipendente.");
  } catch (error) {
    setEmployeeDocumentsNotice(error.message || "Caricamento non riuscito.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Carica documento";
  }
}

async function deleteEmployeeDocument(event) {
  const button = event.target.closest(".delete-employee-document");
  if (!button || !canManage()) return;
  if (!confirm("Eliminare questo documento? Il dipendente non potrà più scaricarlo.")) return;
  try {
    await apiRequest(`/api/employee-documents/${encodeURIComponent(button.dataset.documentId)}`, { method: "DELETE" });
    employeeDocuments = employeeDocuments.filter((document) => document.id !== button.dataset.documentId);
    renderEmployeeDocumentsList();
    setEmployeeDocumentsNotice("Documento eliminato.");
  } catch (error) {
    setEmployeeDocumentsNotice(error.message || "Eliminazione non riuscita.", "error");
  }
}

function defaultTipsMonth() {
  return monthInputValue(new Date());
}

function normalizeTipMonth(value = {}) {
  return {
    cashTotal: Math.max(0, Number(value.cashTotal) || 0),
    posTotal: Math.max(0, Number(value.posTotal) || 0),
    hourOverrides: value.hourOverrides && typeof value.hourOverrides === "object" ? { ...value.hourOverrides } : {},
    updatedAt: value.updatedAt || ""
  };
}

function tipsMonthRange(month) {
  const [year, monthNumber] = String(month || defaultTipsMonth()).split("-").map(Number);
  return {
    from: new Date(year, monthNumber - 1, 1),
    to: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

function tipsAttendanceHours(month) {
  const { from, to } = tipsMonthRange(month);
  const totals = new Map();
  buildAttendanceRows([...attendanceRecords].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)))
    .filter((row) => {
      const businessDate = attendanceRowBusinessDate(row);
      return row.in && row.out && businessDate >= startOfDay(from) && businessDate <= startOfDay(to);
    })
    .forEach((row) => {
      const current = totals.get(row.employeeId) || { hours: 0, name: row.employeeName };
      current.hours += Number(row.hours) || 0;
      if (row.employeeName) current.name = row.employeeName;
      totals.set(row.employeeId, current);
    });
  return totals;
}

function tipsRows() {
  if (!currentTipDraft) return [];
  const attendanceHours = tipsAttendanceHours(currentTipDraft.month);
  const employeeMap = new Map(sortedEmployees(employees, { includeArchived: true }).map((employee) => [employee.id, employee]));
  attendanceHours.forEach((value, employeeId) => {
    if (!employeeMap.has(employeeId)) employeeMap.set(employeeId, { id: employeeId, name: value.name || "Dipendente", active: false });
  });
  Object.keys(currentTipDraft.hourOverrides).forEach((employeeId) => {
    if (!employeeMap.has(employeeId)) employeeMap.set(employeeId, { id: employeeId, name: "Dipendente storico", active: false });
  });
  return [...employeeMap.values()]
    .map((employee) => {
      const baseHours = attendanceHours.get(employee.id)?.hours || 0;
      const hasOverride = Object.prototype.hasOwnProperty.call(currentTipDraft.hourOverrides, employee.id);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        archived: isArchivedEmployee(employee),
        baseHours,
        hours: hasOverride ? Math.max(0, Number(currentTipDraft.hourOverrides[employee.id]) || 0) : baseHours
      };
    })
    .filter((row) => !row.archived || row.baseHours > 0 || Object.prototype.hasOwnProperty.call(currentTipDraft.hourOverrides, row.employeeId))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "it", { sensitivity: "base" }));
}

function allocateTipCents(total, rows) {
  const cents = Math.max(0, Math.round((Number(total) || 0) * 100));
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const allocations = new Map(rows.map((row) => [row.employeeId, 0]));
  if (!cents || totalHours <= 0) return allocations;
  const shares = rows.map((row, index) => {
    const exact = cents * row.hours / totalHours;
    return { employeeId: row.employeeId, index, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = cents - shares.reduce((sum, share) => sum + share.cents, 0);
  shares.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) shares[index % shares.length].cents += 1;
  shares.forEach((share) => allocations.set(share.employeeId, share.cents));
  return allocations;
}

function formatMoney(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
}

function renderTips() {
  const table = document.querySelector("#tipsTable");
  const summary = document.querySelector("#tipsSummary");
  if (!currentTipDraft) {
    table.innerHTML = '<div class="empty-state">Caricamento prospetto...</div>';
    summary.innerHTML = "";
    return;
  }
  const rows = tipsRows();
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const cashAllocations = allocateTipCents(currentTipDraft.cashTotal, rows);
  const posAllocations = allocateTipCents(currentTipDraft.posTotal, rows);
  const totalTips = currentTipDraft.cashTotal + currentTipDraft.posTotal;
  summary.innerHTML = `
    <div><span>Ore totali</span><strong>${escapeHtml(formatHours(totalHours))}</strong></div>
    <div><span>Mance totali</span><strong>${escapeHtml(formatMoney(totalTips))}</strong></div>
    <div><span>Dipendenti</span><strong>${rows.filter((row) => row.hours > 0).length}</strong></div>
  `;
  table.innerHTML = `
    <div class="tips-row head">
      <div>Dipendente</div>
      <div>Ore lavorate</div>
      <div>Percentuale</div>
      <div>Contanti</div>
      <div>POS</div>
      <div>Totale</div>
    </div>
    ${rows.map((row) => {
      const cash = (cashAllocations.get(row.employeeId) || 0) / 100;
      const pos = (posAllocations.get(row.employeeId) || 0) / 100;
      const percentage = totalHours > 0 ? row.hours / totalHours * 100 : 0;
      return `
        <div class="tips-row">
          <div>
            <strong>${escapeHtml(row.employeeName)}</strong>
            ${row.archived ? '<small>Dipendente storico</small>' : ""}
          </div>
          <div>
            <input class="tips-hours-input" type="number" min="0" step="0.01" inputmode="decimal"
              data-employee-id="${escapeHtml(row.employeeId)}" value="${row.hours.toFixed(2)}"
              aria-label="Ore lavorate da ${escapeHtml(row.employeeName)}">
            ${Math.abs(row.hours - row.baseHours) > 0.001 ? `<small>Presenze: ${escapeHtml(formatHours(row.baseHours))}</small>` : ""}
          </div>
          <div><strong>${percentage.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</strong></div>
          <div>${escapeHtml(formatMoney(cash))}</div>
          <div>${escapeHtml(formatMoney(pos))}</div>
          <div><strong>${escapeHtml(formatMoney(cash + pos))}</strong></div>
        </div>
      `;
    }).join("")}
  `;
}

function setTipsNotice(message = "", type = "success") {
  const notice = document.querySelector("#tipsNotice");
  notice.textContent = message;
  notice.classList.toggle("hidden", !message);
  notice.classList.toggle("error", type === "error");
}

async function loadTipsMonth(month = document.querySelector("#tipsMonth").value || defaultTipsMonth()) {
  setTipsNotice("");
  document.querySelector("#tipsMonth").value = month;
  try {
    if (backendEnabled) {
      const [attendancePayload, tipsPayload] = await Promise.all([
        apiRequest("/api/attendance"),
        apiRequest(`/api/tips/${encodeURIComponent(month)}`)
      ]);
      attendanceRecords = Array.isArray(attendancePayload.records) ? attendancePayload.records : [];
      currentTipDraft = { month, ...normalizeTipMonth(tipsPayload.tips || {}) };
    } else {
      currentTipDraft = { month, ...normalizeTipMonth(tipMonths[month] || {}) };
    }
    document.querySelector("#tipsCashTotal").value = currentTipDraft.cashTotal.toFixed(2);
    document.querySelector("#tipsPosTotal").value = currentTipDraft.posTotal.toFixed(2);
    renderTips();
  } catch (error) {
    currentTipDraft = null;
    renderTips();
    setTipsNotice(error.message || "Caricamento mance non riuscito.", "error");
  }
}

function updateTipsTotals() {
  if (!currentTipDraft) return;
  currentTipDraft.cashTotal = Math.max(0, Number(document.querySelector("#tipsCashTotal").value) || 0);
  currentTipDraft.posTotal = Math.max(0, Number(document.querySelector("#tipsPosTotal").value) || 0);
  renderTips();
}

function updateTipsHours(event) {
  const input = event.target.closest(".tips-hours-input");
  if (!input || !currentTipDraft) return;
  currentTipDraft.hourOverrides[input.dataset.employeeId] = Math.max(0, Number(input.value) || 0);
  if (event.type === "change") renderTips();
}

function syncTipsHoursFromInputs() {
  if (!currentTipDraft) return;
  document.querySelectorAll(".tips-hours-input").forEach((input) => {
    currentTipDraft.hourOverrides[input.dataset.employeeId] = Math.max(0, Number(input.value) || 0);
  });
}

function resetTipsHours() {
  if (!currentTipDraft) return;
  currentTipDraft.hourOverrides = {};
  renderTips();
  setTipsNotice("Ore ripristinate dalle presenze. Salva il prospetto per confermare.");
}

async function saveTips() {
  if (!canManage() || !currentTipDraft) return;
  updateTipsTotals();
  syncTipsHoursFromInputs();
  const button = document.querySelector("#saveTips");
  button.disabled = true;
  button.textContent = "Salvataggio...";
  try {
    const payload = {
      cashTotal: currentTipDraft.cashTotal,
      posTotal: currentTipDraft.posTotal,
      hourOverrides: currentTipDraft.hourOverrides
    };
    if (backendEnabled) {
      const result = await apiRequest(`/api/tips/${encodeURIComponent(currentTipDraft.month)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      currentTipDraft = { month: currentTipDraft.month, ...normalizeTipMonth(result.tips) };
    } else {
      tipMonths[currentTipDraft.month] = { ...payload, updatedAt: new Date().toISOString() };
      currentTipDraft = { month: currentTipDraft.month, ...normalizeTipMonth(tipMonths[currentTipDraft.month]) };
      saveState();
    }
    renderTips();
    setTipsNotice("Prospetto mance salvato.");
  } catch (error) {
    setTipsNotice(error.message || "Salvataggio mance non riuscito.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Salva prospetto";
  }
}

function buildAttendanceRows(records) {
  const rows = [];
  const openByEmployee = new Map();
  records.forEach((record) => {
    if (record.type === "in") {
      const previousOpen = openByEmployee.get(record.employeeId);
      if (previousOpen) rows.push(rowFromAttendance(previousOpen));
      openByEmployee.set(record.employeeId, record);
      return;
    }
    const open = openByEmployee.get(record.employeeId);
    if (open) {
      rows.push(rowFromAttendance(open, record));
      openByEmployee.delete(record.employeeId);
    } else {
      rows.push(rowFromAttendance(null, record));
    }
  });
  openByEmployee.forEach((record) => rows.push(rowFromAttendance(record)));
  return rows.sort((a, b) => {
    const employeeCompare = a.employeeName.localeCompare(b.employeeName, "it", { sensitivity: "base" });
    return employeeCompare || new Date(a.sortDate) - new Date(b.sortDate);
  });
}

function rowFromAttendance(inRecord, outRecord = null) {
  const baseRecord = inRecord || outRecord;
  const date = new Date(baseRecord.timestamp);
  const employee = getEmployee(baseRecord.employeeId);
  return {
    employeeId: baseRecord.employeeId,
    employeeName: baseRecord.employeeName || employee?.name || "Dipendente",
    dateLabel: date.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
    dateInput: dateInputValue(date),
    in: inRecord || outRecord,
    out: outRecord,
    hours: attendanceDuration(inRecord?.timestamp, outRecord?.timestamp),
    sortDate: date.toISOString(),
    scheduledLabel: ""
  };
}

function shiftAttendanceLabel(shift) {
  const time = shift.start && shift.end ? `${shift.start.replace(" +1d", "")}-${shift.end}` : "";
  const place = shift.workplace ? ` · ${shift.workplace}` : "";
  return `${shift.type}${time ? ` ${time}` : ""}${place}`;
}

function scheduledWorkingShiftsInRange(from, to, employeeFilter = "all") {
  const startOffset = weekOffsetForDate(from);
  const endOffset = weekOffsetForDate(to);
  const rows = [];
  for (let offset = startOffset; offset <= endOffset; offset += 1) {
    const week = Number(offset) === Number(weekOffset) ? shifts : (shiftsByWeek[offset] || shiftsByWeek[String(offset)] || []);
    week.forEach((shift) => {
      if (shift.category === "rest" || shift.category === "leave") return;
      if (employeeFilter !== "all" && shift.employeeId !== employeeFilter) return;
      const date = dateForOffsetDay(shift.day, offset);
      if (date < startOfDay(from) || date > startOfDay(to)) return;
      rows.push({ ...shift, weekOffset: offset, date });
    });
  }
  return rows;
}

function withMissingScheduledAttendanceRows(rows, from, to, employeeFilter = "all") {
  const existingKeys = new Set(rows.map((row) => `${row.employeeId}:${row.dateInput}`));
  const noWorkByKey = new Map((attendanceNoWorkDays || [])
    .filter((day) => employeeFilter === "all" || day.employeeId === employeeFilter)
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date || ""))
    .map((day) => [`${day.employeeId}:${day.date}`, day]));
  const byEmployeeDay = new Map();
  const now = new Date();
  scheduledWorkingShiftsInRange(from, to, employeeFilter).forEach((shift) => {
    if (shiftDateTime(shift, "start") > now) return;
    const key = `${shift.employeeId}:${dateKeyValue(shift.date)}`;
    if (existingKeys.has(key)) return;
    const current = byEmployeeDay.get(key) || [];
    current.push(shift);
    byEmployeeDay.set(key, current);
  });
  const missingRows = [...byEmployeeDay.entries()].map(([key, dayShifts]) => {
    const [employeeId, dateInput] = key.split(":");
    const date = dateFromInput(dateInput);
    const employee = getEmployee(employeeId);
    const noWorkDay = noWorkByKey.get(key);
    return {
      employeeId,
      employeeName: employee?.name || "Dipendente",
      dateLabel: date.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
      dateInput,
      in: null,
      out: null,
      hours: 0,
      missing: !noWorkDay,
      noWork: Boolean(noWorkDay),
      noWorkId: noWorkDay?.id || "",
      noWorkReason: noWorkDay?.reason || "non_lavorato",
      noWorkNote: noWorkDay?.note || "",
      sortDate: date.toISOString(),
      scheduledLabel: dayShifts
        .sort((a, b) => shiftSortValue(a) - shiftSortValue(b))
        .map(shiftAttendanceLabel)
        .join(" | ")
    };
  });
  return [...rows, ...missingRows].sort((a, b) => {
    const employeeCompare = a.employeeName.localeCompare(b.employeeName, "it", { sensitivity: "base" });
    return employeeCompare || new Date(a.sortDate) - new Date(b.sortDate);
  });
}

function withPendingManualAttendanceRows(rows, from, to, employeeFilter = "all") {
  const periodStart = startOfDay(from);
  const periodEnd = startOfDay(to);
  const pendingRows = (manualAttendanceRequests || [])
    .filter((request) => request.status === "pending")
    .filter((request) => employeeFilter === "all" || request.employeeId === employeeFilter)
    .filter((request) => {
      const businessDate = attendanceBusinessDate(new Date(request.startTimestamp));
      return businessDate >= periodStart && businessDate <= periodEnd;
    })
    .map((request) => {
      const startDate = new Date(request.startTimestamp);
      const endDate = new Date(request.endTimestamp);
      const employee = getEmployee(request.employeeId);
      return {
        employeeId: request.employeeId,
        employeeName: request.employeeName || employee?.name || "Dipendente",
        dateLabel: startDate.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
        dateInput: attendanceBusinessDateInput(request.startTimestamp),
        in: { timestamp: request.startTimestamp },
        out: { timestamp: request.endTimestamp },
        hours: attendanceDuration(request.startTimestamp, request.endTimestamp),
        pendingManual: true,
        manualRequestId: request.id,
        sortDate: startDate.toISOString(),
        scheduledLabel: `Richiesta dipendente ${attendanceTime(request.startTimestamp)}-${attendanceTime(request.endTimestamp)}${request.crossesMidnight ? " +1g" : ""}${request.note ? ` · ${request.note}` : ""}${request.emailSentAt ? " · email inviata" : request.emailError ? ` · email non inviata: ${request.emailError}` : ""}`
      };
    });
  return [...rows, ...pendingRows].sort((a, b) => {
    const employeeCompare = a.employeeName.localeCompare(b.employeeName, "it", { sensitivity: "base" });
    return employeeCompare || new Date(a.sortDate) - new Date(b.sortDate);
  });
}

function populateAttendanceCorrectionEmployees() {
  document.querySelector("#attendanceCorrectionEmployee").innerHTML = sortedEmployees()
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("");
}

function populateAttendanceImportEmployees() {
  const select = document.querySelector("#attendanceImportEmployee");
  if (!select) return;
  select.innerHTML = '<option value="">Leggi dal file</option>' + sortedEmployees()
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error("File non leggibile."));
    reader.readAsDataURL(file);
  });
}

async function attendanceImportPayload() {
  const file = document.querySelector("#attendanceImportFile").files[0];
  return {
    fileName: file?.name || "",
    fileBase64: await fileToBase64(file),
    text: document.querySelector("#attendanceImportText").value,
    employeeId: document.querySelector("#attendanceImportEmployee").value
  };
}

function renderAttendanceImportPreview(payload) {
  const box = document.querySelector("#attendanceImportPreview");
  const confirmButton = document.querySelector("#confirmAttendanceImport");
  attendanceImportRows = Array.isArray(payload.rows) ? payload.rows : [];
  confirmButton.disabled = attendanceImportRows.length === 0;
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const rowsHtml = attendanceImportRows.slice(0, 20).map((row) => `
    <div class="attendance-import-row">
      <strong>${escapeHtml(row.employeeName)}</strong>
      <span>${escapeHtml(row.date)}</span>
      <span>${escapeHtml(row.start)} - ${escapeHtml(row.end)}</span>
      <span>${escapeHtml(formatHours(row.hours))}</span>
    </div>
  `).join("");
  const errorsHtml = errors.length
    ? `<div class="attendance-import-errors">${errors.slice(0, 12).map((error) => `<p>${escapeHtml(error)}</p>`).join("")}${errors.length > 12 ? `<p>Altri ${errors.length - 12} errori...</p>` : ""}</div>`
    : "";
  box.classList.remove("empty-state");
  box.innerHTML = `
    <div class="attendance-import-summary">
      <strong>${attendanceImportRows.length} righe valide</strong>
      <span>${errors.length ? `${errors.length} righe da controllare` : "Nessun errore rilevato"}</span>
    </div>
    ${rowsHtml || '<div class="empty-state">Nessuna riga valida trovata.</div>'}
    ${attendanceImportRows.length > 20 ? `<div class="empty-state">Anteprima limitata alle prime 20 righe.</div>` : ""}
    ${errorsHtml}
  `;
}

async function previewAttendanceImport() {
  if (!canManage()) return;
  const preview = document.querySelector("#attendanceImportPreview");
  document.querySelector("#confirmAttendanceImport").disabled = true;
  preview.classList.add("empty-state");
  preview.textContent = "Lettura file in corso...";
  try {
    const payload = await apiRequest("/api/attendance/import", {
      method: "POST",
      body: JSON.stringify({ ...(await attendanceImportPayload()), dryRun: true })
    });
    renderAttendanceImportPreview(payload);
  } catch (error) {
    attendanceImportRows = [];
    preview.textContent = error.message || "Import non riuscito.";
    showAppNotice(error.message || "Import non riuscito.", "error");
  }
}

async function confirmAttendanceImport() {
  if (!canManage() || !attendanceImportRows.length) return;
  const confirmed = confirm(`Importare ${attendanceImportRows.length} righe di presenze?`);
  if (!confirmed) return;
  const button = document.querySelector("#confirmAttendanceImport");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Importazione...";
  try {
    const payload = await apiRequest("/api/attendance/import", {
      method: "POST",
      body: JSON.stringify({ ...(await attendanceImportPayload()), dryRun: false })
    });
    applyState(payload.state);
    applyUser(currentUser);
    attendanceRecords = Array.isArray(payload.records) ? payload.records : attendanceRecords;
    renderAttendanceImportPreview(payload);
    render();
    renderAttendanceList();
    showAppNotice(`Import completato: ${payload.createdRecords} timbrature create.`);
  } catch (error) {
    showAppNotice(error.message || "Import non completato.", "error");
  } finally {
    button.textContent = originalLabel;
    button.disabled = attendanceImportRows.length === 0;
  }
}

function localTimestampFromAttendanceForm() {
  const date = dateFromItalianInput(document.querySelector("#attendanceCorrectionDate").value);
  const time = normalizedTimeInput("#attendanceCorrectionTime");
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toISOString();
}

function openAttendanceCorrection(record = null, defaults = {}) {
  editingAttendanceId = record?.id || null;
  populateAttendanceCorrectionEmployees();
  const date = record?.timestamp ? new Date(record.timestamp) : defaults.date ? dateFromInput(defaults.date) : new Date();
  const type = record?.type || defaults.type || "in";
  document.querySelector("#attendanceCorrectionTitle").textContent = record ? "Correggi timbratura" : "Aggiungi timbratura";
  document.querySelector("#attendanceCorrectionEmployee").value = record?.employeeId || defaults.employeeId || employees[0]?.id || "";
  document.querySelector("#attendanceCorrectionType").value = type;
  document.querySelector("#attendanceCorrectionDate").value = italianDateInputValue(date);
  document.querySelector("#attendanceCorrectionTime").value = record?.timestamp ? timeInputValue(new Date(record.timestamp)) : defaults.time || timeInputValue(new Date());
  document.querySelector("#attendanceCorrectionNote").value = record?.note || defaults.note || "";
  document.querySelector("#deleteAttendanceCorrection").classList.toggle("hidden", !record);
  attendanceCorrectionDialog.showModal();
}

async function saveAttendanceCorrection(event) {
  event.preventDefault();
  if (!canManage()) return;
  if (!requireTimeInput("#attendanceCorrectionTime", "l'orario")) return;
  const submitButton = document.querySelector("#attendanceCorrectionForm button[type='submit']");
  const originalLabel = submitButton?.textContent || "";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Salvataggio...";
  }
  const payload = {
    employeeId: document.querySelector("#attendanceCorrectionEmployee").value,
    type: document.querySelector("#attendanceCorrectionType").value,
    timestamp: localTimestampFromAttendanceForm(),
    note: document.querySelector("#attendanceCorrectionNote").value.trim()
  };
  const endpoint = editingAttendanceId ? `/api/attendance/${editingAttendanceId}` : "/api/attendance/manual";
  const method = editingAttendanceId ? "PATCH" : "POST";
  try {
    const response = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(payload)
    });
    applyState(response.state);
    applyUser(currentUser);
    attendanceRecords = Array.isArray(response.records) ? response.records : attendanceRecords;
    attendanceCorrectionDialog.close();
    editingAttendanceId = null;
    render();
    renderAttendanceList();
    showAppNotice("Presenza salvata sul server.");
  } catch (error) {
    showAppNotice(error.message || "Presenza non salvata. Ricarica le presenze e riprova.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

async function deleteAttendanceCorrection() {
  if (!editingAttendanceId || !canManage()) return;
  await deleteAttendanceRecord(editingAttendanceId);
  attendanceCorrectionDialog.close();
  editingAttendanceId = null;
}

async function deleteAttendanceRecord(recordId) {
  if (!recordId || !canManage()) return;
  const confirmed = confirm("Eliminare questa timbratura? L'operazione verra registrata nello storico.");
  if (!confirmed) return;
  try {
    const response = await apiRequest(`/api/attendance/${recordId}`, { method: "DELETE" });
    applyState(response.state);
    applyUser(currentUser);
    attendanceRecords = Array.isArray(response.records) ? response.records : attendanceRecords;
    render();
    renderAttendanceList();
    showAppNotice("Timbratura eliminata dal server.");
  } catch (error) {
    showAppNotice(error.message || "Timbratura non eliminata. Ricarica le presenze e riprova.", "error");
  }
}

async function markAttendanceNoWorkDay(employeeId, date) {
  if (!employeeId || !date || !canManage()) return;
  const employee = getEmployee(employeeId);
  const reasonText = prompt(`Tipo assenza per ${employee?.name || "dipendente"}: malattia, assenza, permesso, non lavorato`, "non lavorato");
  if (reasonText === null) return;
  const normalizedReason = String(reasonText || "").toLowerCase().replace(/\s+/g, "_");
  const reason = {
    malattia: "malattia",
    assenza: "assenza",
    permesso: "permesso",
    non_lavorato: "non_lavorato",
    "non-lavorato": "non_lavorato",
    altro: "altro"
  }[normalizedReason] || "non_lavorato";
  const note = prompt("Nota opzionale:", reason === "non_lavorato" ? "Lasciato libero all'ultimo" : attendanceAbsenceLabel(reason));
  if (note === null) return;
  try {
    const response = await apiRequest("/api/attendance/no-work", {
      method: "POST",
      body: JSON.stringify({ employeeId, date, reason, note })
    });
    applyState(response.state);
    applyUser(currentUser);
    attendanceRecords = Array.isArray(response.records) ? response.records : attendanceRecords;
    manualAttendanceRequests = Array.isArray(response.manualRequests) ? response.manualRequests : manualAttendanceRequests;
    attendanceNoWorkDays = Array.isArray(response.noWorkDays) ? response.noWorkDays : attendanceNoWorkDays;
    attendanceRevenue = response.revenue && typeof response.revenue === "object" ? response.revenue : attendanceRevenue;
    render();
    renderAttendanceList();
    showAppNotice(`${attendanceAbsenceLabel(reason)} salvata.`);
  } catch (error) {
    showAppNotice(error.message || "Giornata non aggiornata. Riprova.", "error");
  }
}

async function undoAttendanceNoWorkDay(noWorkId) {
  if (!noWorkId || !canManage()) return;
  const confirmed = confirm("Ripristinare questa giornata come presenza mancante?");
  if (!confirmed) return;
  try {
    const response = await apiRequest(`/api/attendance/no-work/${noWorkId}`, { method: "DELETE" });
    applyState(response.state);
    applyUser(currentUser);
    attendanceRecords = Array.isArray(response.records) ? response.records : attendanceRecords;
    manualAttendanceRequests = Array.isArray(response.manualRequests) ? response.manualRequests : manualAttendanceRequests;
    attendanceNoWorkDays = Array.isArray(response.noWorkDays) ? response.noWorkDays : attendanceNoWorkDays;
    render();
    renderAttendanceList();
    showAppNotice("Giornata ripristinata tra le presenze mancanti.");
  } catch (error) {
    showAppNotice(error.message || "Segnalazione non rimossa. Riprova.", "error");
  }
}

function bindAttendanceCorrectionActions() {
  document.querySelectorAll(".edit-attendance-record").forEach((button) => {
    button.addEventListener("click", () => {
      const record = attendanceRecords.find((item) => item.id === button.dataset.recordId);
      if (record) openAttendanceCorrection(record);
    });
  });
  document.querySelectorAll(".add-attendance-out").forEach((button) => {
    button.addEventListener("click", () => {
      openAttendanceCorrection(null, {
        employeeId: button.dataset.employeeId,
        date: button.dataset.date,
        type: "out",
        note: "Uscita inserita manualmente"
      });
    });
  });
  document.querySelectorAll(".add-attendance-in").forEach((button) => {
    button.addEventListener("click", () => {
      openAttendanceCorrection(null, {
        employeeId: button.dataset.employeeId,
        date: button.dataset.date,
        type: "in",
        note: "Entrata inserita da giorno programmato senza timbratura"
      });
    });
  });
  document.querySelectorAll(".delete-attendance-record").forEach((button) => {
    button.addEventListener("click", () => deleteAttendanceRecord(button.dataset.recordId));
  });
  document.querySelectorAll(".mark-no-work-day").forEach((button) => {
    button.addEventListener("click", () => markAttendanceNoWorkDay(button.dataset.employeeId, button.dataset.date));
  });
  document.querySelectorAll(".undo-no-work-day").forEach((button) => {
    button.addEventListener("click", () => undoAttendanceNoWorkDay(button.dataset.noWorkId));
  });
  document.querySelectorAll(".approve-manual-attendance").forEach((button) => {
    button.addEventListener("click", () => reviewManualAttendanceRequest(button.dataset.requestId, "approve"));
  });
  document.querySelectorAll(".reject-manual-attendance").forEach((button) => {
    button.addEventListener("click", () => reviewManualAttendanceRequest(button.dataset.requestId, "reject"));
  });
}

async function reviewManualAttendanceRequest(requestId, action) {
  if (!requestId || !canManage()) return;
  let rejectionNote = "";
  if (action === "reject") {
    rejectionNote = prompt("Motivo del rifiuto, opzionale:") || "";
  }
  try {
    const response = await apiRequest(`/api/attendance/manual-request/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ action, rejectionNote })
    });
    applyState(response.state);
    applyUser(currentUser);
    attendanceRecords = Array.isArray(response.records) ? response.records : attendanceRecords;
    manualAttendanceRequests = Array.isArray(response.manualRequests) ? response.manualRequests : manualAttendanceRequests;
    render();
    renderAttendanceList();
    showAppNotice(action === "approve" ? "Timbratura manuale approvata." : "Richiesta respinta.");
  } catch (error) {
    showAppNotice(error.message || "Richiesta non aggiornata.", "error");
  }
}

function printAttendanceSheet() {
  renderAttendanceList();
  document.body.classList.add("printing-attendance");
  window.print();
  setTimeout(() => document.body.classList.remove("printing-attendance"), 500);
}

function attendanceExportFileName(prefix) {
  const employeeId = document.querySelector("#attendanceEmployeeFilter").value;
  const employee = employeeId && employeeId !== "all" ? getEmployee(employeeId) : null;
  const employeeLabel = employee ? employee.name : "tutti";
  const from = document.querySelector("#attendanceFrom").value.replace(/\D+/g, "-");
  const to = document.querySelector("#attendanceTo").value.replace(/\D+/g, "-");
  return `${prefix}-${employeeLabel}-${from}-${to}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

async function exportAttendanceSummaryCsv() {
  const summaryRows = attendanceSummaryRows();
  if (!summaryRows.length) return;
  const rows = [
    ["dipendente", "giornate", "ore", "timbrature_aperte", "presenze_mancanti", "non_lavorati", "da_approvare"],
    ...summaryRows.map((row) => [row.employeeName, row.days, formatAttendanceExportHours(row.hours), row.open, row.missing, row.noWork, row.pending])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${attendanceExportFileName("riepilogo-presenze")}.csv`);
  await logManagerActivity({
    type: "Presenze",
    title: "Riepilogo presenze esportato",
    detail: `${document.querySelector("#attendanceFrom").value} - ${document.querySelector("#attendanceTo").value}`
  });
}

async function exportAttendanceDetailCsv() {
  const rows = currentAttendanceRows();
  if (!rows.length) return;
  const employeeFilter = document.querySelector("#attendanceEmployeeFilter").value || "all";
  const csvRows = employeeFilter === "all"
    ? [["dipendente", "data", "inizio", "fine", "ore_lavorate", "stato", "turno_programmato"]]
    : [["data", "inizio", "fine", "ore_lavorate", "stato", "turno_programmato"]];
  let totalHours = 0;
  rows.forEach((row) => {
    totalHours += row.hours;
    const line = [
      row.dateLabel,
      row.in ? attendanceTime(row.in.timestamp) : "",
      row.out ? attendanceTime(row.out.timestamp) : "",
      row.out ? formatAttendanceExportHours(row.hours) : "0",
      row.pendingManual ? "Da approvare" : row.noWork ? "Non lavorato" : row.missing ? "Mancante" : row.out ? "Completa" : "Aperta",
      row.scheduledLabel || ""
    ];
    csvRows.push(employeeFilter === "all" ? [row.employeeName, ...line] : line);
  });
  const totalLine = employeeFilter === "all"
    ? ["Totale", "", "", "", formatAttendanceExportHours(totalHours), "", ""]
    : ["Totale", "", "", formatAttendanceExportHours(totalHours), "", ""];
  csvRows.push(totalLine);
  const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${attendanceExportFileName("dettaglio-presenze")}.csv`);
  await logManagerActivity({
    type: "Presenze",
    title: "Dettaglio presenze esportato",
    detail: `${document.querySelector("#attendanceFrom").value} - ${document.querySelector("#attendanceTo").value}`
  });
}

function printAttendanceSummary() {
  renderAttendanceList();
  document.body.classList.add("printing-attendance-summary");
  window.print();
  setTimeout(() => document.body.classList.remove("printing-attendance-summary"), 500);
}

function historyDateLabel(value) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function logManagerActivity(activity) {
  const entry = {
    type: activity.type || "Evento",
    title: activity.title || "Attivita registrata",
    detail: activity.detail || "",
    weekOffset: Number.isFinite(Number(activity.weekOffset)) ? Number(activity.weekOffset) : weekOffset
  };
  if (backendEnabled && currentUser?.role === "manager") {
    try {
      const payload = await apiRequest("/api/activity", {
        method: "POST",
        body: JSON.stringify(entry)
      });
      activityLog = Array.isArray(payload.activityLog) ? payload.activityLog : activityLog;
      return;
    } catch {
      // The file download already happened; keep the UI responsive if history logging fails.
    }
  }
  activityLog = [{
    id: `l${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...entry,
    createdAt: new Date().toISOString()
  }, ...activityLog].slice(0, 500);
  saveState();
}

async function loadHistory() {
  const list = document.querySelector("#historyList");
  list.innerHTML = '<div class="empty-state">Caricamento storico...</div>';
  try {
    if (backendEnabled && currentUser?.role === "manager") {
      const payload = await apiRequest("/api/activity");
      activityLog = Array.isArray(payload.activityLog) ? payload.activityLog : [];
    }
    renderHistoryList();
  } catch {
    list.innerHTML = '<div class="empty-state">Storico disponibile solo come manager.</div>';
  }
}

function renderHistoryList() {
  const list = document.querySelector("#historyList");
  const filtered = activityLog.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">Nessuna attivita registrata ancora.</div>';
    return;
  }
  list.innerHTML = filtered.map((event) => `
    <div class="history-row">
      <div>
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(event.detail || "Nessun dettaglio")}</span>
      </div>
      <div>
        <em>${escapeHtml(event.type || "Evento")}</em>
        <small>${escapeHtml(historyDateLabel(event.createdAt))}</small>
      </div>
    </div>
  `).join("");
}

function exportHistoryCsv() {
  if (!activityLog.length) return;
  const rows = [
    ["data", "tipo", "azione", "dettaglio", "settimana"],
    ...activityLog.map((event) => [
      historyDateLabel(event.createdAt),
      event.type || "",
      event.title || "",
      event.detail || "",
      event.weekOffset ?? ""
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `storico-operativo-${new Date().toISOString().slice(0, 10)}.csv`);
}

function populateIntermittentiDialog() {
  document.querySelector("#intermittentiDay").innerHTML = weekDays
    .map((day) => `<option value="${day.key}">${escapeHtml(day.label)}</option>`)
    .join("");
  document.querySelector("input[name='intermittentiScope'][value='week']").checked = true;
  document.querySelector("#intermittentiEmployerFiscalCode").value = companySettings.employerFiscalCode || "";
  document.querySelector("#intermittentiEmail").value = companySettings.agencyEmail || "";
  updateIntermittentiScopeFields();
  renderIntermittentiPreview();
}

function updateIntermittentiScopeFields() {
  const scope = document.querySelector("input[name='intermittentiScope']:checked").value;
  document.querySelectorAll(".intermittenti-day-field").forEach((field) => {
    field.classList.toggle("hidden", scope !== "day");
  });
}

function workingIntermittentShifts() {
  const scope = document.querySelector("input[name='intermittentiScope']:checked").value;
  const dayKey = document.querySelector("#intermittentiDay").value;
  const intermittentIds = new Set(employees.filter((employee) => employee.intermittent).map((employee) => employee.id));
  return ensureWeek(weekOffset)
    .filter((shift) => intermittentIds.has(shift.employeeId))
    .filter((shift) => shift.category !== "rest" && shift.category !== "leave")
    .filter((shift) => scope === "week" || shift.day === dayKey)
    .sort((a, b) => shiftSortValue(a) - shiftSortValue(b));
}

function dateForShiftDay(dayKey) {
  return weekDays.find((day) => day.key === dayKey)?.date || weekDays[0].date;
}

function formatItalianDate(date) {
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildIntermittentiRows() {
  const shiftsByEmployee = new Map();
  workingIntermittentShifts().forEach((shift) => {
    const date = dateForShiftDay(shift.day);
    const key = dateInputValue(date);
    const current = shiftsByEmployee.get(shift.employeeId) || new Set();
    current.add(key);
    shiftsByEmployee.set(shift.employeeId, current);
  });

  const rows = [];
  shiftsByEmployee.forEach((dateSet, employeeId) => {
    const employee = getEmployee(employeeId);
    const sortedDates = [...dateSet].sort();
    let groupStart = null;
    let groupEnd = null;
    sortedDates.forEach((value) => {
      const date = dateFromInput(value);
      if (!groupStart) {
        groupStart = date;
        groupEnd = date;
        return;
      }
      const expectedNext = dateInputValue(addDays(groupEnd, 1));
      if (value === expectedNext) {
        groupEnd = date;
        return;
      }
      rows.push(intermittentiRow(employee, groupStart, groupEnd));
      groupStart = date;
      groupEnd = date;
    });
    if (groupStart) rows.push(intermittentiRow(employee, groupStart, groupEnd));
  });

  return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName, "it", { sensitivity: "base" }) || a.start.localeCompare(b.start));
}

function intermittentiRow(employee, start, end) {
  const singleDay = dateInputValue(start) === dateInputValue(end);
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    fiscalCode: employee.fiscalCode || "",
    communicationCode: employee.communicationCode || "",
    start: formatItalianDate(start),
    end: singleDay ? "" : formatItalianDate(end)
  };
}

function renderIntermittentiPreview() {
  const rows = buildIntermittentiRows();
  const summary = document.querySelector("#intermittentiSummary");
  const preview = document.querySelector("#intermittentiPreview");
  const missingFiscalCodes = rows.filter((row) => !row.fiscalCode).length;
  const pdfCount = intermittentiPdfChunks(rows).length;
  summary.textContent = rows.length
    ? `${rows.length} chiamate trovate${missingFiscalCodes ? ` · ${missingFiscalCodes} senza codice fiscale` : ""} · ${pdfCount} PDF da generare.`
    : "Nessun turno per dipendenti a chiamata nel periodo selezionato.";
  if (!rows.length) {
    preview.innerHTML = '<div class="empty-state">Marca i dipendenti a chiamata e inserisci il codice fiscale nella loro scheda.</div>';
    return;
  }
  preview.innerHTML = `
    <div class="intermittenti-table">
      <div class="intermittenti-row head">
        <div>Lavoratore</div>
        <div>Codice fiscale</div>
        <div>Codice comunicazione</div>
        <div>Dal</div>
        <div>Al</div>
      </div>
      ${rows.map((row, index) => `
        <div class="intermittenti-row">
          <div><strong>${escapeHtml(row.employeeName)}</strong></div>
          <div>${row.fiscalCode ? escapeHtml(row.fiscalCode) : '<span class="missing-value">Mancante</span>'}</div>
          <div>${row.communicationCode ? escapeHtml(row.communicationCode) : "-"}</div>
          <div>${escapeHtml(row.start)}</div>
          <div>${escapeHtml(row.end)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

const intermittentiPdfRowLimit = 10;

function intermittentiPdfChunks(rows) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += intermittentiPdfRowLimit) {
    chunks.push(rows.slice(index, index + intermittentiPdfRowLimit));
  }
  return chunks;
}

function intermittentiFileBaseName() {
  const scope = document.querySelector("input[name='intermittentiScope']:checked").value;
  const selectedDay = weekDays.find((day) => day.key === document.querySelector("#intermittentiDay").value);
  const label = scope === "day" && selectedDay ? selectedDay.label : formatWeekRange();
  return `chiamate-intermittenti-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function intermittentiPdfFileName(baseName, index, total) {
  if (total <= 1) return `${baseName}.pdf`;
  return `${baseName}-parte-${String(index + 1).padStart(2, "0")}-di-${String(total).padStart(2, "0")}.pdf`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadIntermittentiCsv() {
  syncIntermittentiSettings();
  const rows = buildIntermittentiRows();
  if (!rows.length) return;
  const employerFiscalCode = document.querySelector("#intermittentiEmployerFiscalCode").value.trim().toUpperCase();
  const email = document.querySelector("#intermittentiEmail").value.trim();
  const csvRows = [
    ["codice_fiscale_datore", "email", "codice_fiscale_lavoratore", "codice_comunicazione", "data_inizio", "data_fine"],
    ...rows.map((row) => [employerFiscalCode, email, row.fiscalCode, row.communicationCode, row.start, row.end])
  ];
  const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${intermittentiFileBaseName()}.csv`);
  await logManagerActivity({
    type: "Chiamate",
    title: "CSV chiamate generato",
    detail: `${rows.length} lavoratori · ${formatWeekRange()}`,
    weekOffset
  });
}

async function downloadIntermittentiPdf() {
  syncIntermittentiSettings();
  const rows = buildIntermittentiRows();
  if (!rows.length) return;
  const employerFiscalCode = document.querySelector("#intermittentiEmployerFiscalCode").value.trim().toUpperCase();
  const email = document.querySelector("#intermittentiEmail").value.trim();
  const chunks = intermittentiPdfChunks(rows);
  const baseName = intermittentiFileBaseName();
  for (const [index, chunk] of chunks.entries()) {
    const bytes = await createIntermittentiPdfFromTemplate(chunk, employerFiscalCode, email);
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), intermittentiPdfFileName(baseName, index, chunks.length));
  }
  await logManagerActivity({
    type: "Chiamate",
    title: "PDF chiamate generato",
    detail: `${rows.length} righe · ${chunks.length} PDF · ${formatWeekRange()}`,
    weekOffset
  });
}

function syncIntermittentiSettings() {
  companySettings = normalizeCompanySettings({
    ...companySettings,
    employerFiscalCode: document.querySelector("#intermittentiEmployerFiscalCode").value,
    agencyEmail: document.querySelector("#intermittentiEmail").value
  });
  saveState();
}

function pdfEscape(value) {
  return String(value || "")
    .replace(/[\\()]/g, "\\$&")
    .replace(/[^\x20-\x7E]/g, "");
}

async function createIntermittentiPdfFromTemplate(rows, employerFiscalCode, email) {
  const response = await fetch("intermittenti-modello.pdf", { cache: "no-store" });
  if (!response.ok) throw new Error("Modello PDF non disponibile.");
  const template = bytesToBinaryString(new Uint8Array(await response.arrayBuffer()));
  const values = {
    CFdatorelavoro: employerFiscalCode,
    EMmail: email
  };
  for (let index = 1; index <= 10; index += 1) {
    const row = rows[index - 1] || {};
    values[`CFlavoratore${index}`] = row.fiscalCode || "";
    values[`CCcodcomunicazione${index}`] = row.communicationCode || "";
    values[`DTdatainizio${index}`] = row.start || "";
    values[`DTdatafine${index}`] = row.end || "";
  }
  return fillPdfAcroForm(template, values);
}

function bytesToBinaryString(bytes) {
  let result = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return result;
}

function binaryStringToBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 255;
  return bytes;
}

function fillPdfAcroForm(template, values) {
  const objects = new Map();
  const objectRegex = /(?:^|\n)(\d+)\s+0\s+obj\s*\n([\s\S]*?)\nendobj/g;
  let match;
  while ((match = objectRegex.exec(template))) {
    objects.set(Number(match[1]), match[2]);
  }
  objects.forEach((body, id) => {
    Object.entries(values).forEach(([field, value]) => {
      if (body.includes(`.${field}[0]`) || body.includes(`(${field})`)) {
        body = setPdfFieldValue(body, value);
      }
    });
    objects.set(id, body);
  });
  return rebuildPdf(objects);
}

function setPdfFieldValue(body, value) {
  const encoded = `(${pdfEscape(value)})`;
  if (/\/V\s*\([^)]*\)/.test(body)) {
    body = body.replace(/\/V\s*\([^)]*\)/, `/V ${encoded}`);
  } else if (/\/StructParent\b/.test(body)) {
    body = body.replace(/\/StructParent\b/, `/V ${encoded} /StructParent`);
  } else {
    body = body.replace(/>>\s*$/, `/V ${encoded} >>`);
  }
  if (/\/DV\s*\([^)]*\)/.test(body)) body = body.replace(/\/DV\s*\([^)]*\)/, `/DV ${encoded}`);
  return body;
}

function rebuildPdf(objects) {
  const maxId = Math.max(...objects.keys());
  let pdf = "%PDF-1.3\n";
  const offsets = Array(maxId + 1).fill(0);
  for (let id = 1; id <= maxId; id += 1) {
    if (!objects.has(id)) continue;
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= maxId; id += 1) {
    pdf += objects.has(id)
      ? `${String(offsets[id]).padStart(10, "0")} 00000 n \n`
      : "0000000000 65535 f \n";
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 64 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return binaryStringToBytes(pdf);
}

function openCompanySettings() {
  if (!canManage()) return;
  document.querySelector("#companyNameInput").value = companySettings.companyName;
  document.querySelector("#companyRolesInput").value = companySettings.roles.join(", ");
  document.querySelector("#companyWorkplacesInput").value = companySettings.workplaces.join(", ");
  document.querySelector("#companyWorkplaceGroupsInput").value = workplaceGroupsToText(companySettings.workplaceGroups || []);
  document.querySelector("#companyEmployerFiscalCodeInput").value = companySettings.employerFiscalCode || "";
  document.querySelector("#companyAgencyEmailInput").value = companySettings.agencyEmail || "";
  companySettingsDialog.showModal();
}

function saveCompanySettings(event) {
  event.preventDefault();
  if (!canManage()) return;
  const nextSettings = normalizeCompanySettings({
    companyName: document.querySelector("#companyNameInput").value,
    roles: document.querySelector("#companyRolesInput").value,
    workplaces: document.querySelector("#companyWorkplacesInput").value,
    workplaceGroups: document.querySelector("#companyWorkplaceGroupsInput").value,
    employerFiscalCode: document.querySelector("#companyEmployerFiscalCodeInput").value,
    agencyEmail: document.querySelector("#companyAgencyEmailInput").value
  });
  companySettings = nextSettings;
  companySettingsDialog.close();
  populateForm();
  render();
  saveState();
}

function buildNotificationMessages() {
  const scope = document.querySelector("input[name='notificationScope']:checked").value;
  const dayKey = document.querySelector("#notificationDay").value;
  const intro = document.querySelector("#notificationIntro").value.trim() || "Ciao, questi sono i tuoi turni aggiornati:";
  const selectedDay = weekDays.find((day) => day.key === dayKey);
  const periodLabel = scope === "week" ? `settimana ${formatWeekRange()}` : selectedDay?.label || "giorno selezionato";
  const sourceShifts = ensureWeek(weekOffset)
    .filter((shift) => scope === "week" || shift.day === dayKey)
    .sort((a, b) => shiftSortValue(a) - shiftSortValue(b));

  generatedNotificationMessages = sortedEmployees()
    .map((employee) => {
      const employeeShifts = sourceShifts.filter((shift) => shift.employeeId === employee.id);
      if (!employeeShifts.length) return null;
      const lines = employeeShifts.map((shift) => shiftLineForMessage(shift)).join("\n");
      const publicationNote = scope === "week"
        ? (isWeekPublished() ? "" : "\n\nNota: questa settimana non è ancora pubblicata nell'app.")
        : (isPeriodPublished(dayKey) ? "" : "\n\nNota: questo giorno non è ancora pubblicato nell'app.");
      return {
        key: notificationKey(scope, dayKey, employee.id),
        employeeId: employee.id,
        employeeName: employee.name,
        phone: employee.phone || "",
        email: employee.email || "",
        shiftCount: employeeShifts.length,
        text: `${intro}\n\n${periodLabel}\n${lines}${publicationNote}`
      };
    })
    .filter(Boolean);

  notificationLog = [
    {
      id: `n${Date.now()}`,
      createdAt: new Date().toISOString(),
      scope,
      day: scope === "day" ? dayKey : "",
      weekOffset,
      messageCount: generatedNotificationMessages.length
    },
    ...notificationLog
  ].slice(0, 30);
  renderNotificationMessages();
  saveState();
}

function renderNotificationMessages() {
  const list = document.querySelector("#notificationList");
  const summary = document.querySelector("#notificationSummary");
  summary.textContent = generatedNotificationMessages.length
    ? `${generatedNotificationMessages.length} messaggi pronti. Copiali singolarmente o tutti insieme.`
    : "Nessun turno trovato per il periodo selezionato.";
  if (!generatedNotificationMessages.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = `
    <button class="primary-button" id="copyAllNotifications" type="button">Copia tutti i messaggi</button>
    ${generatedNotificationMessages.map((message, index) => `
      ${(() => {
        const sent = notificationStatusFor(message.key);
        return `
      <article class="notification-row">
        <div class="notification-row-head">
          <div>
            <strong>${escapeHtml(message.employeeName)}</strong>
            <span>${message.shiftCount} elementi · ${message.phone ? escapeHtml(message.phone) : "telefono mancante"}${message.email ? ` · ${escapeHtml(message.email)}` : ""}</span>
            <span class="notice-status ${sent ? "sent" : ""}">${sent ? `Avvisato ${escapeHtml(new Date(sent.sentAt).toLocaleString("it-IT"))}` : "Da avvisare"}</span>
          </div>
          <div class="notification-actions">
            <button class="ghost-button copy-notification" type="button" data-notification-index="${index}">Copia messaggio</button>
            <button class="ghost-button mark-notified" type="button" data-notification-index="${index}">${sent ? "Segna da avvisare" : "Segna avvisato"}</button>
          </div>
        </div>
        <textarea class="notification-message" readonly>${escapeHtml(message.text)}</textarea>
      </article>
        `;
      })()}
    `).join("")}
  `;
  bindNotificationCopyActions();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function bindNotificationCopyActions() {
  document.querySelectorAll(".copy-notification").forEach((button) => {
    button.addEventListener("click", async () => {
      const message = generatedNotificationMessages[Number(button.dataset.notificationIndex)];
      if (!message) return;
      await copyText(message.text);
      button.textContent = "Copiato";
      setTimeout(() => {
        button.textContent = "Copia messaggio";
      }, 1200);
    });
  });
  const copyAll = document.querySelector("#copyAllNotifications");
  if (copyAll) {
    copyAll.addEventListener("click", async () => {
      const text = generatedNotificationMessages
        .map((message) => `${message.employeeName}\n${message.text}`)
        .join("\n\n---\n\n");
      await copyText(text);
      copyAll.textContent = "Copiati";
      setTimeout(() => {
        copyAll.textContent = "Copia tutti i messaggi";
      }, 1200);
    });
  }
  document.querySelectorAll(".mark-notified").forEach((button) => {
    button.addEventListener("click", () => {
      const message = generatedNotificationMessages[Number(button.dataset.notificationIndex)];
      if (!message) return;
      if (notificationStatus[message.key]) {
        const nextStatus = { ...notificationStatus };
        delete nextStatus[message.key];
        notificationStatus = nextStatus;
      } else {
        notificationStatus = {
          ...notificationStatus,
          [message.key]: {
            sentAt: new Date().toISOString(),
            employeeId: message.employeeId
          }
        };
      }
      renderNotificationMessages();
      saveState();
    });
  });
}

function printableShiftRows(dayKey) {
  return ensureWeek(weekOffset)
    .filter((shift) => shift.day === dayKey && shift.category !== "rest" && shift.category !== "leave")
    .sort((a, b) => {
      const timeCompare = (timeToMinutes(a.start) || 9999) - (timeToMinutes(b.start) || 9999);
      const employeeCompare = (getEmployee(a.employeeId)?.name || "").localeCompare(getEmployee(b.employeeId)?.name || "", "it", { sensitivity: "base" });
      return timeCompare || employeeCompare;
    });
}

function renderPrintDay(day) {
  const rows = printableShiftRows(day.key);
  if (!rows.length) {
    return `
      <section class="print-day-section">
        <h3>${escapeHtml(day.label)}</h3>
        <div class="print-empty">Nessun turno pianificato.</div>
      </section>
    `;
  }
  return `
    <section class="print-day-section">
      <h3>${escapeHtml(day.label)}</h3>
      <div class="print-day-shifts">
        ${rows.map((shift) => {
          const employee = getEmployee(shift.employeeId);
          const time = shift.start && shift.end ? `${shift.start} - ${shift.end}` : "Orario non impostato";
          return `
            <article class="print-shift-card">
              <div class="print-shift-time">${escapeHtml(time)}</div>
              <div>
                <strong>${escapeHtml(employee?.name || "Dipendente")}</strong>
                <span>${escapeHtml(shift.type)} · ${escapeHtml(shift.workplace || defaultWorkplace())}</span>
                ${shift.note ? `<small>${escapeHtml(shift.note)}</small>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderPrintPreview() {
  const scope = document.querySelector("input[name='printScope']:checked").value;
  const dayKey = document.querySelector("#printDay").value;
  const title = document.querySelector("#printTitle").value.trim() || `Turni ${companyLabel()}`;
  const days = scope === "week"
    ? weekDays
    : weekDays.filter((day) => day.key === dayKey);
  const subtitle = scope === "week"
    ? formatWeekRange()
    : days[0]?.label || "";
  const totalRows = days.reduce((sum, day) => sum + printableShiftRows(day.key).length, 0);
  document.querySelector("#printPreview").innerHTML = `
    <article>
      <header class="print-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <div class="print-meta">
          <strong>${totalRows}</strong> elementi<br>
          ${escapeHtml(new Date().toLocaleString("it-IT"))}
        </div>
      </header>
      ${days.map(renderPrintDay).join("")}
    </article>
  `;
}

function populatePresetOptions(selectedType = document.querySelector("#typeSelect").value || "Diurno 2") {
  const typeSelect = document.querySelector("#typeSelect");
  typeSelect.innerHTML = Object.keys(shiftPresets)
    .map((presetName) => `<option value="${escapeHtml(presetName)}">${escapeHtml(presetName)}</option>`)
    .join("");
  typeSelect.value = shiftPresets[selectedType] ? selectedType : Object.keys(shiftPresets)[0];
}

function selectedPreset() {
  return shiftPresets[document.querySelector("#typeSelect").value] || shiftPresets["Diurno 2"];
}

function applyPresetToForm(type) {
  const preset = shiftPresets[type];
  if (!preset) return;
  document.querySelector("#startTime").value = preset.start.includes("+") ? preset.start.slice(0, 5) : preset.start;
  document.querySelector("#endTime").value = preset.end.includes("+") ? preset.end.slice(0, 5) : preset.end;
  document.querySelector("#colorInput").value = preset.color || "#95ddd8";
}

function openShiftDialog(employeeId, day) {
  editingShiftId = null;
  editingShiftWeekOffset = null;
  document.querySelector("#shiftForm").reset();
  document.querySelector("#dialogTitle").textContent = "Aggiungi al calendario";
  document.querySelector("#saveShiftButton").textContent = "Salva turno";
  populatePresetOptions("Diurno 2");
  document.querySelector("#presetNameInput").value = "";
  applyPresetToForm("Diurno 2");
  document.querySelector("#workplaceInput").value = defaultWorkplace();
  if (employeeId) document.querySelector("#employeeSelect").value = employeeId;
  if (day) document.querySelector("#daySelect").value = day;
  dialog.showModal();
}

function openShiftDialogForEdit(shiftId) {
  const entry = findShiftEntry(shiftId);
  if (!entry) return;
  const shift = entry.shift;
  editingShiftId = shiftId;
  editingShiftWeekOffset = entry.weekOffset;
  document.querySelector("#dialogTitle").textContent = "Modifica turno";
  document.querySelector("#saveShiftButton").textContent = "Aggiorna turno";
  if (!shiftPresets[shift.type]) {
    shiftPresets = {
      ...shiftPresets,
      [shift.type]: {
        start: shift.start,
        end: shift.end,
        category: shift.category,
        color: shift.color || "#95ddd8"
      }
    };
  }
  populatePresetOptions(shift.type);
  document.querySelector("#presetNameInput").value = "";
  document.querySelector("#employeeSelect").value = shift.employeeId;
  document.querySelector("#daySelect").value = shift.day;
  document.querySelector("#typeSelect").value = shift.type;
  document.querySelector("#startTime").value = shift.start ? shift.start.slice(0, 5) : "10:00";
  document.querySelector("#endTime").value = shift.end ? shift.end.slice(0, 5) : "17:00";
  document.querySelector("#colorInput").value = shift.color || shiftPresets[shift.type]?.color || "#95ddd8";
  document.querySelector("#workplaceInput").value = shift.workplace || defaultWorkplace();
  document.querySelector("#noteInput").value = shift.note || "";
  dialog.showModal();
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    document.querySelectorAll(".segment").forEach((segment) => {
      const active = segment.dataset.view === currentView;
      segment.classList.toggle("active", active);
      segment.setAttribute("aria-selected", String(active));
    });
    render();
  });
});

searchInput.addEventListener("input", render);
roleFilter.addEventListener("change", render);
document.querySelector("#roleMode").addEventListener("change", (event) => {
  if (backendEnabled && currentUser) return;
  appMode = event.target.value;
  currentView = appMode === "supervisor" ? "day" : "employee";
  render();
  saveState();
});
document.querySelector("#employeeAccountSelect").addEventListener("change", (event) => {
  if (backendEnabled && (currentUser?.role === "employee" || currentUser?.role === "supervisor")) return;
  activeEmployeeId = event.target.value;
  render();
  saveState();
});
document.querySelector("#loginRole").addEventListener("change", updateLoginFields);
document.querySelector("#loginForm").addEventListener("submit", handleLogin);
document.querySelector("#logoutButton").addEventListener("click", logout);
document.querySelector("#toggleWeekPublication").addEventListener("click", toggleWeekPublication);
document.querySelector("#toggleDayPublication").addEventListener("click", toggleDayPublication);
document.querySelector("#dayPublicationSelect").addEventListener("change", renderWeekPublicationStatus);

document.querySelector("#prevWeek").addEventListener("click", () => {
  switchWeek(weekOffset - 1);
});

document.querySelector("#nextWeek").addEventListener("click", () => {
  switchWeek(weekOffset + 1);
});

document.querySelector("#openShiftForm").addEventListener("click", () => {
  if (!canManage()) return;
  openShiftDialog();
});
document.querySelector("#quickNewShift").addEventListener("click", () => {
  if (!canManage()) return;
  openShiftDialog();
});
document.querySelector("#quickPendingRequests").addEventListener("click", () => {
  if (!canManage()) return;
  document.querySelector("#managerRequests").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelector("#quickPublishWeek").addEventListener("click", toggleWeekPublication);
document.querySelector("#quickAttendance").addEventListener("click", () => document.querySelector("#openAttendance").click());
document.querySelector("#quickIntermittenti").addEventListener("click", () => document.querySelector("#openIntermittenti").click());
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => dialog.close());
document.querySelector("#openEmployeeManager").addEventListener("click", () => {
  if (!canManage()) return;
  resetEmployeeForm();
  renderEmployeeList();
  employeeDialog.showModal();
});
document.querySelector("#closeEmployeeDialog").addEventListener("click", () => employeeDialog.close());
document.querySelector("#addEmployeeButton").addEventListener("click", saveEmployeeForm);
document.querySelector("#cancelEmployeeEdit").addEventListener("click", resetEmployeeForm);
document.querySelector("#openCopyPeriod").addEventListener("click", () => {
  if (!canManage()) return;
  populateCopyDialog();
  copyDialog.showModal();
});
document.querySelector("#closeCopyDialog").addEventListener("click", () => copyDialog.close());
document.querySelector("#cancelCopyDialog").addEventListener("click", () => copyDialog.close());
document.querySelector("#copyPeriodButton").addEventListener("click", copyPeriod);
document.querySelectorAll("input[name='copyMode']").forEach((input) => {
  input.addEventListener("change", updateCopyModeFields);
});
document.querySelector("#openNotifications").addEventListener("click", () => {
  if (!canManage()) return;
  populateNotificationDialog();
  notificationDialog.showModal();
});
document.querySelector("#closeNotificationDialog").addEventListener("click", () => notificationDialog.close());
document.querySelector("#cancelNotificationDialog").addEventListener("click", () => notificationDialog.close());
document.querySelector("#generateNotifications").addEventListener("click", buildNotificationMessages);
document.querySelectorAll("input[name='notificationScope']").forEach((input) => {
  input.addEventListener("change", updateNotificationScopeFields);
});
document.querySelector("#openIntermittenti").addEventListener("click", () => {
  if (!canManage()) return;
  populateIntermittentiDialog();
  intermittentiDialog.showModal();
});
document.querySelector("#closeIntermittentiDialog").addEventListener("click", () => intermittentiDialog.close());
document.querySelector("#cancelIntermittentiDialog").addEventListener("click", () => intermittentiDialog.close());
document.querySelector("#refreshIntermittentiPreview").addEventListener("click", renderIntermittentiPreview);
document.querySelector("#downloadIntermittentiCsv").addEventListener("click", downloadIntermittentiCsv);
document.querySelector("#downloadIntermittentiPdf").addEventListener("click", downloadIntermittentiPdf);
document.querySelector("#intermittentiDay").addEventListener("change", renderIntermittentiPreview);
document.querySelectorAll("input[name='intermittentiScope']").forEach((input) => {
  input.addEventListener("change", () => {
    updateIntermittentiScopeFields();
    renderIntermittentiPreview();
  });
});
document.querySelector("#openPrintExport").addEventListener("click", () => {
  populatePrintDialog();
  printDialog.showModal();
});
document.querySelector("#closePrintDialog").addEventListener("click", () => printDialog.close());
document.querySelector("#cancelPrintDialog").addEventListener("click", () => printDialog.close());
document.querySelector("#refreshPrintPreview").addEventListener("click", renderPrintPreview);
document.querySelector("#printScheduleButton").addEventListener("click", () => {
  renderPrintPreview();
  window.print();
});
document.querySelector("#printTitle").addEventListener("input", renderPrintPreview);
document.querySelector("#printDay").addEventListener("change", renderPrintPreview);
document.querySelectorAll("input[name='printScope']").forEach((input) => {
  input.addEventListener("change", () => {
    updatePrintScopeFields();
    renderPrintPreview();
  });
});
document.querySelector("#openAttendance").addEventListener("click", () => {
  if (!canManage()) return;
  populateAttendanceEmployeeFilter();
  populateAttendanceImportEmployees();
  document.querySelector("#attendancePeriod").value = "today";
  setAttendancePeriod("today");
  syncAttendanceRevenueInputs(new Date());
  attendanceDialog.showModal();
  loadAttendanceRecords();
});
document.querySelector("#closeAttendanceDialog").addEventListener("click", () => attendanceDialog.close());
document.querySelector("#openTips").addEventListener("click", () => {
  if (!canManage()) return;
  tipsDialog.showModal();
  loadTipsMonth(defaultTipsMonth());
});
document.querySelector("#closeTipsDialog").addEventListener("click", () => tipsDialog.close());
document.querySelector("#tipsMonth").addEventListener("change", (event) => loadTipsMonth(event.target.value));
document.querySelector("#tipsCashTotal").addEventListener("input", updateTipsTotals);
document.querySelector("#tipsPosTotal").addEventListener("input", updateTipsTotals);
document.querySelector("#tipsTable").addEventListener("input", updateTipsHours);
document.querySelector("#tipsTable").addEventListener("change", updateTipsHours);
document.querySelector("#resetTipsHours").addEventListener("click", resetTipsHours);
document.querySelector("#saveTips").addEventListener("click", saveTips);
document.querySelector("#openPayroll").addEventListener("click", () => {
  if (!canManage()) return;
  const month = defaultTipsMonth();
  document.querySelector("#payrollMonth").value = month;
  document.querySelector("#payrollFilterMonth").value = "";
  document.querySelector("#payrollFiles").value = "";
  setPayrollNotice("");
  renderPayrollUploadResults([]);
  payrollDialog.showModal();
  loadPayrollDocuments();
});
document.querySelector("#closePayrollDialog").addEventListener("click", () => payrollDialog.close());
document.querySelector("#uploadPayroll").addEventListener("click", uploadPayrollFiles);
document.querySelector("#payrollFilterMonth").addEventListener("change", renderPayrollList);
document.querySelector("#payrollList").addEventListener("click", deletePayrollDocument);
document.querySelector("#openEmployeeDocuments").addEventListener("click", () => {
  if (!canManage()) return;
  populateEmployeeDocumentSelectors();
  document.querySelector("#employeeDocumentCategory").value = "Contratto";
  document.querySelector("#employeeDocumentTitle").value = "";
  document.querySelector("#employeeDocumentIssueDate").value = "";
  document.querySelector("#employeeDocumentExpiryDate").value = "";
  document.querySelector("#employeeDocumentFile").value = "";
  document.querySelector("#employeeDocumentFilterEmployee").value = "all";
  document.querySelector("#employeeDocumentFilterCategory").value = "all";
  setEmployeeDocumentsNotice("");
  employeeDocumentsDialog.showModal();
  loadEmployeeDocuments();
});
document.querySelector("#closeEmployeeDocumentsDialog").addEventListener("click", () => employeeDocumentsDialog.close());
document.querySelector("#uploadEmployeeDocument").addEventListener("click", uploadEmployeeDocument);
document.querySelector("#employeeDocumentFilterEmployee").addEventListener("change", renderEmployeeDocumentsList);
document.querySelector("#employeeDocumentFilterCategory").addEventListener("change", renderEmployeeDocumentsList);
document.querySelector("#employeeDocumentsList").addEventListener("click", deleteEmployeeDocument);
document.querySelector("#openAttendanceCorrection").addEventListener("click", () => openAttendanceCorrection());
document.querySelector("#toggleAttendanceImport").addEventListener("click", () => {
  document.querySelector("#attendanceImportPanel").classList.toggle("hidden");
  populateAttendanceImportEmployees();
});
document.querySelector("#previewAttendanceImport").addEventListener("click", previewAttendanceImport);
document.querySelector("#confirmAttendanceImport").addEventListener("click", confirmAttendanceImport);
document.querySelector("#attendanceCorrectionForm").addEventListener("submit", saveAttendanceCorrection);
document.querySelector("#closeAttendanceCorrectionDialog").addEventListener("click", () => attendanceCorrectionDialog.close());
document.querySelector("#cancelAttendanceCorrectionDialog").addEventListener("click", () => attendanceCorrectionDialog.close());
document.querySelector("#deleteAttendanceCorrection").addEventListener("click", deleteAttendanceCorrection);
document.querySelector("#refreshAttendance").addEventListener("click", loadAttendanceRecords);
document.querySelector("#saveAttendanceRevenue").addEventListener("click", saveAttendanceRevenue);
document.querySelector("#attendanceRevenueDate").addEventListener("change", () => {
  syncAttendanceRevenueInputs(dateFromItalianInput(document.querySelector("#attendanceRevenueDate").value));
  renderAttendanceList();
});
document.querySelector("#attendanceRevenueScope").addEventListener("change", () => {
  syncAttendanceRevenueInputs(dateFromItalianInput(document.querySelector("#attendanceRevenueDate").value));
  renderAttendanceList();
});
document.querySelector("#printAttendanceSheet").addEventListener("click", printAttendanceSheet);
document.querySelector("#exportAttendanceSummaryCsv").addEventListener("click", exportAttendanceSummaryCsv);
document.querySelector("#exportAttendanceDetailCsv").addEventListener("click", exportAttendanceDetailCsv);
document.querySelector("#printAttendanceSummary").addEventListener("click", printAttendanceSummary);
document.querySelector("#closeQrScanDialog").addEventListener("click", closeQrScanner);
qrScanDialog.addEventListener("close", closeQrScanner);
document.querySelector("#attendancePeriod").addEventListener("change", (event) => {
  setAttendancePeriod(event.target.value);
  syncAttendanceRevenueInputs(dateFromItalianInput(document.querySelector("#attendanceFrom").value));
  renderAttendanceList();
});
document.querySelector("#attendanceMonth").addEventListener("change", (event) => {
  setAttendanceMonth(event.target.value);
  syncAttendanceRevenueInputs(dateFromItalianInput(document.querySelector("#attendanceFrom").value));
  renderAttendanceList();
});
document.querySelector("#attendanceEmployeeFilter").addEventListener("change", renderAttendanceList);
document.querySelector("#attendanceFrom").addEventListener("change", () => {
  document.querySelector("#attendancePeriod").value = "custom";
  syncAttendanceRevenueInputs(dateFromItalianInput(document.querySelector("#attendanceFrom").value));
  renderAttendanceList();
});
document.querySelector("#attendanceTo").addEventListener("change", () => {
  document.querySelector("#attendancePeriod").value = "custom";
  renderAttendanceList();
});
document.querySelector("#openTaskManager").addEventListener("click", () => {
  window.location.href = "/mansionario.html";
});
document.querySelector("#closeTaskDialog").addEventListener("click", () => taskDialog.close());
document.querySelector("#taskModuleEnabled").addEventListener("change", toggleTaskModule);
document.querySelector("#saveTaskTemplate").addEventListener("click", saveTaskTemplate);
document.querySelector("#cancelTaskEdit").addEventListener("click", resetTaskTemplateForm);
document.querySelector("#generateTasksNow").addEventListener("click", generateTasksNow);
document.querySelector("#taskCompleteForm").addEventListener("submit", completeTask);
document.querySelector("#closeTaskCompleteDialog").addEventListener("click", () => taskCompleteDialog.close());
document.querySelector("#cancelTaskCompleteDialog").addEventListener("click", () => taskCompleteDialog.close());
document.querySelector("#openBackups").addEventListener("click", () => {
  if (!canManage()) return;
  backupDialog.showModal();
  loadBackups();
});
document.querySelector("#closeBackupDialog").addEventListener("click", () => backupDialog.close());
document.querySelector("#refreshBackups").addEventListener("click", loadBackups);
document.querySelector("#openHistory").addEventListener("click", () => {
  if (!canManage()) return;
  historyDialog.showModal();
  loadHistory();
});
document.querySelector("#closeHistoryDialog").addEventListener("click", () => historyDialog.close());
document.querySelector("#refreshHistory").addEventListener("click", loadHistory);
document.querySelector("#exportHistoryCsv").addEventListener("click", exportHistoryCsv);
document.querySelector("#openCompanySettings").addEventListener("click", openCompanySettings);
document.querySelector("#closeCompanySettingsDialog").addEventListener("click", () => companySettingsDialog.close());
document.querySelector("#cancelCompanySettingsDialog").addEventListener("click", () => companySettingsDialog.close());
document.querySelector("#companySettingsForm").addEventListener("submit", saveCompanySettings);
document.querySelector("#openRequestDialog").addEventListener("click", () => {
  if (!canUseEmployeeArea()) return;
  document.querySelector("#requestNote").value = "";
  document.querySelector("#requestType").value = "Giorno di riposo";
  document.querySelector("#requestStartTime").value = "09:00";
  document.querySelector("#requestEndTime").value = "13:00";
  populateRequestWeekOptions(weekOffset);
  populateRequestDayOptions(weekOffset);
  updateHalfDayFields();
  renderRequestCalendar(weekOffset);
  requestDialog.showModal();
});
document.querySelector("#openPinDialog").addEventListener("click", () => {
  if (!canUseEmployeeArea()) return;
  resetPinForm();
  pinDialog.showModal();
});
document.querySelector("#closePinDialog").addEventListener("click", () => pinDialog.close());
document.querySelector("#cancelPinDialog").addEventListener("click", () => pinDialog.close());
document.querySelector("#pinForm").addEventListener("submit", changeOwnPin);
document.querySelector("#closeRequestDialog").addEventListener("click", () => requestDialog.close());
document.querySelector("#cancelRequestDialog").addEventListener("click", () => requestDialog.close());
document.querySelector("#requestWeek").addEventListener("change", (event) => {
  const selectedOffset = Number(event.target.value);
  populateRequestDayOptions(selectedOffset);
  updateHalfDayFields();
  renderRequestCalendar(selectedOffset);
});
document.querySelector("#requestDay").addEventListener("change", () => {
  const startDay = document.querySelector("#requestDay").value;
  const endDaySelect = document.querySelector("#requestEndDay");
  if (document.querySelector("#requestType").value === "Mezza giornata" || dayKeys.indexOf(endDaySelect.value) < dayKeys.indexOf(startDay)) {
    endDaySelect.value = startDay;
  }
});
document.querySelector("#requestType").addEventListener("change", updateHalfDayFields);
document.querySelector("#requestForm").addEventListener("submit", submitTimeOffRequest);

document.querySelector("#typeSelect").addEventListener("change", (event) => {
  document.querySelector("#presetNameInput").value = "";
  applyPresetToForm(event.target.value);
});

document.querySelector("#savePresetButton").addEventListener("click", () => {
  const presetName = document.querySelector("#presetNameInput").value.trim() || document.querySelector("#typeSelect").value;
  if (!presetName) return;
  const currentPreset = selectedPreset();
  const needsTime = currentPreset.category !== "rest" && currentPreset.category !== "leave";
  const startValue = needsTime ? requireTimeInput("#startTime", "l'orario di inizio") : "";
  if (needsTime && !startValue) return;
  const endValue = needsTime ? requireTimeInput("#endTime", "l'orario di fine") : "";
  if (needsTime && !endValue) return;
  const isOvernight = endValue < startValue;
  shiftPresets = {
    ...shiftPresets,
    [presetName]: {
      start: currentPreset.category === "rest" || currentPreset.category === "leave" ? "" : startValue,
      end: currentPreset.category === "rest" || currentPreset.category === "leave" ? "" : `${endValue}${isOvernight ? " +1d" : ""}`,
      category: currentPreset.category,
      color: document.querySelector("#colorInput").value
    }
  };
  populatePresetOptions(presetName);
  document.querySelector("#presetNameInput").value = "";
  saveState();
});

document.querySelector("#shiftForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const saveButton = document.querySelector("#saveShiftButton");
  const originalLabel = saveButton?.textContent || "";
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Salvataggio...";
  }
  const type = document.querySelector("#presetNameInput").value.trim() || document.querySelector("#typeSelect").value;
  const preset = selectedPreset();
  const needsTime = preset.category !== "rest" && preset.category !== "leave";
  const startValue = needsTime ? requireTimeInput("#startTime", "l'orario di inizio") : "";
  if (needsTime && !startValue) {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = originalLabel;
    }
    return;
  }
  const endValue = needsTime ? requireTimeInput("#endTime", "l'orario di fine") : "";
  if (needsTime && !endValue) {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = originalLabel;
    }
    return;
  }
  const isOvernight = endValue < startValue;

  const nextShift = {
    employeeId: document.querySelector("#employeeSelect").value,
    day: document.querySelector("#daySelect").value,
    type,
    start: preset.category === "rest" || preset.category === "leave" ? "" : startValue,
    end: preset.category === "rest" || preset.category === "leave" ? "" : `${endValue}${isOvernight ? " +1d" : ""}`,
    workplace: document.querySelector("#workplaceInput").value.trim() || defaultWorkplace(),
    color: document.querySelector("#colorInput").value,
    note: document.querySelector("#noteInput").value.trim(),
    category: preset.category
  };

  try {
    if (backendEnabled && currentUser?.role === "manager") {
      const endpoint = editingShiftId ? `/api/shifts/${editingShiftId}` : "/api/shifts";
      const targetWeekOffset = editingShiftId && editingShiftWeekOffset !== null ? editingShiftWeekOffset : weekOffset;
      const payload = await apiRequest(endpoint, {
        method: editingShiftId ? "PATCH" : "POST",
        body: JSON.stringify({
          weekOffset: targetWeekOffset,
          ...nextShift
        })
      });
      applyState(payload.state);
      applyUser(currentUser);
    } else if (editingShiftId) {
      const targetWeekOffset = editingShiftWeekOffset !== null ? editingShiftWeekOffset : weekOffset;
      shiftsByWeek[targetWeekOffset] = ensureWeek(targetWeekOffset).map((shift) => shift.id === editingShiftId ? { ...shift, ...nextShift } : shift);
      if (targetWeekOffset === weekOffset) shifts = shiftsByWeek[targetWeekOffset];
    } else {
      shifts.push({
        id: `s${Date.now()}`,
        ...nextShift
      });
    }
  } catch (error) {
    showAppNotice(error.message || "Salvataggio turno non riuscito.", "error");
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = originalLabel;
    }
    return;
  }

  event.target.reset();
  editingShiftId = null;
  editingShiftWeekOffset = null;
  populatePresetOptions("Diurno 2");
  applyPresetToForm("Diurno 2");
  document.querySelector("#workplaceInput").value = defaultWorkplace();
  dialog.close();
  render();
  if (!backendEnabled || currentUser?.role !== "manager") saveState();
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.textContent = originalLabel;
  }
});

setupTimeInputs();

if (backendEnabled) {
  document.body.classList.add("auth-gated");
  populateForm();
  updateLoginFields();
  initializeBackend();
} else {
  loadState();
  populateForm();
  render();
  updateLoginFields();
}
