let employees = [];

const storageKey = "restaurantShiftPlannerState";
const baseWeekStart = new Date(2026, 4, 18);
const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
let weekDays = buildWeekDays(0);

let shiftPresets = {
  Mattina: {
    start: "08:00",
    end: "14:00",
    category: "day",
    color: "#95ddd8"
  },
  Pomeriggio: {
    start: "14:00",
    end: "20:00",
    category: "day",
    color: "#95ddd8"
  },
  Giornata: {
    start: "09:00",
    end: "17:00",
    category: "day",
    color: "#95ddd8"
  },
  Apertura: {
    start: "07:30",
    end: "13:30",
    category: "open",
    color: "#69bea7"
  },
  Chiusura: {
    start: "15:00",
    end: "21:00",
    category: "evening",
    color: "#f2a08e"
  },
  "Giorno di riposo": {
    start: "",
    end: "",
    category: "rest",
    color: "#f1f1f3"
  },
  Ferie: {
    start: "",
    end: "",
    category: "leave",
    color: "#f7ecd6"
  }
};

const seedShifts = [];

let currentView = "employee";
let weekOffset = 0;
let draggedShiftId = null;
let editingShiftId = null;
let editingEmployeeId = null;
let appMode = "manager";
let activeEmployeeId = "";
let timeOffRequests = [];
let publishedWeeks = { 0: true };
let publishedDays = {};
let notificationLog = [];
let notificationStatus = {};
let generatedNotificationMessages = [];
let currentUser = null;
let attendanceRecords = [];
let activityLog = [];
let pendingPunchToken = new URLSearchParams(window.location.search).get("punch") || "";
let companySettings = {
  companyName: "Piscine Aquamore",
  roles: ["Reception", "Bagnini", "Istruttori", "Pulizie", "Bar"],
  workplaces: ["Piscine Aquamore"],
  employerFiscalCode: "",
  agencyEmail: ""
};
const backendEnabled = location.protocol.startsWith("http");

function canManage() {
  return appMode === "manager" && (!backendEnabled || currentUser?.role === "manager");
}

function canUseEmployeeArea() {
  return appMode === "employee" && (!backendEnabled || currentUser?.role === "employee");
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
const companySettingsDialog = document.querySelector("#companySettingsDialog");
const intermittentiDialog = document.querySelector("#intermittentiDialog");
const historyDialog = document.querySelector("#historyDialog");
const qrScanDialog = document.querySelector("#qrScanDialog");
const attendanceCorrectionDialog = document.querySelector("#attendanceCorrectionDialog");
let qrScanStream = null;
let qrScanTimer = null;
let editingAttendanceId = null;

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Errore richiesta");
  return payload;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildWeekDays(offset) {
  const start = addDays(baseWeekStart, offset * 7);
  const today = new Date(2026, 4, 24);
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
    attendanceRecords,
    publishedWeeks,
    publishedDays,
    notificationLog,
    notificationStatus,
    activityLog
  };
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
  activityLog = Array.isArray(state.activityLog) ? state.activityLog : activityLog;
  weekDays = buildWeekDays(weekOffset);
  shifts = ensureWeek(weekOffset);
}

function applyUser(user) {
  currentUser = user;
  if (!user) return;
  document.body.classList.remove("auth-gated");
  appMode = user.role;
  if (user.employeeId) activeEmployeeId = user.employeeId;
}

function switchWeek(nextOffset) {
  shiftsByWeek[weekOffset] = shifts;
  weekOffset = nextOffset;
  weekDays = buildWeekDays(weekOffset);
  shifts = ensureWeek(weekOffset);
  populateForm();
  render();
  saveState();
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

function sortedEmployees(list = employees) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
}

function normalizeEmployee(employee) {
  const { pin, pinHash, ...safeEmployee } = employee;
  return {
    ...safeEmployee,
    hasPin: Boolean(employee.hasPin || pin || pinHash),
    phone: employee.phone || "",
    email: employee.email || "",
    intermittent: Boolean(employee.intermittent),
    fiscalCode: employee.fiscalCode || "",
    communicationCode: employee.communicationCode || ""
  };
}

function normalizeList(value, fallback) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",");
  const cleaned = list.map((item) => String(item).trim()).filter(Boolean);
  return [...new Set(cleaned.length ? cleaned : fallback)];
}

function normalizeCompanySettings(settings = {}) {
  return {
    companyName: String(settings.companyName || "Piscine Aquamore").trim() || "Piscine Aquamore",
    roles: normalizeList(settings.roles, ["Reception", "Bagnini", "Istruttori", "Pulizie", "Bar"]),
    workplaces: normalizeList(settings.workplaces, [String(settings.companyName || "Piscine Aquamore").trim() || "Piscine Aquamore"]),
    employerFiscalCode: String(settings.employerFiscalCode || "").trim().toUpperCase(),
    agencyEmail: String(settings.agencyEmail || "").trim()
  };
}

function defaultWorkplace() {
  return companySettings.workplaces[0] || companySettings.companyName || "Piscine Aquamore";
}

function companyLabel() {
  return companySettings.companyName || "Piscine Aquamore";
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

function shiftHours(shift) {
  const start = timeToMinutes(shift.start);
  const end = timeToMinutes(shift.end);
  if (start === null || end === null || shift.category === "rest" || shift.category === "leave") return 0;
  return Math.max(0, end - start) / 60;
}

function shiftSortValue(shift) {
  const dayIndex = dayKeys.indexOf(shift.day);
  return (dayIndex < 0 ? 99 : dayIndex) * 2000 + (timeToMinutes(shift.start) || 0);
}

function shiftLineForMessage(shift, offset = weekOffset) {
  const day = buildWeekDays(offset).find((item) => item.key === shift.day);
  const time = shift.start && shift.end ? ` ${shift.start}-${shift.end}` : "";
  const workplace = shift.workplace ? ` · ${shift.workplace}` : "";
  const note = shift.note ? ` · ${shift.note}` : "";
  return `- ${day ? day.label : shift.day}: ${shift.type}${time}${workplace}${note}`;
}

function nextEmployeeShift(employeeId = activeEmployeeId, offset = weekOffset) {
  return visibleWeekShifts(offset)
    .filter((shift) => shift.employeeId === employeeId)
    .filter((shift) => shift.category !== "rest" && shift.category !== "leave")
    .sort((a, b) => shiftSortValue(a) - shiftSortValue(b))[0] || null;
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
  if (period === "week") {
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
    ...sortedEmployees().map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
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
  return employees.filter((employee) => {
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
    <article class="shift-card ${className}" draggable="${canEditShift ? "true" : "false"}" data-shift-id="${shift.id}" style="background:${escapeHtml(shift.color || shiftPresets[shift.type]?.color || "#95ddd8")}" title="${escapeHtml(employee.name)} - ${escapeHtml(shift.type)}">
      <div class="shift-card-head">
        <strong>${shift.category === "rest" ? "zᶻ " : ""}${escapeHtml(shift.type)}</strong>
        ${canEditShift ? `<div class="shift-actions">
          <button class="copy-shift" type="button" data-copy-shift="${shift.id}" aria-label="Copia turno">⧉</button>
          <button class="delete-shift" type="button" data-delete-shift="${shift.id}" aria-label="Elimina turno">×</button>
        </div>` : ""}
      </div>
      ${time ? `<p>${escapeHtml(time)}</p>` : ""}
      <p>${showEmployee ? escapeHtml(employee.name) : escapeHtml(shift.workplace || defaultWorkplace())}</p>
      ${shift.note ? `<small>${escapeHtml(shift.note)}</small>` : ""}
    </article>
  `;
}

function renderInlineRequestCard(request, showEmployee = false) {
  const employee = getEmployee(request.employeeId);
  const statusLabels = { pending: "In attesa", approved: "Approvata", rejected: "Rifiutata" };
  const time = request.type === "Mezza giornata" && request.startTime && request.endTime
    ? `${request.startTime} - ${request.endTime}`
    : "";
  return `
    <article class="request-card-inline request-${request.status}">
      <strong>Richiesta: ${escapeHtml(request.type)}</strong>
      ${time ? `<p>${escapeHtml(time)}</p>` : ""}
      <p>${escapeHtml(statusLabels[request.status] || request.status)}</p>
      ${showEmployee && employee ? `<p>${escapeHtml(employee.name)}</p>` : ""}
      ${request.note ? `<small>${escapeHtml(request.note)}</small>` : ""}
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
    const dayRequests = employeeRequests.filter((request) => request.day === day.key);
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
      const dayRequests = employeeRequests.filter((request) => request.day === day.key);
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
  if (appMode === "employee" && !isWeekPublished() && !hasAnyPublishedDay()) {
    dayView.innerHTML = `<div class="unpublished-notice">Questa settimana non è ancora stata pubblicata dal manager.</div>`;
    return;
  }
  const employeeIds = people.map((employee) => employee.id);
  const visibleEmployeeIds = new Set(employeeIds);
  const allVisible = visibleShifts(employeeIds)
    .filter((shift) => shift.category !== "rest" && shift.category !== "leave")
    .sort((a, b) => (timeToMinutes(a.start) || 0) - (timeToMinutes(b.start) || 0));
  const visibleRequests = timeOffRequests.filter((request) => request.weekOffset === weekOffset && visibleEmployeeIds.has(request.employeeId));

  const columns = weekDays.map((day) => {
    if (appMode === "employee" && !isPeriodPublished(day.key)) {
      return `
        <div class="day-column ${day.today ? "today" : ""}" data-day="${day.key}">
          <div class="day-empty">Non pubblicato</div>
        </div>
      `;
    }
    const dayShifts = allVisible.filter((shift) => shift.day === day.key);
    const dayRequests = visibleRequests.filter((request) => request.day === day.key);
    return `
      <div class="day-column drop-zone ${day.today ? "today" : ""}" data-day="${day.key}">
        ${dayShifts.length || dayRequests.length
          ? `${dayShifts.map((shift) => renderShiftCard(shift, true)).join("")}${dayRequests.map((request) => renderInlineRequestCard(request, true)).join("")}`
          : '<div class="day-empty">Nessun turno pianificato</div>'}
      </div>
    `;
  }).join("");

  dayView.innerHTML = `<div class="day-view-inner day-grid">${renderHeader(false)}${columns}</div>`;
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
  updateAccountUi();
  renderManagerDashboard();
  renderWeekLabel();
  renderStats();
  renderEmployeeView();
  renderDayView();
  renderPortal();
  renderManagerRequests();
  employeeView.classList.toggle("hidden", currentView !== "employee");
  dayView.classList.toggle("hidden", currentView !== "day");
  bindShiftInteractions();
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
  if (!backendEnabled || currentUser?.role !== "manager" || lastBackupSummaryLoading) return;
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

function moveOrCopyShift(shiftId, target) {
  const shift = shifts.find((item) => item.id === shiftId);
  if (!shift) return;
  const employeeId = target.employeeId || shift.employeeId;
  const day = target.day || shift.day;

  if (target.copy) {
    cloneShift(shift, { employeeId, day });
  } else {
    shift.employeeId = employeeId;
    shift.day = day;
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
      const shift = shifts.find((item) => item.id === button.dataset.copyShift);
      if (!shift) return;
      cloneShift(shift);
      render();
    });
  });

  document.querySelectorAll(".delete-shift").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!canManage()) return;
      const shiftId = button.dataset.deleteShift;
      if (backendEnabled && currentUser?.role === "manager") {
        const payload = await apiRequest(`/api/shifts/${shiftId}?weekOffset=${weekOffset}`, { method: "DELETE" });
        applyState(payload.state);
        applyUser(currentUser);
        populateForm();
        render();
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
  document.querySelector("#requestDay").innerHTML = days
    .map((day) => `<option value="${day.key}">${escapeHtml(day.label)}</option>`)
    .join("");
}

function updateAccountUi() {
  document.querySelector("#brandCompanyName").textContent = companyLabel();
  document.body.classList.toggle("employee-mode", appMode === "employee");
  document.body.classList.toggle("manager-mode", canManage());
  document.querySelector("#roleMode").value = appMode;
  document.querySelector("#employeeAccountSelect").value = activeEmployeeId;
  document.querySelector(".employee-account-field").classList.toggle("hidden", appMode !== "employee");
  document.querySelector(".toolbar").classList.toggle("manager-only-hidden", !canManage());
  document.querySelector("#weekPublication").classList.toggle("hidden", !canManage());
  document.querySelector("#logoutButton").classList.toggle("hidden", !backendEnabled || !currentUser);
  document.querySelector("#roleMode").disabled = backendEnabled && Boolean(currentUser);
  document.querySelector("#employeeAccountSelect").disabled = backendEnabled && currentUser?.role === "employee";
  document.querySelector("#managerRequests").classList.toggle("hidden", !canManage() || !timeOffRequests.some((request) => request.status === "pending"));
  const activeEmployee = getEmployee(activeEmployeeId);
  document.querySelector("#accountSummary").textContent = canManage()
    ? "Vista manager"
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
  const nextShiftDay = nextShift ? buildWeekDays(weekOffset).find((day) => day.key === nextShift.day) : null;
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
      <small>${escapeHtml(formatWeekRange())}</small>
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
  document.querySelector(".scan-qr-button")?.addEventListener("click", openQrScanner);
}

function renderManagerRequests() {
  const pending = timeOffRequests.filter((request) => request.status === "pending");
  document.querySelector("#pendingRequests").innerHTML = pending.length ? pending.map(renderRequestRow).join("") : '<div class="empty-state">Nessuna richiesta in attesa.</div>';
  bindRequestActions();
}

function renderRequestRow(request) {
  const employee = getEmployee(request.employeeId);
  const day = buildWeekDays(request.weekOffset).find((item) => item.key === request.day);
  const statusLabels = { pending: "In attesa", approved: "Approvata", rejected: "Rifiutata" };
  const requestTime = request.type === "Mezza giornata" && request.startTime && request.endTime
    ? ` · ${request.startTime}-${request.endTime}`
    : "";
  const actions = canManage() && request.status === "pending"
    ? `<div class="request-actions">
        <button class="primary-button approve-request" type="button" data-request-id="${request.id}">Approva</button>
        <button class="ghost-button reject-request" type="button" data-request-id="${request.id}">Rifiuta</button>
      </div>`
    : "";
  return `
    <div class="request-row request-${request.status}">
      <div>
        <strong>${escapeHtml(request.type)} · ${escapeHtml(day ? day.label : request.day)}${escapeHtml(requestTime)}</strong>
        <span>${escapeHtml(employee ? employee.name : "Dipendente")} · ${escapeHtml(formatWeekRangeForOffset(request.weekOffset))} · ${statusLabels[request.status]}</span>
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
      document.querySelector("#requestDay").value = button.dataset.requestDay;
      document.querySelectorAll(".request-day-card").forEach((card) => card.classList.toggle("active", card === button));
    });
  });
}

function updateHalfDayFields() {
  const isHalfDay = document.querySelector("#requestType").value === "Mezza giornata";
  document.querySelectorAll(".half-day-field").forEach((field) => field.classList.toggle("hidden", !isHalfDay));
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
        <span>${escapeHtml(employee.role)} · ${employee.target}h · PIN ${employee.hasPin ? "impostato" : "mancante"}${employee.intermittent ? " · a chiamata" : ""}</span>
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
      employees = employees.filter((employee) => employee.id !== employeeId);
      Object.keys(shiftsByWeek).forEach((offset) => {
        shiftsByWeek[offset] = shiftsByWeek[offset].filter((shift) => shift.employeeId !== employeeId);
      });
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
  document.querySelector("#newEmployeeRole").value = companySettings.roles[0] || "Reception";
  document.querySelector("#newEmployeeTarget").value = "35";
  document.querySelector("#newEmployeeColor").value = "#4aa7b3";
  document.querySelector("#newEmployeePin").value = "";
  document.querySelector("#newEmployeePin").placeholder = "4-8 numeri";
  document.querySelector("#newEmployeePhone").value = "";
  document.querySelector("#newEmployeeEmail").value = "";
  document.querySelector("#newEmployeeIntermittent").checked = false;
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
  shiftsByWeek[request.weekOffset] = [
    ...targetWeek.filter((shift) => request.type === "Mezza giornata" || !(shift.employeeId === request.employeeId && shift.day === request.day)),
    {
      id: `s${Date.now()}-${Math.random().toString(16).slice(2)}`,
      employeeId: request.employeeId,
      day: request.day,
      type: request.type,
      start: request.type === "Mezza giornata" ? request.startTime : "",
      end: request.type === "Mezza giornata" ? request.endTime : "",
      workplace: defaultWorkplace(),
      color: preset.color,
      note: request.note ? `Richiesta approvata: ${request.note}` : "Richiesta approvata",
      category: preset.category
    }
  ];
  if (request.weekOffset === weekOffset) shifts = shiftsByWeek[request.weekOffset];
  updateRequestStatus(requestId, "approved");
}

async function submitTimeOffRequest(event) {
  event.preventDefault();
  const requestDraft = {
    employeeId: activeEmployeeId,
    weekOffset: Number(document.querySelector("#requestWeek").value),
    day: document.querySelector("#requestDay").value,
    type: document.querySelector("#requestType").value,
    startTime: document.querySelector("#requestType").value === "Mezza giornata" ? document.querySelector("#requestStartTime").value : "",
    endTime: document.querySelector("#requestType").value === "Mezza giornata" ? document.querySelector("#requestEndTime").value : "",
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
  const isEmployee = document.querySelector("#loginRole").value === "employee";
  document.querySelector(".login-employee-field").classList.toggle("hidden", !isEmployee);
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
    saveState();
    await processPendingPunch();
  } catch {
    document.querySelector("#loginError").classList.remove("hidden");
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
    list.innerHTML = payload.backups.length
      ? payload.backups.map((backup) => `
        <div class="backup-row">
          <div>
            <strong>${escapeHtml(new Date(backup.createdAt).toLocaleString("it-IT"))}</strong>
            <span>${escapeHtml(backup.file)} · ${formatBytes(backup.size)}</span>
          </div>
          <button class="ghost-button restore-backup" type="button" data-backup-file="${escapeHtml(backup.file)}">Ripristina</button>
        </div>
      `).join("")
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
      const payload = await apiRequest("/api/backups/restore", {
        method: "POST",
        body: JSON.stringify({ file })
      });
      applyState(payload.state);
      applyUser(currentUser);
      populateForm();
      render();
      backupDialog.close();
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
    renderAttendanceList();
  } catch {
    list.innerHTML = '<div class="empty-state">Presenze disponibili solo come manager.</div>';
  }
}

function renderAttendanceList() {
  const list = document.querySelector("#attendanceList");
  const summary = document.querySelector("#attendanceSummary");
  const rows = currentAttendanceRows();
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const openRows = rows.filter((row) => !row.out).length;
  summary.innerHTML = `
    <div><span>Dipendenti</span><strong>${new Set(rows.map((row) => row.employeeId)).size}</strong></div>
    <div><span>Giornate</span><strong>${rows.length}</strong></div>
    <div><span>Ore totali</span><strong>${formatHours(totalHours)}</strong></div>
    <div><span>Aperte</span><strong>${openRows}</strong></div>
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
        <div class="attendance-sheet-row ${row.out ? "" : "open"}">
          <div><strong>${escapeHtml(row.employeeName)}</strong></div>
          <div>${escapeHtml(row.dateLabel)}</div>
          <div>${escapeHtml(attendanceTime(row.in.timestamp))}</div>
          <div>${row.out ? escapeHtml(attendanceTime(row.out.timestamp)) : "-"}</div>
          <div>${row.out ? escapeHtml(formatHours(row.hours)) : "-"}</div>
          <div><span>${row.out ? "Completa" : "Aperta"}</span></div>
          <div class="attendance-actions">
            ${row.in ? `<button class="mini-action edit-attendance-record" type="button" data-record-id="${escapeHtml(row.in.id)}">Entrata</button>` : ""}
            ${row.out
              ? `<button class="mini-action edit-attendance-record" type="button" data-record-id="${escapeHtml(row.out.id)}">Uscita</button>`
              : `<button class="mini-action add-attendance-out" type="button" data-employee-id="${escapeHtml(row.employeeId)}" data-date="${escapeHtml(row.dateInput)}">+ Uscita</button>`}
          </div>
        </div>
      `).join("")}
    </div>
  `;
  bindAttendanceCorrectionActions();
}

function currentAttendanceRows() {
  const { from, to } = attendanceRange();
  const employeeFilter = document.querySelector("#attendanceEmployeeFilter").value || "all";
  const filtered = attendanceRecords
    .filter((record) => employeeFilter === "all" || record.employeeId === employeeFilter)
    .filter((record) => {
      const timestamp = new Date(record.timestamp);
      return timestamp >= from && timestamp <= to;
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return buildAttendanceRows(filtered);
}

function attendanceSummaryRows(rows = currentAttendanceRows()) {
  const byEmployee = new Map();
  rows.forEach((row) => {
    const current = byEmployee.get(row.employeeId) || {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      days: 0,
      hours: 0,
      open: 0
    };
    current.days += 1;
    current.hours += row.hours;
    if (!row.out) current.open += 1;
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
      </div>
      ${summaryRows.map((row) => `
        <div class="monthly-summary-row ${row.open ? "open" : ""}">
          <div><strong>${escapeHtml(row.employeeName)}</strong></div>
          <div>${row.days}</div>
          <div>${escapeHtml(formatHours(row.hours))}</div>
          <div>${row.open || "-"}</div>
        </div>
      `).join("")}
    </div>
  `;
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
    return employeeCompare || new Date(a.in?.timestamp || a.out.timestamp) - new Date(b.in?.timestamp || b.out.timestamp);
  });
}

function rowFromAttendance(inRecord, outRecord = null) {
  const baseRecord = inRecord || outRecord;
  const employee = getEmployee(baseRecord.employeeId);
  return {
    employeeId: baseRecord.employeeId,
    employeeName: baseRecord.employeeName || employee?.name || "Dipendente",
    dateLabel: new Date(baseRecord.timestamp).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
    dateInput: dateInputValue(new Date(baseRecord.timestamp)),
    in: inRecord || outRecord,
    out: outRecord,
    hours: attendanceDuration(inRecord?.timestamp, outRecord?.timestamp)
  };
}

function populateAttendanceCorrectionEmployees() {
  document.querySelector("#attendanceCorrectionEmployee").innerHTML = sortedEmployees()
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("");
}

function localTimestampFromAttendanceForm() {
  const date = dateFromItalianInput(document.querySelector("#attendanceCorrectionDate").value);
  const time = document.querySelector("#attendanceCorrectionTime").value;
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
  const payload = {
    employeeId: document.querySelector("#attendanceCorrectionEmployee").value,
    type: document.querySelector("#attendanceCorrectionType").value,
    timestamp: localTimestampFromAttendanceForm(),
    note: document.querySelector("#attendanceCorrectionNote").value.trim()
  };
  const endpoint = editingAttendanceId ? `/api/attendance/${editingAttendanceId}` : "/api/attendance/manual";
  const method = editingAttendanceId ? "PATCH" : "POST";
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
  showAppNotice("Presenza aggiornata.");
}

async function deleteAttendanceCorrection() {
  if (!editingAttendanceId || !canManage()) return;
  const confirmed = confirm("Eliminare questa timbratura? L'operazione verra registrata nello storico.");
  if (!confirmed) return;
  const response = await apiRequest(`/api/attendance/${editingAttendanceId}`, { method: "DELETE" });
  applyState(response.state);
  applyUser(currentUser);
  attendanceRecords = Array.isArray(response.records) ? response.records : attendanceRecords;
  attendanceCorrectionDialog.close();
  editingAttendanceId = null;
  render();
  renderAttendanceList();
  showAppNotice("Timbratura eliminata.");
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
    ["dipendente", "giornate", "ore", "timbrature_aperte"],
    ...summaryRows.map((row) => [row.employeeName, row.days, formatHours(row.hours), row.open])
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
    ? [["dipendente", "data", "inizio", "fine", "ore_lavorate", "stato"]]
    : [["data", "inizio", "fine", "ore_lavorate", "stato"]];
  let totalHours = 0;
  rows.forEach((row) => {
    totalHours += row.hours;
    const line = [
      row.dateLabel,
      attendanceTime(row.in.timestamp),
      row.out ? attendanceTime(row.out.timestamp) : "",
      row.out ? formatHours(row.hours) : "0",
      row.out ? "Completa" : "Aperta"
    ];
    csvRows.push(employeeFilter === "all" ? [row.employeeName, ...line] : line);
  });
  const totalLine = employeeFilter === "all"
    ? ["Totale", "", "", "", formatHours(totalHours), ""]
    : ["Totale", "", "", formatHours(totalHours), ""];
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
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    fiscalCode: employee.fiscalCode || "",
    communicationCode: employee.communicationCode || "",
    start: formatItalianDate(start),
    end: formatItalianDate(end)
  };
}

function renderIntermittentiPreview() {
  const rows = buildIntermittentiRows();
  const summary = document.querySelector("#intermittentiSummary");
  const preview = document.querySelector("#intermittentiPreview");
  const missingFiscalCodes = rows.filter((row) => !row.fiscalCode).length;
  const extraRows = Math.max(0, rows.length - 10);
  summary.textContent = rows.length
    ? `${rows.length} chiamate trovate${missingFiscalCodes ? ` · ${missingFiscalCodes} senza codice fiscale` : ""}${extraRows ? ` · ${extraRows} oltre le prime 10 righe del modulo` : ""}.`
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
        <div class="intermittenti-row ${index >= 10 ? "muted-row" : ""}">
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

function intermittentiFileBaseName() {
  const scope = document.querySelector("input[name='intermittentiScope']:checked").value;
  const selectedDay = weekDays.find((day) => day.key === document.querySelector("#intermittentiDay").value);
  const label = scope === "day" && selectedDay ? selectedDay.label : formatWeekRange();
  return `chiamate-intermittenti-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
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
  const rows = buildIntermittentiRows().slice(0, 10);
  if (!rows.length) return;
  const employerFiscalCode = document.querySelector("#intermittentiEmployerFiscalCode").value.trim().toUpperCase();
  const email = document.querySelector("#intermittentiEmail").value.trim();
  const bytes = await createIntermittentiPdfFromTemplate(rows, employerFiscalCode, email);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${intermittentiFileBaseName()}.pdf`);
  await logManagerActivity({
    type: "Chiamate",
    title: "PDF chiamate generato",
    detail: `${rows.length} lavoratori · ${formatWeekRange()}`,
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

function populatePresetOptions(selectedType = document.querySelector("#typeSelect").value || "Mattina") {
  const typeSelect = document.querySelector("#typeSelect");
  typeSelect.innerHTML = Object.keys(shiftPresets)
    .map((presetName) => `<option value="${escapeHtml(presetName)}">${escapeHtml(presetName)}</option>`)
    .join("");
  typeSelect.value = shiftPresets[selectedType] ? selectedType : Object.keys(shiftPresets)[0];
}

function selectedPreset() {
  return shiftPresets[document.querySelector("#typeSelect").value] || shiftPresets["Mattina"];
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
  document.querySelector("#shiftForm").reset();
  document.querySelector("#dialogTitle").textContent = "Aggiungi al calendario";
  document.querySelector("#saveShiftButton").textContent = "Salva turno";
  populatePresetOptions("Mattina");
  document.querySelector("#presetNameInput").value = "";
  applyPresetToForm("Mattina");
  document.querySelector("#workplaceInput").value = defaultWorkplace();
  if (employeeId) document.querySelector("#employeeSelect").value = employeeId;
  if (day) document.querySelector("#daySelect").value = day;
  dialog.showModal();
}

function openShiftDialogForEdit(shiftId) {
  const shift = shifts.find((item) => item.id === shiftId);
  if (!shift) return;
  editingShiftId = shiftId;
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
  currentView = "employee";
  render();
  saveState();
});
document.querySelector("#employeeAccountSelect").addEventListener("change", (event) => {
  if (backendEnabled && currentUser?.role === "employee") return;
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
  document.querySelector("#attendancePeriod").value = "today";
  setAttendancePeriod("today");
  attendanceDialog.showModal();
  loadAttendanceRecords();
});
document.querySelector("#closeAttendanceDialog").addEventListener("click", () => attendanceDialog.close());
document.querySelector("#openAttendanceCorrection").addEventListener("click", () => openAttendanceCorrection());
document.querySelector("#attendanceCorrectionForm").addEventListener("submit", saveAttendanceCorrection);
document.querySelector("#closeAttendanceCorrectionDialog").addEventListener("click", () => attendanceCorrectionDialog.close());
document.querySelector("#cancelAttendanceCorrectionDialog").addEventListener("click", () => attendanceCorrectionDialog.close());
document.querySelector("#deleteAttendanceCorrection").addEventListener("click", deleteAttendanceCorrection);
document.querySelector("#refreshAttendance").addEventListener("click", loadAttendanceRecords);
document.querySelector("#printAttendanceSheet").addEventListener("click", printAttendanceSheet);
document.querySelector("#exportAttendanceSummaryCsv").addEventListener("click", exportAttendanceSummaryCsv);
document.querySelector("#exportAttendanceDetailCsv").addEventListener("click", exportAttendanceDetailCsv);
document.querySelector("#printAttendanceSummary").addEventListener("click", printAttendanceSummary);
document.querySelector("#closeQrScanDialog").addEventListener("click", closeQrScanner);
qrScanDialog.addEventListener("close", closeQrScanner);
document.querySelector("#attendancePeriod").addEventListener("change", (event) => {
  setAttendancePeriod(event.target.value);
  renderAttendanceList();
});
document.querySelector("#attendanceMonth").addEventListener("change", (event) => {
  setAttendanceMonth(event.target.value);
  renderAttendanceList();
});
document.querySelector("#attendanceEmployeeFilter").addEventListener("change", renderAttendanceList);
document.querySelector("#attendanceFrom").addEventListener("change", () => {
  document.querySelector("#attendancePeriod").value = "custom";
  renderAttendanceList();
});
document.querySelector("#attendanceTo").addEventListener("change", () => {
  document.querySelector("#attendancePeriod").value = "custom";
  renderAttendanceList();
});
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
  renderRequestCalendar(selectedOffset);
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
  const startValue = document.querySelector("#startTime").value;
  const endValue = document.querySelector("#endTime").value;
  const isEvening = currentPreset.category === "evening" && endValue < startValue;
  shiftPresets = {
    ...shiftPresets,
    [presetName]: {
      start: currentPreset.category === "rest" || currentPreset.category === "leave" ? "" : startValue,
      end: currentPreset.category === "rest" || currentPreset.category === "leave" ? "" : `${endValue}${isEvening ? " +1d" : ""}`,
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
  const type = document.querySelector("#presetNameInput").value.trim() || document.querySelector("#typeSelect").value;
  const preset = selectedPreset();
  const startValue = document.querySelector("#startTime").value;
  const endValue = document.querySelector("#endTime").value;
  const isEvening = preset.category === "evening" && endValue < startValue;

  const nextShift = {
    employeeId: document.querySelector("#employeeSelect").value,
    day: document.querySelector("#daySelect").value,
    type,
    start: preset.category === "rest" || preset.category === "leave" ? "" : startValue,
    end: preset.category === "rest" || preset.category === "leave" ? "" : `${endValue}${isEvening ? " +1d" : ""}`,
    workplace: document.querySelector("#workplaceInput").value.trim() || defaultWorkplace(),
    color: document.querySelector("#colorInput").value,
    note: document.querySelector("#noteInput").value.trim(),
    category: preset.category
  };

  if (backendEnabled && currentUser?.role === "manager") {
    const endpoint = editingShiftId ? `/api/shifts/${editingShiftId}` : "/api/shifts";
    const payload = await apiRequest(endpoint, {
      method: editingShiftId ? "PATCH" : "POST",
      body: JSON.stringify({
        weekOffset,
        ...nextShift
      })
    });
    applyState(payload.state);
    applyUser(currentUser);
  } else if (editingShiftId) {
    shifts = shifts.map((shift) => shift.id === editingShiftId ? { ...shift, ...nextShift } : shift);
  } else {
    shifts.push({
      id: `s${Date.now()}`,
      ...nextShift
    });
  }

  event.target.reset();
  editingShiftId = null;
  populatePresetOptions("Mattina");
  applyPresetToForm("Mattina");
  document.querySelector("#workplaceInput").value = defaultWorkplace();
  dialog.close();
  render();
  if (!backendEnabled || currentUser?.role !== "manager") saveState();
});

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
