const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  featureForApiRequest,
  hasFeature,
  isProtectedMutation,
  loadLicenseContext
} = require("./license");
let webPush = null;
try {
  webPush = require("web-push");
} catch {
  webPush = null;
}
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}
let xlsx = null;
try {
  xlsx = require("xlsx");
} catch {
  xlsx = null;
}
let PDFDocument = null;
try {
  ({ PDFDocument } = require("pdf-lib"));
} catch {
  PDFDocument = null;
}

const port = Number(process.env.PORT || 4190);
const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : root;
const seedDbPath = path.join(root, "seed-data.json");
const legacyDbPath = path.join(root, "restaurant-data.json");
const dbPath = path.join(dataDir, "restaurant-data.json");
const leadsPath = path.join(dataDir, "launch-leads.json");
const backupsDir = path.join(dataDir, "backups");
const taskUploadsDir = path.join(dataDir, "task-uploads");
const payrollDir = path.join(dataDir, "payroll-documents");
const employeeDocumentsDir = path.join(dataDir, "employee-documents");
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const mansionarioApiKey = process.env.MANSIONARIO_API_KEY || "";
if (webPush && vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@example.com", vapidPublicKey, vapidPrivateKey);
}
const sessions = new Map();
let stateMutationQueue = Promise.resolve();
const sessionMaxAgeSeconds = 60 * 60 * 12;
const qrWindowMs = 30 * 1000;
const baseWeekStart = new Date(2026, 4, 18);
const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const maxTaskPhotoBytes = 4_000_000;
const maxPayrollPdfBytes = 15_000_000;
const maxEmployeeDocumentBytes = 10_000_000;
const maxJsonPayloadBytes = 22_000_000;
const appTimeZone = "Europe/Rome";
const licenseContext = loadLicenseContext({ root, env: process.env });

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf"
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxJsonPayloadBytes) {
        req.destroy();
        reject(new Error("Payload troppo grande"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON non valido"));
      }
    });
  });
}

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((cookie) => {
    const [key, ...value] = cookie.trim().split("=");
    return [key, decodeURIComponent(value.join("="))];
  }));
}

function currentUser(req) {
  const sid = parseCookies(req).sid;
  const user = sid ? sessions.get(sid) : null;
  if (!user) return null;
  if (user.createdAt && Date.now() - user.createdAt > sessionMaxAgeSeconds * 1000) {
    sessions.delete(sid);
    return null;
  }
  return user;
}

function isSecureRequest(req) {
  return Boolean(req.socket.encrypted || req.headers["x-forwarded-proto"] === "https");
}

function sessionCookie(req, sid, maxAge = sessionMaxAgeSeconds) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  return `sid=${encodeURIComponent(sid)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function hashCredential(value) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(value), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function randomPin() {
  return String(crypto.randomInt(100000, 1000000));
}

function verifyCredential(value, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;
  const [algorithm, salt, expected] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(String(value), salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function verifyManagerPassword(password) {
  if (process.env.MANAGER_PASSWORD_HASH) {
    return verifyCredential(password, process.env.MANAGER_PASSWORD_HASH);
  }
  if (process.env.MANAGER_PASSWORD) {
    return password === process.env.MANAGER_PASSWORD;
  }
  if (process.env.NODE_ENV === "production") return false;
  return password === "manager";
}

function totemSecret() {
  return process.env.TOTEM_SECRET || process.env.MANAGER_PASSWORD || process.env.MANAGER_PASSWORD_HASH || "turni-demo-secret";
}

function tokenForWindow(windowId) {
  const signature = crypto
    .createHmac("sha256", totemSecret())
    .update(`attendance:${windowId}`)
    .digest("hex")
    .slice(0, 24);
  return `${windowId}.${signature}`;
}

function activeTotemToken(req) {
  const windowId = Math.floor(Date.now() / qrWindowMs);
  const token = tokenForWindow(windowId);
  const origin = `${isSecureRequest(req) ? "https" : "http"}://${req.headers.host}`;
  return {
    token,
    code: token.split(".")[1].slice(0, 6).toUpperCase(),
    expiresAt: new Date((windowId + 1) * qrWindowMs).toISOString(),
    punchUrl: `${origin}/?punch=${encodeURIComponent(token)}`
  };
}

function verifyTotemToken(token) {
  if (typeof token !== "string" || !/^\d+\.[a-f0-9]{24}$/.test(token)) return false;
  const [windowText] = token.split(".");
  const windowId = Number(windowText);
  const currentWindow = Math.floor(Date.now() / qrWindowMs);
  if (!Number.isInteger(windowId) || Math.abs(currentWindow - windowId) > 1) return false;
  const expected = tokenForWindow(windowId);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function ensureDataStorage() {
  fs.mkdirSync(dataDir, { recursive: true });
  const seedPath = fs.existsSync(seedDbPath) ? seedDbPath : legacyDbPath;
  if (!fs.existsSync(dbPath) && fs.existsSync(seedPath) && path.resolve(seedPath) !== path.resolve(dbPath)) {
    fs.copyFileSync(seedPath, dbPath);
  }
}

function readState() {
  ensureDataStorage();
  if (!fs.existsSync(dbPath)) return null;
  const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  return normalizeState(data.state || data);
}

function normalizeState(state) {
  if (!state) return state;
  const companySettings = {
    companyName: state.companySettings?.companyName || "Bar Flora srl",
    roles: Array.isArray(state.companySettings?.roles) && state.companySettings.roles.length ? state.companySettings.roles : ["Sala", "Cucina", "Bar"],
    workplaces: Array.isArray(state.companySettings?.workplaces) && state.companySettings.workplaces.length ? state.companySettings.workplaces : ["Bar Flora srl"],
    workplaceGroups: Array.isArray(state.companySettings?.workplaceGroups)
      ? state.companySettings.workplaceGroups
        .map((group) => ({
          name: String(group?.name || "").trim(),
          workplaces: Array.isArray(group?.workplaces) ? group.workplaces.map((item) => String(item || "").trim()).filter(Boolean) : []
        }))
        .filter((group) => group.name && group.workplaces.length)
      : [],
    employerFiscalCode: state.companySettings?.employerFiscalCode || "",
    agencyEmail: state.companySettings?.agencyEmail || ""
  };
  const employees = Array.isArray(state.employees) ? state.employees.map((employee) => {
    const pinHash = employee.pinHash || hashCredential(employee.pin || randomPin());
    const { pin, ...safeEmployee } = employee;
    return {
      ...safeEmployee,
      pinHash
    };
  }) : [];
  const normalized = {
    ...state,
    companySettings,
    shiftsByWeek: state.shiftsByWeek || {},
    timeOffRequests: Array.isArray(state.timeOffRequests) ? state.timeOffRequests : [],
    employees,
    publishedWeeks: state.publishedWeeks || { 0: true },
    publishedDays: state.publishedDays || {},
    notificationLog: Array.isArray(state.notificationLog) ? state.notificationLog : [],
    notificationStatus: state.notificationStatus || {},
    attendanceRecords: Array.isArray(state.attendanceRecords) ? state.attendanceRecords : [],
    manualAttendanceRequests: Array.isArray(state.manualAttendanceRequests) ? state.manualAttendanceRequests : [],
    attendanceNoWorkDays: Array.isArray(state.attendanceNoWorkDays) ? state.attendanceNoWorkDays : [],
    attendanceRevenue: state.attendanceRevenue && typeof state.attendanceRevenue === "object" ? state.attendanceRevenue : {},
    tipMonths: state.tipMonths && typeof state.tipMonths === "object" ? state.tipMonths : {},
    payrollDocuments: Array.isArray(state.payrollDocuments) ? state.payrollDocuments : [],
    employeeDocuments: Array.isArray(state.employeeDocuments) ? state.employeeDocuments : [],
    activityLog: Array.isArray(state.activityLog) ? state.activityLog : [],
    taskModule: {
      enabled: Boolean(state.taskModule?.enabled),
      reminderMinutesBefore: Number(state.taskModule?.reminderMinutesBefore) || 30
    },
    taskTemplates: Array.isArray(state.taskTemplates) ? state.taskTemplates.map((template) => normalizeTaskTemplate(template, template)) : [],
    taskAssignments: Array.isArray(state.taskAssignments) ? state.taskAssignments : [],
    pushSubscriptions: Array.isArray(state.pushSubscriptions) ? state.pushSubscriptions : []
  };
  normalized.taskAssignments = mergeSharedTaskAssignments(normalized);
  return normalized;
}

function sanitizeEmployee(employee) {
  const { pin, pinHash, ...publicEmployee } = employee;
  return {
    ...publicEmployee,
    hasPin: Boolean(pinHash)
  };
}

function sanitizeEmployeeForLogin(employee) {
  const publicEmployee = sanitizeEmployee(employee);
  return {
    id: publicEmployee.id,
    name: publicEmployee.name,
    role: publicEmployee.role,
    color: publicEmployee.color,
    target: publicEmployee.target,
    supervisor: Boolean(publicEmployee.supervisor),
    hasPin: publicEmployee.hasPin
  };
}

function sanitizePayrollDocument(document) {
  const { file, fiscalCode, ...safeDocument } = document;
  return safeDocument;
}

function sanitizeEmployeeDocument(document) {
  const { file, ...safeDocument } = document;
  return safeDocument;
}

function activeEmployees(state) {
  return (state.employees || []).filter((employee) => !employee.archivedAt && employee.active !== false);
}

function sanitizeStateForManager(state) {
  return {
    ...state,
    employees: state.employees.map(sanitizeEmployee),
    payrollDocuments: (state.payrollDocuments || []).map(sanitizePayrollDocument),
    employeeDocuments: (state.employeeDocuments || []).map(sanitizeEmployeeDocument)
  };
}

function isShiftPublishedForEmployee(state, offset, shift) {
  return Boolean(state.publishedWeeks?.[offset] || state.publishedDays?.[offset]?.[shift.day]);
}

function employeeVisibleState(state, user) {
  const employeeId = user.employeeId;
  const visibleShiftsByWeek = {};
  Object.entries(state.shiftsByWeek || {}).forEach(([offset, shifts]) => {
    const visibleShifts = (shifts || []).filter((shift) => (
      shift.employeeId === employeeId && isShiftPublishedForEmployee(state, offset, shift)
    ));
    if (visibleShifts.length) visibleShiftsByWeek[offset] = visibleShifts;
  });

  return {
    ...state,
    appMode: "employee",
    activeEmployeeId: employeeId,
    employees: state.employees.filter((employee) => employee.id === employeeId).map(sanitizeEmployee),
    shiftsByWeek: visibleShiftsByWeek,
    timeOffRequests: state.timeOffRequests.filter((request) => request.employeeId === employeeId),
    attendanceRecords: (state.attendanceRecords || []).filter((record) => record.employeeId === employeeId),
    attendanceNoWorkDays: (state.attendanceNoWorkDays || []).filter((day) => day.employeeId === employeeId),
    attendanceRevenue: {},
    taskTemplates: [],
    taskAssignments: visibleTaskAssignments(state, user),
    tipMonths: {},
    payrollDocuments: (state.payrollDocuments || [])
      .filter((document) => document.employeeId === employeeId)
      .map(sanitizePayrollDocument),
    employeeDocuments: (state.employeeDocuments || [])
      .filter((document) => document.employeeId === employeeId)
      .map(sanitizeEmployeeDocument),
    pushSubscriptions: [],
    notificationLog: [],
    notificationStatus: {},
    activityLog: []
  };
}

function supervisorVisibleState(state, user) {
  const visibleShiftsByWeek = {};
  Object.entries(state.shiftsByWeek || {}).forEach(([offset, shifts]) => {
    const visibleShifts = (shifts || []).filter((shift) => isShiftPublishedForEmployee(state, offset, shift));
    if (visibleShifts.length) visibleShiftsByWeek[offset] = visibleShifts;
  });

  return {
    ...state,
    appMode: "supervisor",
    activeEmployeeId: user.employeeId,
    employees: state.employees.map(sanitizeEmployee),
    shiftsByWeek: visibleShiftsByWeek,
    timeOffRequests: [],
    attendanceRecords: [],
    attendanceNoWorkDays: [],
    attendanceRevenue: {},
    taskTemplates: [],
    taskAssignments: visibleTaskAssignments(state, user),
    tipMonths: {},
    payrollDocuments: [],
    employeeDocuments: [],
    pushSubscriptions: [],
    notificationLog: [],
    notificationStatus: {},
    activityLog: []
  };
}

function visibleTaskAssignments(state, user) {
  const assignments = Array.isArray(state.taskAssignments) ? state.taskAssignments : [];
  if (user.role === "manager") return assignments;
  if (user.role === "employee") {
    return assignments.filter((task) => (
      (taskEmployeeIds(task).includes(user.employeeId) || task.verifierEmployeeId === user.employeeId) &&
      isTaskPublished(state, task)
    ));
  }
  if (user.role === "supervisor") {
    return assignments.filter((task) => isTaskPublished(state, task));
  }
  return [];
}

function isTaskPublished(state, task) {
  return Boolean(state.publishedWeeks?.[task.weekOffset] || state.publishedDays?.[task.weekOffset]?.[task.day]);
}

function attendanceWithEmployees(state) {
  const employeeNames = new Map((state.employees || []).map((employee) => [employee.id, employee.name]));
  return (state.attendanceRecords || []).map((record) => ({
    ...record,
    employeeName: employeeNames.get(record.employeeId) || "Dipendente"
  }));
}

function manualAttendanceRequestsWithEmployees(state) {
  const employeeNames = new Map((state.employees || []).map((employee) => [employee.id, employee.name]));
  return (state.manualAttendanceRequests || []).map((request) => ({
    ...request,
    employeeName: employeeNames.get(request.employeeId) || "Dipendente"
  }));
}

function attendanceNoWorkDaysWithEmployees(state) {
  const employeeNames = new Map((state.employees || []).map((employee) => [employee.id, employee.name]));
  return (state.attendanceNoWorkDays || []).map((day) => ({
    ...day,
    employeeName: employeeNames.get(day.employeeId) || "Dipendente"
  }));
}

function datePartsInAppTimeZone(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  if (values.hour === 24) values.hour = 0;
  return values;
}

function appTimeZoneOffsetMs(date) {
  const parts = datePartsInAppTimeZone(date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
  return asUtc - date.getTime();
}

function dateTimeInAppTimeZoneToUtc(year, month, day, hours, minutes) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const firstOffset = appTimeZoneOffsetMs(utcGuess);
  let date = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = appTimeZoneOffsetMs(date);
  if (secondOffset !== firstOffset) date = new Date(utcGuess.getTime() - secondOffset);
  const parts = datePartsInAppTimeZone(date);
  if (parts.year !== year || parts.month !== month || parts.day !== day || parts.hour !== hours || parts.minute !== minutes) return null;
  return date;
}

function parseLocalDateTime(dateText, timeText) {
  const rawDate = String(dateText || "").trim();
  const isoDateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const italianDateMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = String(timeText || "").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if ((!isoDateMatch && !italianDateMatch) || !timeMatch) return null;
  const year = isoDateMatch ? Number(isoDateMatch[1]) : Number(italianDateMatch[3]);
  const month = isoDateMatch ? Number(isoDateMatch[2]) : Number(italianDateMatch[2]);
  const day = isoDateMatch ? Number(isoDateMatch[3]) : Number(italianDateMatch[1]);
  const [, hours, minutes] = timeMatch.map(Number);
  const date = dateTimeInAppTimeZoneToUtc(year, month, day, hours, minutes);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function parseImportDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
  }
  const text = String(value || "").trim();
  const match = text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (!match) return "";
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (year < 1000) year = 2000 + (year % 100);
  return `${String(Number(match[1])).padStart(2, "0")}/${String(Number(match[2])).padStart(2, "0")}/${year}`;
}

function parseImportTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  }
  let text = String(value || "").trim().toLowerCase();
  text = text.replace(/[^\d:.]/g, "");
  if (!text) return "";
  let hours = null;
  let minutes = 0;
  const separated = text.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (separated) {
    hours = Number(separated[1]);
    minutes = Number(separated[2].padEnd(2, "0").slice(0, 2));
  } else if (/^\d{3,4}$/.test(text)) {
    hours = Number(text.slice(0, -2));
    minutes = Number(text.slice(-2));
  } else if (/^\d{1,2}$/.test(text)) {
    hours = Number(text);
  }
  if (hours === null || hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function importedRowsFromText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      return line.split(delimiter).map((cell) => cell.trim());
    });
}

function importedRowsFromFile(body) {
  if (!body.fileBase64) return [];
  const buffer = Buffer.from(String(body.fileBase64).replace(/^data:[^,]+,/, ""), "base64");
  const fileName = String(body.fileName || "").toLowerCase();
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    if (!xlsx) throw new Error("Import Excel non configurato: manca la libreria xlsx");
    const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false, raw: false });
  }
  return importedRowsFromText(buffer.toString("utf8"));
}

function findImportColumn(headers, names) {
  return headers.findIndex((header) => names.includes(header));
}

function employeeByImportedName(state, name) {
  const normalizedName = normalizeHeader(name);
  if (!normalizedName) return null;
  const employees = state.employees || [];
  return employees.find((employee) => normalizeHeader(employee.name) === normalizedName)
    || employees.find((employee) => normalizeHeader(employee.name).includes(normalizedName))
    || employees.find((employee) => normalizedName.includes(normalizeHeader(employee.name)));
}

function cleanImportLineText(value) {
  return String(value || "")
    .replace(/a[iI]{2}e/g, "alle")
    .replace(/da[iI]{2}e/g, "dalle");
}

function parseAttendanceImportRows(state, body) {
  const sourceRows = [
    ...importedRowsFromFile(body),
    ...importedRowsFromText(body.text)
  ].filter((row) => row.some((cell) => String(cell || "").trim()));
  if (!sourceRows.length) return { rows: [], errors: ["Nessuna riga trovata nel file o nel testo incollato."] };

  const firstHeaders = sourceRows[0].map(normalizeHeader);
  const hasHeader = firstHeaders.some((header) => ["dipendente", "nome", "employee", "data", "giorno", "entrata", "inizio", "orainizio", "uscita", "fine", "orafine"].includes(header));
  const headers = hasHeader ? firstHeaders : [];
  let rows = hasHeader ? sourceRows.slice(1) : sourceRows;
  let defaultEmployee = body.employeeId ? (state.employees || []).find((employee) => employee.id === body.employeeId) : null;
  if (!defaultEmployee && !hasHeader && sourceRows[0]?.length === 1 && !parseImportDate(sourceRows[0][0])) {
    const employeeFromFirstLine = employeeByImportedName(state, sourceRows[0][0]);
    if (employeeFromFirstLine) {
      defaultEmployee = employeeFromFirstLine;
      rows = sourceRows.slice(1);
    }
  }

  const colEmployee = headers.length ? findImportColumn(headers, ["dipendente", "nome", "employee", "collaboratore"]) : 0;
  const colDate = headers.length ? findImportColumn(headers, ["data", "giorno", "date"]) : defaultEmployee ? 0 : 1;
  const colStart = headers.length ? findImportColumn(headers, ["entrata", "inizio", "orainizio", "start"]) : defaultEmployee ? 1 : 2;
  const colEnd = headers.length ? findImportColumn(headers, ["uscita", "fine", "orafine", "end"]) : defaultEmployee ? 2 : 3;
  const colNote = headers.length ? findImportColumn(headers, ["nota", "note", "descrizione"]) : -1;

  const parsedRows = [];
  const errors = [];
  rows.forEach((row, index) => {
    const lineNumber = index + (hasHeader ? 2 : 1);
    const lineText = cleanImportLineText(row.map((cell) => String(cell || "")).join(" "));
    const employeeName = defaultEmployee?.name || row[colEmployee] || "";
    const employee = defaultEmployee || employeeByImportedName(state, employeeName);
    const date = parseImportDate(row[colDate]) || parseImportDate(lineText);
    const start = parseImportTime(row[colStart]) || parseImportTime((lineText.match(/(?:alle|entrata|inizio)\s*(\d{1,2}(?::|\.|)?\d{0,2})/i) || [])[1]);
    const end = parseImportTime(row[colEnd]) || parseImportTime((lineText.match(/(?:dalle|uscita|fine)\s*(\d{1,2}(?::|\.|)?\d{0,2})/i) || [])[1]);
    const note = colNote >= 0 ? String(row[colNote] || "").trim() : "";

    if (!employee || !date || !start || !end) {
      errors.push(`Riga ${lineNumber}: ${!employee ? "dipendente non trovato" : ""}${!date ? " data mancante/non valida" : ""}${!start ? " entrata mancante/non valida" : ""}${!end ? " uscita mancante/non valida" : ""}`.trim());
      return;
    }
    const startDate = parseLocalDateTime(date, start);
    const endDate = parseLocalDateTime(date, end);
    if (!startDate || !endDate) {
      errors.push(`Riga ${lineNumber}: data o orari non validi`);
      return;
    }
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
    parsedRows.push({
      lineNumber,
      employeeId: employee.id,
      employeeName: employee.name,
      date,
      start,
      end,
      startTimestamp: startDate.toISOString(),
      endTimestamp: endDate.toISOString(),
      hours: Math.round(((endDate - startDate) / 3_600_000) * 100) / 100,
      note
    });
  });
  return { rows: parsedRows, errors };
}

function attendanceAlertRecipient(state) {
  return process.env.ATTENDANCE_ALERT_EMAIL || process.env.MANAGER_EMAIL || state.companySettings?.agencyEmail || "";
}

async function sendManualAttendanceEmail(state, request) {
  const to = attendanceAlertRecipient(state);
  if (!nodemailer || !to || !process.env.SMTP_HOST) {
    return { sent: false, reason: "Email non configurata" };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  const auth = process.env.SMTP_USER && process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth
  });
  const employee = (state.employees || []).find((item) => item.id === request.employeeId);
  const date = new Date(request.startTimestamp).toLocaleDateString("it-IT", { timeZone: appTimeZone });
  const start = new Date(request.startTimestamp).toLocaleTimeString("it-IT", { timeZone: appTimeZone, hour: "2-digit", minute: "2-digit" });
  const end = new Date(request.endTimestamp).toLocaleTimeString("it-IT", { timeZone: appTimeZone, hour: "2-digit", minute: "2-digit" });
  const subject = `Richiesta timbratura manuale - ${employee?.name || "Dipendente"}`;
  const text = [
    "Nuova richiesta di timbratura manuale.",
    "",
    `Dipendente: ${employee?.name || request.employeeId}`,
    `Data: ${date}`,
    `Entrata: ${start}`,
    `Uscita: ${end}${request.crossesMidnight ? " (giorno successivo)" : ""}`,
    request.note ? `Note: ${request.note}` : "",
    "",
    "Apri Presenze nell'app turni per approvare o respingere."
  ].filter(Boolean).join("\n");
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || to,
    to,
    subject,
    text
  });
  return { sent: true };
}

function latestAttendanceForEmployee(state, employeeId) {
  return (state.attendanceRecords || [])
    .filter((record) => record.employeeId === employeeId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;
}

function stateForUser(state, user) {
  const visibleState = user.role === "employee"
    ? employeeVisibleState(state, user)
    : user.role === "supervisor"
      ? supervisorVisibleState(state, user)
      : sanitizeStateForManager(state);
  return stateForLicense(visibleState);
}

function stateForLicense(state) {
  const visible = { ...state };
  if (!hasFeature(licenseContext, "attendance")) {
    visible.attendanceRecords = [];
    visible.manualAttendanceRequests = [];
    visible.attendanceNoWorkDays = [];
  }
  if (!hasFeature(licenseContext, "revenue_productivity")) visible.attendanceRevenue = {};
  if (!hasFeature(licenseContext, "tips")) visible.tipMonths = {};
  if (!hasFeature(licenseContext, "payroll_documents")) visible.payrollDocuments = [];
  if (!hasFeature(licenseContext, "employee_documents")) visible.employeeDocuments = [];
  if (!hasFeature(licenseContext, "task_module")) {
    visible.taskModule = { enabled: false, reminderMinutesBefore: 30 };
    visible.taskTemplates = [];
    visible.taskAssignments = [];
  }
  if (!hasFeature(licenseContext, "push_notifications")) visible.pushSubscriptions = [];
  if (!hasFeature(licenseContext, "activity_history")) visible.activityLog = [];
  return visible;
}

function mergeSensitiveEmployeeFields(incomingState, currentState) {
  const currentById = new Map((currentState?.employees || []).map((employee) => [employee.id, employee]));
  const incomingCompanySettings = incomingState.companySettings || {};
  const currentCompanySettings = currentState?.companySettings || {};
  const currentWorkplaces = Array.isArray(currentCompanySettings.workplaces) ? currentCompanySettings.workplaces : [];
  const incomingWorkplaces = Array.isArray(incomingCompanySettings.workplaces)
    ? incomingCompanySettings.workplaces.filter(Boolean)
    : [];
  const licensedWorkplaces = hasFeature(licenseContext, "multi_workplace")
    ? incomingWorkplaces
    : currentWorkplaces.length > 1
      ? currentWorkplaces
      : incomingWorkplaces.slice(0, 1).length
        ? incomingWorkplaces.slice(0, 1)
        : currentWorkplaces;
  return {
    ...incomingState,
    companySettings: {
      ...incomingCompanySettings,
      workplaces: licensedWorkplaces,
      workplaceGroups: hasFeature(licenseContext, "workplace_groups")
        ? incomingCompanySettings.workplaceGroups
        : currentCompanySettings.workplaceGroups
    },
    attendanceRecords: Array.isArray(currentState?.attendanceRecords) ? currentState.attendanceRecords : [],
    manualAttendanceRequests: Array.isArray(currentState?.manualAttendanceRequests) ? currentState.manualAttendanceRequests : [],
    attendanceNoWorkDays: Array.isArray(currentState?.attendanceNoWorkDays) ? currentState.attendanceNoWorkDays : [],
    attendanceRevenue: currentState?.attendanceRevenue && typeof currentState.attendanceRevenue === "object" ? currentState.attendanceRevenue : {},
    tipMonths: currentState?.tipMonths && typeof currentState.tipMonths === "object" ? currentState.tipMonths : {},
    payrollDocuments: Array.isArray(currentState?.payrollDocuments) ? currentState.payrollDocuments : [],
    employeeDocuments: Array.isArray(currentState?.employeeDocuments) ? currentState.employeeDocuments : [],
    taskModule: currentState?.taskModule || { enabled: false, reminderMinutesBefore: 30 },
    taskTemplates: Array.isArray(currentState?.taskTemplates) ? currentState.taskTemplates : [],
    taskAssignments: Array.isArray(currentState?.taskAssignments) ? currentState.taskAssignments : [],
    activityLog: Array.isArray(currentState?.activityLog) ? currentState.activityLog : [],
    pushSubscriptions: Array.isArray(incomingState.pushSubscriptions)
      ? incomingState.pushSubscriptions
      : currentState?.pushSubscriptions || [],
    employees: (incomingState.employees || []).map((employee) => {
      const current = currentById.get(employee.id);
      const next = { ...employee };
      if (!hasFeature(licenseContext, "supervisor")) next.supervisor = Boolean(current?.supervisor);
      if (isValidPin(employee.pin)) {
        next.pinHash = hashCredential(employee.pin);
      } else if (current?.pinHash) {
        next.pinHash = current.pinHash;
      } else {
        next.pinHash = hashCredential(randomPin());
      }
      delete next.pin;
      delete next.hasPin;
      return next;
    })
  };
}

function writeState(state) {
  ensureDataStorage();
  backupStateFile();
  const tempPath = `${dbPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(normalizeState(state), null, 2));
  fs.renameSync(tempPath, dbPath);
}

async function mutateState(mutator) {
  const run = stateMutationQueue.then(() => {
    const state = readState();
    const result = mutator(state) || {};
    if (!result.skipWrite) writeState(state);
    return { state, ...result };
  });
  stateMutationQueue = run.catch(() => {});
  return run;
}

function employeeName(state, employeeId) {
  return (state.employees || []).find((employee) => employee.id === employeeId)?.name || "Dipendente";
}

function dayLabel(dayKey) {
  return {
    mon: "lunedi",
    tue: "martedi",
    wed: "mercoledi",
    thu: "giovedi",
    fri: "venerdi",
    sat: "sabato",
    sun: "domenica"
  }[dayKey] || dayKey;
}

function requestDayRange(request) {
  const startIndex = dayKeys.indexOf(request.day);
  const endIndex = dayKeys.indexOf(request.endDay || request.day);
  if (startIndex < 0) return [];
  const safeEndIndex = endIndex >= startIndex ? endIndex : startIndex;
  return dayKeys.slice(startIndex, safeEndIndex + 1);
}

function addActivity(state, activity) {
  state.activityLog = Array.isArray(state.activityLog) ? state.activityLog : [];
  state.activityLog.unshift({
    id: `l${Date.now()}-${crypto.randomBytes(5).toString("hex")}`,
    type: activity.type || "Evento",
    title: activity.title || "Attivita registrata",
    detail: activity.detail || "",
    weekOffset: Number.isFinite(Number(activity.weekOffset)) ? Number(activity.weekOffset) : null,
    createdAt: new Date().toISOString()
  });
  state.activityLog = state.activityLog.slice(0, 500);
}

function backupFiles() {
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      return {
        file,
        filePath,
        size: stats.size,
        createdAt: stats.mtime.toISOString(),
        mtimeMs: stats.mtimeMs
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function pruneBackups(keep = 80) {
  backupFiles().slice(keep).forEach((backup) => {
    try {
      fs.unlinkSync(backup.filePath);
    } catch (error) {
      console.warn(`Backup non eliminato: ${backup.file}`, error.message);
    }
  });
}

function backupStateFile() {
  ensureDataStorage();
  if (!fs.existsSync(dbPath)) return;
  fs.mkdirSync(backupsDir, { recursive: true });
  pruneBackups(80);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `restaurant-data-${stamp}.json`);
  try {
    fs.copyFileSync(dbPath, backupPath);
  } catch (error) {
    if (error.code === "ENOSPC") {
      pruneBackups(20);
      try {
        fs.copyFileSync(dbPath, backupPath);
        return;
      } catch (retryError) {
        console.warn("Backup saltato: spazio insufficiente anche dopo pulizia.", retryError.message);
        return;
      }
    }
    console.warn("Backup saltato:", error.message);
  }
}

function listBackups(limit = 120) {
  return backupFiles()
    .slice(0, limit)
    .map(({ file, size, createdAt }) => ({ file, size, createdAt }));
}

function safeBackupPath(file) {
  const resolved = path.normalize(path.join(backupsDir, file));
  if ((!resolved.startsWith(`${backupsDir}${path.sep}`) && resolved !== backupsDir) || !file.endsWith(".json")) return null;
  return resolved;
}

function managerOnly(req, res) {
  const user = currentUser(req);
  if (!user || user.role !== "manager") {
    sendJson(res, 403, { error: "Solo il manager puo eseguire questa azione" });
    return null;
  }
  return user;
}

function externalOnly(req, res) {
  if (!mansionarioApiKey) {
    sendJson(res, 503, { error: "API mansionario non configurata" });
    return false;
  }
  const key = req.headers["x-mansionario-key"];
  if (!key || key !== mansionarioApiKey) {
    sendJson(res, 403, { error: "Accesso mansionario non autorizzato" });
    return false;
  }
  return true;
}

function externalScheduleState(state) {
  const visibleShiftsByWeek = {};
  Object.entries(state.shiftsByWeek || {}).forEach(([offset, shifts]) => {
    const visibleShifts = (shifts || []).filter((shift) => isShiftPublishedForEmployee(state, offset, shift));
    if (visibleShifts.length) visibleShiftsByWeek[offset] = visibleShifts;
  });
  return {
    companySettings: state.companySettings,
    employees: activeEmployees(state).map(sanitizeEmployeeForLogin),
    shiftsByWeek: visibleShiftsByWeek,
    publishedWeeks: state.publishedWeeks || {},
    publishedDays: state.publishedDays || {},
    generatedAt: new Date().toISOString()
  };
}

function defaultShiftPresets(state) {
  return state.shiftPresets || {};
}

function requestShiftFromApproval(state, request, day = request.day) {
  const presets = defaultShiftPresets(state);
  const effectiveType = request.type === "Mezza giornata" ? "Giorno di riposo" : request.type;
  const preset = presets[effectiveType] || presets["Giorno di riposo"] || { color: "#f1f1f3", category: "rest" };
  const defaultWorkplace = state.companySettings?.workplaces?.[0] || state.companySettings?.companyName || "Bar Flora srl";
  return {
    id: `s${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
    employeeId: request.employeeId,
    day,
    type: request.type,
    start: request.type === "Mezza giornata" ? request.startTime : "",
    end: request.type === "Mezza giornata" ? request.endTime : "",
    workplace: defaultWorkplace,
    color: preset.color,
    note: request.note ? `Richiesta approvata: ${request.note}` : "Richiesta approvata",
    category: preset.category
  };
}

function isWorkingShift(shift) {
  return shift && shift.category !== "rest" && shift.category !== "leave";
}

function normalizeTaskTemplate(body = {}, existing = {}) {
  return {
    id: existing.id || `tt${Date.now()}-${crypto.randomBytes(5).toString("hex")}`,
    title: String(body.title || existing.title || "").trim(),
    description: String(body.description || existing.description || "").trim(),
    role: String(body.role || existing.role || "all").trim() || "all",
    workplace: String(body.workplace || existing.workplace || "all").trim() || "all",
    shiftType: String(body.shiftType || existing.shiftType || "all").trim() || "all",
    assignmentMode: body.assignmentMode === "single" ? "single" : body.assignmentMode === "shared" ? "shared" : existing.assignmentMode || "shared",
    assigneeEmployeeId: String(body.assigneeEmployeeId || existing.assigneeEmployeeId || "").trim(),
    day: dayKeys.includes(body.day) ? body.day : dayKeys.includes(existing.day) ? existing.day : "all",
    taskTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(body.taskTime || existing.taskTime || "") ? body.taskTime || existing.taskTime : "",
    verifierEmployeeId: String(body.verifierEmployeeId || existing.verifierEmployeeId || "").trim(),
    proofRequired: ["none", "note", "photo"].includes(body.proofRequired) ? body.proofRequired : existing.proofRequired || "none",
    active: body.active === undefined ? existing.active !== false : Boolean(body.active),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function shiftMatchesTaskType(templateShiftType, shift) {
  if (!templateShiftType || templateShiftType === "all") return true;
  const shiftType = String(shift.type || "");
  const category = String(shift.category || "");
  if (templateShiftType === shiftType || templateShiftType === category) return true;
  if (templateShiftType === "day") return /diurno|apertura|giorno/i.test(shiftType) || category === "day";
  if (templateShiftType === "evening") return /serale|sera|chiusura/i.test(shiftType) || category === "evening";
  return false;
}

function taskTemplateMatchesShift(template, shift, employee) {
  if (!template.active || !isWorkingShift(shift)) return false;
  if (template.day !== "all" && template.day !== shift.day) return false;
  if (template.assignmentMode === "single" && template.assigneeEmployeeId !== shift.employeeId) return false;
  if (template.role !== "all" && template.role !== employee?.role) return false;
  if (template.workplace !== "all" && template.workplace !== (shift.workplace || "")) return false;
  if (!shiftMatchesTaskType(template.shiftType, shift)) return false;
  return true;
}

function taskGroupKey(template, shift) {
  return [
    template.id,
    template.assignmentMode === "single" ? shift.employeeId : "shared",
    shift.day,
    shift.workplace || "",
    template.taskTime || "",
    template.shiftType === "all" ? "all" : template.shiftType === shift.category ? shift.category : shift.type || ""
  ].join("|");
}

function taskEmployeeIds(task) {
  return [...new Set([...(Array.isArray(task.employeeIds) ? task.employeeIds : []), task.employeeId].filter(Boolean))];
}

function sharedTaskKey(task) {
  return [
    task.weekOffset,
    task.day,
    task.templateId,
    task.groupKey || "",
    task.workplace || "",
    task.shiftType || ""
  ].join("|");
}

function mergeSharedTaskAssignments(state) {
  const merged = new Map();
  (state.taskAssignments || []).forEach((task) => {
    const key = sharedTaskKey(task);
    if (!merged.has(key)) {
      merged.set(key, {
        ...task,
        employeeIds: taskEmployeeIds(task),
        shiftIds: [...new Set([...(Array.isArray(task.shiftIds) ? task.shiftIds : []), task.shiftId].filter(Boolean))]
      });
      return;
    }
    const existing = merged.get(key);
    existing.employeeIds = [...new Set([...taskEmployeeIds(existing), ...taskEmployeeIds(task)])];
    existing.shiftIds = [...new Set([...(existing.shiftIds || []), ...(task.shiftIds || []), task.shiftId].filter(Boolean))];
    if (["done", "verified"].includes(task.status) && !["verified"].includes(existing.status)) {
      existing.status = task.status;
      existing.note = task.note || existing.note;
      existing.photo = task.photo || existing.photo;
      existing.completedAt = task.completedAt || existing.completedAt;
      existing.completedBy = task.completedBy || task.employeeId || existing.completedBy;
    }
    if (task.status === "verified") {
      existing.status = "verified";
      existing.verifiedAt = task.verifiedAt || existing.verifiedAt;
      existing.verifiedBy = task.verifiedBy || existing.verifiedBy;
    }
  });
  return [...merged.values()];
}

function generateTaskAssignmentsForPublication(state, offset, day = null) {
  state.taskModule = state.taskModule || {};
  if (!state.taskModule.enabled) return 0;
  state.taskTemplates = Array.isArray(state.taskTemplates) ? state.taskTemplates : [];
  state.taskAssignments = Array.isArray(state.taskAssignments) ? state.taskAssignments : [];
  const weekOffset = String(Number(offset) || 0);
  const shifts = (state.shiftsByWeek?.[weekOffset] || []).filter((shift) => !day || shift.day === day);
  const employeesById = new Map((state.employees || []).map((employee) => [employee.id, employee]));
  let created = 0;

  shifts.forEach((shift) => {
    if (!isWorkingShift(shift)) return;
    const employee = employeesById.get(shift.employeeId);
    if (!employee) return;
    state.taskTemplates
      .filter((template) => taskTemplateMatchesShift(template, shift, employee))
      .forEach((template) => {
        const groupKey = taskGroupKey(template, shift);
        const existing = state.taskAssignments.find((assignment) => (
          assignment.weekOffset === weekOffset &&
          assignment.day === shift.day &&
          assignment.templateId === template.id &&
          (assignment.groupKey || taskGroupKey(template, assignment)) === groupKey
        ));
        if (existing) {
          existing.employeeIds = [...new Set([...taskEmployeeIds(existing), shift.employeeId])];
          if (existing.status === "assigned" || existing.status === "rejected") {
            existing.employeeId = existing.employeeIds[0] || shift.employeeId;
            existing.workplace = shift.workplace || "";
            existing.shiftType = shift.type || "";
            existing.start = shift.start || "";
            existing.end = shift.end || "";
            existing.title = template.title;
            existing.description = template.description;
            existing.proofRequired = template.proofRequired;
            existing.verifierEmployeeId = template.verifierEmployeeId || "";
            existing.assignmentMode = template.assignmentMode || "shared";
            existing.assigneeEmployeeId = template.assigneeEmployeeId || "";
            existing.taskTime = template.taskTime || "";
            existing.updatedAt = new Date().toISOString();
          }
          return;
        }
        state.taskAssignments.push({
          id: `ta${Date.now()}-${crypto.randomBytes(5).toString("hex")}`,
          templateId: template.id,
          shiftId: shift.id,
          shiftIds: [shift.id],
          groupKey,
          weekOffset,
          day: shift.day,
          employeeId: shift.employeeId,
          employeeIds: [shift.employeeId],
          workplace: shift.workplace || "",
          shiftType: shift.type || "",
          start: shift.start || "",
          end: shift.end || "",
          title: template.title,
          description: template.description,
          proofRequired: template.proofRequired,
          assignmentMode: template.assignmentMode || "shared",
          assigneeEmployeeId: template.assigneeEmployeeId || "",
          taskTime: template.taskTime || "",
          verifierEmployeeId: template.verifierEmployeeId || "",
          status: "assigned",
          note: "",
          photo: null,
          completedAt: "",
          verifiedAt: "",
          verifiedBy: "",
          rejectionNote: "",
          reminderSentAt: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        created += 1;
      });
  });
  return created;
}

function saveTaskPhoto(taskId, photoData) {
  if (!photoData) return null;
  const match = String(photoData).match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Foto non valida: usa JPG, PNG o WEBP.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > maxTaskPhotoBytes) throw new Error("Foto troppo grande: massimo 4 MB.");
  fs.mkdirSync(taskUploadsDir, { recursive: true });
  const extension = match[1].includes("png") ? ".png" : match[1].includes("webp") ? ".webp" : ".jpg";
  const file = `${taskId}-${Date.now()}${extension}`;
  fs.writeFileSync(path.join(taskUploadsDir, file), bytes);
  return { file, mimeType: match[1], size: bytes.length };
}

function canAccessTask(user, task) {
  if (!user || !task) return false;
  if (user.role === "manager" || user.role === "supervisor") return true;
  return user.role === "employee" && (taskEmployeeIds(task).includes(user.employeeId) || task.verifierEmployeeId === user.employeeId);
}

function canVerifyTask(user, task) {
  if (!user || !task) return false;
  return user.role === "manager" || user.role === "supervisor" || task.verifierEmployeeId === user.employeeId;
}

function shiftStartDate(task) {
  const weekStart = new Date(baseWeekStart);
  weekStart.setDate(weekStart.getDate() + Number(task.weekOffset) * 7 + Math.max(dayKeys.indexOf(task.day), 0));
  const [hours, minutes] = String(task.start || "09:00").slice(0, 5).split(":").map(Number);
  weekStart.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return weekStart;
}

async function sendDueTaskReminders() {
  if (!webPush || !vapidPublicKey || !vapidPrivateKey) return;
  const state = readState();
  if (!state?.taskModule?.enabled) return;
  const now = new Date();
  const subscriptions = Array.isArray(state.pushSubscriptions) ? state.pushSubscriptions : [];
  let changed = false;
  const employeesById = new Map((state.employees || []).map((employee) => [employee.id, employee]));
  for (const task of state.taskAssignments || []) {
    if (task.reminderSentAt || task.status === "verified" || !task.start || !isTaskPublished(state, task)) continue;
    const reminderAt = new Date(shiftStartDate(task).getTime() - (state.taskModule.reminderMinutesBefore || 30) * 60 * 1000);
    if (now < reminderAt || now - reminderAt > 20 * 60 * 1000) continue;
    const employeeSubscriptions = subscriptions.filter((item) => item.employeeId === task.employeeId && item.subscription);
    if (!employeeSubscriptions.length) continue;
    const employee = employeesById.get(task.employeeId);
    const payload = JSON.stringify({
      title: "Promemoria mansione",
      body: `${task.title} · ${employee?.name || "Dipendente"} · ${task.start}`,
      url: "/"
    });
    await Promise.allSettled(employeeSubscriptions.map((item) => webPush.sendNotification(item.subscription, payload)));
    task.reminderSentAt = new Date().toISOString();
    changed = true;
  }
  if (changed) writeState(state);
}

function findShiftWeekOffset(state, shiftId, preferredWeekOffset) {
  const weeks = state.shiftsByWeek || {};
  const preferred = String(Number(preferredWeekOffset) || 0);
  if ((weeks[preferred] || []).some((shift) => shift.id === shiftId)) return preferred;
  return Object.keys(weeks).find((offset) => (weeks[offset] || []).some((shift) => shift.id === shiftId)) || preferred;
}

function isValidPin(pin) {
  return typeof pin === "string" && /^\d{4,8}$/.test(pin);
}

function cleanLeadText(value, maxLength = 300) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function readLeads() {
  ensureDataStorage();
  if (!fs.existsSync(leadsPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(leadsPath, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

function writeLead(lead) {
  const leads = readLeads();
  leads.unshift(lead);
  fs.writeFileSync(leadsPath, JSON.stringify(leads.slice(0, 1000), null, 2));
}

function csvCell(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function leadsCsv(leads) {
  const columns = [
    ["createdAt", "Data"],
    ["restaurantName", "Locale"],
    ["city", "Citta"],
    ["staffSize", "Staff"],
    ["contactName", "Referente"],
    ["contactMethod", "Contatto"],
    ["currentTool", "Gestione attuale"],
    ["message", "Note"],
    ["source", "Fonte"]
  ];
  return [
    columns.map(([, label]) => csvCell(label)).join(","),
    ...leads.map((lead) => columns.map(([key]) => csvCell(lead[key])).join(","))
  ].join("\n");
}

let pdfJsPromise = null;

function payrollFiscalCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function payrollEmployeeMap(state) {
  return new Map((state.employees || [])
    .map((employee) => [payrollFiscalCode(employee.fiscalCode), employee])
    .filter(([fiscalCode]) => fiscalCode.length === 16));
}

function safeDownloadName(value) {
  return String(value || "busta-paga.pdf")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120) || "busta-paga.pdf";
}

async function pdfPageTexts(buffer) {
  if (!pdfJsPromise) pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjs = await pdfJsPromise;
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true
  }).promise;
  try {
    const texts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      texts.push(content.items.map((item) => item.str || "").join(" "));
    }
    return texts;
  } finally {
    await document.destroy();
  }
}

function fiscalCodesInText(text) {
  return [...new Set(String(text || "").toUpperCase().match(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g) || [])];
}

function payrollMonthInText(text) {
  const months = {
    gennaio: "01",
    febbraio: "02",
    marzo: "03",
    aprile: "04",
    maggio: "05",
    giugno: "06",
    luglio: "07",
    agosto: "08",
    settembre: "09",
    ottobre: "10",
    novembre: "11",
    dicembre: "12"
  };
  const match = String(text || "").toLowerCase().match(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})\b/);
  return match ? `${match[2]}-${months[match[1]]}` : "";
}

async function splitPayrollPdf(state, buffer, fileName) {
  if (!PDFDocument) throw new Error("Modulo PDF non configurato: manca pdf-lib.");
  const employeeByFiscalCode = payrollEmployeeMap(state);
  if (!employeeByFiscalCode.size) throw new Error("Nessun dipendente ha un codice fiscale configurato.");
  const source = await PDFDocument.load(buffer);
  const pageTexts = await pdfPageTexts(buffer);
  const fileFiscalCodes = fiscalCodesInText(fileName);
  const fileEmployee = fileFiscalCodes.map((code) => employeeByFiscalCode.get(code)).find(Boolean) || null;
  const groups = new Map();
  const unmatchedPages = [];
  let previousEmployee = fileEmployee;

  pageTexts.forEach((text, index) => {
    const employee = fiscalCodesInText(text).map((code) => employeeByFiscalCode.get(code)).find(Boolean)
      || fileEmployee
      || previousEmployee;
    if (!employee) {
      unmatchedPages.push(index + 1);
      return;
    }
    previousEmployee = employee;
    const pages = groups.get(employee.id) || [];
    pages.push(index);
    groups.set(employee.id, pages);
  });

  const documents = [];
  fs.mkdirSync(payrollDir, { recursive: true });
  for (const [employeeId, pageIndexes] of groups.entries()) {
    const employee = (state.employees || []).find((item) => item.id === employeeId);
    if (!employee) continue;
    const output = await PDFDocument.create();
    const copiedPages = await output.copyPages(source, pageIndexes);
    copiedPages.forEach((page) => output.addPage(page));
    const bytes = await output.save();
    const id = crypto.randomUUID();
    const storedFile = `${id}.pdf`;
    fs.writeFileSync(path.join(payrollDir, storedFile), Buffer.from(bytes));
    documents.push({
      id,
      employeeId,
      employeeName: employee.name,
      fiscalCode: payrollFiscalCode(employee.fiscalCode),
      file: storedFile,
      originalName: safeDownloadName(fileName),
      pageCount: pageIndexes.length,
      uploadedAt: new Date().toISOString()
    });
  }
  return {
    documents,
    unmatchedPages,
    pageCount: source.getPageCount(),
    detectedMonth: pageTexts.map(payrollMonthInText).find(Boolean) || ""
  };
}

function employeeDocumentFileType(fileName, mimeType, buffer) {
  const extension = path.extname(String(fileName || "")).toLowerCase();
  const declared = String(mimeType || "").toLowerCase();
  const isPdf = extension === ".pdf"
    && declared === "application/pdf"
    && buffer.subarray(0, 4).toString() === "%PDF";
  const isJpeg = [".jpg", ".jpeg"].includes(extension)
    && ["image/jpeg", "image/jpg"].includes(declared)
    && buffer[0] === 0xff
    && buffer[1] === 0xd8;
  const isPng = extension === ".png"
    && declared === "image/png"
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (isPdf) return { extension: ".pdf", mimeType: "application/pdf" };
  if (isJpeg) return { extension: ".jpg", mimeType: "image/jpeg" };
  if (isPng) return { extension: ".png", mimeType: "image/png" };
  return null;
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));
  const relativePath = path.relative(root, filePath);

  if (
    !filePath.startsWith(root) ||
    relativePath === "restaurant-data.json" ||
    relativePath === "launch-leads.json" ||
    relativePath === "seed-data.json" ||
    relativePath === "server.js" ||
    relativePath === "package.json" ||
    relativePath.endsWith(".md") ||
    relativePath.startsWith("anteprima-turni") ||
    relativePath.startsWith(`backups${path.sep}`) ||
    relativePath.startsWith(`payroll-documents${path.sep}`) ||
    relativePath.startsWith(`employee-documents${path.sep}`) ||
    relativePath.startsWith(`clients${path.sep}`) ||
    relativePath.startsWith(`plans${path.sep}`) ||
    relativePath === "license.js" ||
    relativePath.startsWith(`tests${path.sep}`) ||
    relativePath.startsWith(`versions${path.sep}`) ||
    relativePath.startsWith(`.${path.sep}`) ||
    relativePath.startsWith(".")
  ) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(contents);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/health" && req.method === "GET") {
      ensureDataStorage();
      sendJson(res, 200, {
        ok: true,
        storage: fs.existsSync(dbPath) ? "ready" : "empty"
      });
      return;
    }

    if (url.pathname === "/api/capabilities" && req.method === "GET") {
      sendJson(res, 200, { capabilities: licenseContext }, { "Cache-Control": "no-store" });
      return;
    }

    const licensePublicPaths = new Set([
      "/api/session",
      "/api/login",
      "/api/logout",
      "/api/login/employees",
      "/api/leads",
      "/api/leads.csv"
    ]);
    if (url.pathname.startsWith("/api/") && licenseContext.accessMode === "blocked" && !licensePublicPaths.has(url.pathname)) {
      sendJson(res, 423, {
        code: "LICENSE_BLOCKED",
        error: "Licenza sospesa. Contatta l'assistenza per riattivare l'account."
      });
      return;
    }
    const requiredFeature = featureForApiRequest(url.pathname);
    if (requiredFeature && !hasFeature(licenseContext, requiredFeature)) {
      sendJson(res, 403, {
        code: "FEATURE_NOT_AVAILABLE",
        requiredFeature,
        plan: licenseContext.planCode,
        nextPlan: licenseContext.nextPlan,
        error: `Funzione non inclusa nel piano ${licenseContext.planName}.`
      });
      return;
    }
    if (isProtectedMutation(url.pathname, req.method) && !licenseContext.canWrite) {
      sendJson(res, 423, {
        code: "LICENSE_READ_ONLY",
        error: "Account in sola lettura. Regolarizza la licenza per salvare modifiche."
      });
      return;
    }

    if (url.pathname === "/api/session" && req.method === "GET") {
      const user = currentUser(req);
      sendJson(res, 200, { authenticated: Boolean(user), user });
      return;
    }

    if (url.pathname === "/api/leads" && req.method === "POST") {
      const body = await readBody(req);
      if (cleanLeadText(body.website, 80)) {
        sendJson(res, 200, { ok: true });
        return;
      }

      const lead = {
        id: `lead${Date.now()}-${crypto.randomBytes(5).toString("hex")}`,
        restaurantName: cleanLeadText(body.restaurantName, 120),
        city: cleanLeadText(body.city, 80),
        staffSize: cleanLeadText(body.staffSize, 30),
        contactName: cleanLeadText(body.contactName, 120),
        contactMethod: cleanLeadText(body.contactMethod, 180),
        currentTool: cleanLeadText(body.currentTool, 120),
        message: cleanLeadText(body.message, 600),
        source: cleanLeadText(body.source, 80) || "landing",
        createdAt: new Date().toISOString(),
        userAgent: cleanLeadText(req.headers["user-agent"], 220),
        ipHint: cleanLeadText(req.headers["x-forwarded-for"] || req.socket.remoteAddress, 120)
      };

      if (!lead.restaurantName || !lead.city || !lead.contactMethod) {
        sendJson(res, 400, { error: "Inserisci locale, citta e contatto." });
        return;
      }

      writeLead(lead);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/leads" && req.method === "GET") {
      const user = managerOnly(req, res);
      if (!user) return;
      sendJson(res, 200, { leads: readLeads() });
      return;
    }

    if (url.pathname === "/api/leads.csv" && req.method === "GET") {
      const user = managerOnly(req, res);
      if (!user) return;
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"contatti-lancio.csv\""
      });
      res.end(leadsCsv(readLeads()));
      return;
    }

    if (url.pathname === "/api/login/employees" && req.method === "GET") {
      const state = readState();
      sendJson(res, 200, {
        employees: activeEmployees(state).map(sanitizeEmployeeForLogin)
      });
      return;
    }

    if (url.pathname === "/api/totem/token" && req.method === "GET") {
      const state = readState();
      sendJson(res, 200, {
        ...activeTotemToken(req),
        companyName: state?.companySettings?.companyName || "Bar Flora srl"
      }, {
        "Cache-Control": "no-store"
      });
      return;
    }

    if (url.pathname === "/api/login" && req.method === "POST") {
      const body = await readBody(req);
      if (body.role === "supervisor" && !hasFeature(licenseContext, "supervisor")) {
        sendJson(res, 403, { error: `Accesso capoturno non incluso nel piano ${licenseContext.planName}.` });
        return;
      }
      const isManager = body.role === "manager" && verifyManagerPassword(body.password);
      const state = readState();
      const employee = activeEmployees(state).find((item) => item.id === body.employeeId);
      const isEmployee = body.role === "employee" && employee && verifyCredential(body.password, employee.pinHash);
      const isSupervisor = body.role === "supervisor" && employee?.supervisor && verifyCredential(body.password, employee.pinHash);

      if (!isManager && !isEmployee && !isSupervisor) {
        sendJson(res, 401, { error: "Credenziali non valide" });
        return;
      }

      const sid = crypto.randomBytes(18).toString("hex");
      const user = isManager
        ? { role: "manager" }
        : { role: isSupervisor ? "supervisor" : "employee", employeeId: body.employeeId };
      sessions.set(sid, { ...user, createdAt: Date.now() });

      sendJson(res, 200, { authenticated: true, user }, {
        "Set-Cookie": sessionCookie(req, sid)
      });
      return;
    }

    if (url.pathname === "/api/logout" && req.method === "POST") {
      const sid = parseCookies(req).sid;
      if (sid) sessions.delete(sid);
      sendJson(res, 200, { ok: true }, {
        "Set-Cookie": sessionCookie(req, "", 0)
      });
      return;
    }

    if (url.pathname === "/api/state" && req.method === "GET") {
      const user = currentUser(req);
      if (!user) {
        sendJson(res, 401, { error: "Non autenticato" });
        return;
      }
      const state = readState();
      sendJson(res, 200, {
        state: stateForUser(state, user)
      });
      return;
    }

    if (url.pathname === "/api/state" && req.method === "POST") {
      const user = currentUser(req);
      if (!user || user.role !== "manager") {
        sendJson(res, 403, { error: "Solo il manager puo salvare lo stato completo" });
        return;
      }
      const body = await readBody(req);
      const result = await mutateState((state) => {
        const mergedState = mergeSensitiveEmployeeFields(body.state || {}, state);
        Object.keys(state).forEach((key) => delete state[key]);
        Object.assign(state, mergedState);
        return {};
      });
      sendJson(res, 200, { ok: true, state: stateForUser(result.state, user) });
      return;
    }

    const tipsMatch = url.pathname.match(/^\/api\/tips\/(\d{4}-\d{2})$/);
    if (tipsMatch && req.method === "GET") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      sendJson(res, 200, {
        month: tipsMatch[1],
        tips: state.tipMonths?.[tipsMatch[1]] || null
      });
      return;
    }

    if (tipsMatch && req.method === "PUT") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const cashTotal = Number(body.cashTotal);
      const posTotal = Number(body.posTotal);
      const hourOverrides = body.hourOverrides && typeof body.hourOverrides === "object"
        ? Object.fromEntries(Object.entries(body.hourOverrides)
          .map(([employeeId, hours]) => [employeeId, Number(hours)])
          .filter(([employeeId, hours]) => employeeId && Number.isFinite(hours) && hours >= 0))
        : {};
      if (!Number.isFinite(cashTotal) || cashTotal < 0 || !Number.isFinite(posTotal) || posTotal < 0) {
        sendJson(res, 400, { error: "Inserisci importi validi per contanti e POS." });
        return;
      }
      const result = await mutateState((state) => {
        state.tipMonths = state.tipMonths && typeof state.tipMonths === "object" ? state.tipMonths : {};
        state.tipMonths[tipsMatch[1]] = {
          cashTotal,
          posTotal,
          hourOverrides,
          updatedAt: new Date().toISOString()
        };
        addActivity(state, {
          type: "Mance",
          title: `Prospetto mance ${tipsMatch[1]} salvato`,
          detail: `Contanti ${cashTotal.toFixed(2)} - POS ${posTotal.toFixed(2)}`
        });
        return { tips: state.tipMonths[tipsMatch[1]] };
      });
      sendJson(res, 200, { ok: true, month: tipsMatch[1], tips: result.tips });
      return;
    }

    if (url.pathname === "/api/payroll" && req.method === "GET") {
      const user = currentUser(req);
      if (!user || (user.role !== "manager" && user.role !== "employee")) {
        sendJson(res, 403, { error: "Accesso alle buste paga non autorizzato." });
        return;
      }
      const state = readState();
      const documents = user.role === "manager"
        ? state.payrollDocuments || []
        : (state.payrollDocuments || []).filter((document) => document.employeeId === user.employeeId);
      sendJson(res, 200, {
        documents: documents
          .map(({ file, fiscalCode, ...document }) => document)
          .sort((a, b) => String(b.month).localeCompare(String(a.month)) || new Date(b.uploadedAt) - new Date(a.uploadedAt))
      }, { "Cache-Control": "no-store" });
      return;
    }

    if (url.pathname === "/api/payroll/upload" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const month = String(body.month || "");
      if (!/^\d{4}-\d{2}$/.test(month)) {
        sendJson(res, 400, { error: "Seleziona il mese della busta paga." });
        return;
      }
      const encoded = String(body.fileBase64 || "").replace(/^data:application\/pdf;base64,/, "");
      const buffer = Buffer.from(encoded, "base64");
      if (!buffer.length || !String(body.fileName || "").toLowerCase().endsWith(".pdf")) {
        sendJson(res, 400, { error: "Carica un file PDF valido." });
        return;
      }
      if (buffer.length > maxPayrollPdfBytes) {
        sendJson(res, 413, { error: "PDF troppo grande: massimo 15 MB per file." });
        return;
      }
      const state = readState();
      const split = await splitPayrollPdf(state, buffer, body.fileName);
      const resolvedMonth = split.detectedMonth || month;
      if (!split.documents.length) {
        sendJson(res, 422, {
          error: "Nessun codice fiscale del PDF corrisponde ai dipendenti configurati.",
          unmatchedPages: split.unmatchedPages
        });
        return;
      }
      const result = await mutateState((nextState) => {
        nextState.payrollDocuments = Array.isArray(nextState.payrollDocuments) ? nextState.payrollDocuments : [];
        const replaced = [];
        split.documents.forEach((document) => {
          const previousDocuments = nextState.payrollDocuments.filter((item) => (
            item.employeeId === document.employeeId
            && (item.month === resolvedMonth || item.originalName === document.originalName)
          ));
          replaced.push(...previousDocuments);
          nextState.payrollDocuments = nextState.payrollDocuments.filter((item) => !previousDocuments.some((previous) => previous.id === item.id));
          nextState.payrollDocuments.push({ ...document, month: resolvedMonth });
        });
        addActivity(nextState, {
          type: "Buste paga",
          title: `Caricate ${split.documents.length} buste paga`,
          detail: `${resolvedMonth} - ${safeDownloadName(body.fileName)}`
        });
        return {
          documents: split.documents.map((document) => ({ ...document, month: resolvedMonth })),
          replaced
        };
      });
      result.replaced.forEach((document) => {
        const previousPath = path.join(payrollDir, path.basename(document.file || ""));
        if (document.file && fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
      });
      sendJson(res, 200, {
        ok: true,
        documents: result.documents.map(({ file, fiscalCode, ...document }) => document),
        replaced: result.replaced.length,
        unmatchedPages: split.unmatchedPages,
        pageCount: split.pageCount,
        detectedMonth: split.detectedMonth
      });
      return;
    }

    const payrollFileMatch = url.pathname.match(/^\/api\/payroll\/([^/]+)\/file$/);
    if (payrollFileMatch && req.method === "GET") {
      const user = currentUser(req);
      if (!user) {
        sendJson(res, 401, { error: "Non autenticato" });
        return;
      }
      const state = readState();
      const document = (state.payrollDocuments || []).find((item) => item.id === payrollFileMatch[1]);
      if (!document || (user.role !== "manager" && (user.role !== "employee" || document.employeeId !== user.employeeId))) {
        sendJson(res, 404, { error: "Busta paga non trovata." });
        return;
      }
      const filePath = path.join(payrollDir, path.basename(document.file || ""));
      if (!document.file || !fs.existsSync(filePath)) {
        sendJson(res, 404, { error: "File della busta paga non disponibile." });
        return;
      }
      const employee = (state.employees || []).find((item) => item.id === document.employeeId);
      const downloadName = safeDownloadName(`busta-paga-${document.month}-${employee?.name || "dipendente"}.pdf`);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Length": fs.statSync(filePath).size,
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const payrollDeleteMatch = url.pathname.match(/^\/api\/payroll\/([^/]+)$/);
    if (payrollDeleteMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const result = await mutateState((state) => {
        const document = (state.payrollDocuments || []).find((item) => item.id === payrollDeleteMatch[1]);
        if (!document) return { skipWrite: true, statusCode: 404, response: { error: "Busta paga non trovata." } };
        state.payrollDocuments = state.payrollDocuments.filter((item) => item.id !== document.id);
        addActivity(state, {
          type: "Buste paga",
          title: "Busta paga eliminata",
          detail: `${document.employeeName || "Dipendente"} - ${document.month || ""}`
        });
        return { deletedFile: document.file || "" };
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      const deletedPath = path.join(payrollDir, path.basename(result.deletedFile || ""));
      if (result.deletedFile && fs.existsSync(deletedPath)) fs.unlinkSync(deletedPath);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/employee-documents" && req.method === "GET") {
      const user = currentUser(req);
      if (!user || (user.role !== "manager" && user.role !== "employee")) {
        sendJson(res, 403, { error: "Accesso ai documenti non autorizzato." });
        return;
      }
      const state = readState();
      const documents = user.role === "manager"
        ? state.employeeDocuments || []
        : (state.employeeDocuments || []).filter((document) => document.employeeId === user.employeeId);
      sendJson(res, 200, {
        documents: documents
          .map(sanitizeEmployeeDocument)
          .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      }, { "Cache-Control": "no-store" });
      return;
    }

    if (url.pathname === "/api/employee-documents/upload" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const employee = (state.employees || []).find((item) => item.id === body.employeeId);
      const category = String(body.category || "").trim();
      const title = String(body.title || "").trim();
      const issueDate = String(body.issueDate || "");
      const expiryDate = String(body.expiryDate || "");
      if (!employee || !category || !title) {
        sendJson(res, 400, { error: "Seleziona il dipendente e inserisci categoria e titolo." });
        return;
      }
      if ((issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) || (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate))) {
        sendJson(res, 400, { error: "Controlla le date del documento." });
        return;
      }
      const encoded = String(body.fileBase64 || "").replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(encoded, "base64");
      if (!buffer.length || buffer.length > maxEmployeeDocumentBytes) {
        sendJson(res, buffer.length ? 413 : 400, {
          error: buffer.length ? "Documento troppo grande: massimo 10 MB." : "Carica un documento valido."
        });
        return;
      }
      const fileType = employeeDocumentFileType(body.fileName, body.mimeType, buffer);
      if (!fileType) {
        sendJson(res, 400, { error: "Formato non valido. Usa PDF, JPG o PNG." });
        return;
      }
      fs.mkdirSync(employeeDocumentsDir, { recursive: true });
      const id = crypto.randomUUID();
      const storedFile = `${id}${fileType.extension}`;
      fs.writeFileSync(path.join(employeeDocumentsDir, storedFile), buffer);
      const document = {
        id,
        employeeId: employee.id,
        employeeName: employee.name,
        category,
        title,
        issueDate,
        expiryDate,
        originalName: safeDownloadName(body.fileName || `documento${fileType.extension}`),
        mimeType: fileType.mimeType,
        file: storedFile,
        uploadedAt: new Date().toISOString()
      };
      await mutateState((nextState) => {
        nextState.employeeDocuments = Array.isArray(nextState.employeeDocuments) ? nextState.employeeDocuments : [];
        nextState.employeeDocuments.push(document);
        addActivity(nextState, {
          type: "Documenti",
          title: "Documento dipendente caricato",
          detail: `${employee.name} - ${title}`
        });
        return {};
      });
      sendJson(res, 200, { ok: true, document: sanitizeEmployeeDocument(document) });
      return;
    }

    const employeeDocumentFileMatch = url.pathname.match(/^\/api\/employee-documents\/([^/]+)\/file$/);
    if (employeeDocumentFileMatch && req.method === "GET") {
      const user = currentUser(req);
      if (!user) {
        sendJson(res, 401, { error: "Non autenticato" });
        return;
      }
      const state = readState();
      const document = (state.employeeDocuments || []).find((item) => item.id === employeeDocumentFileMatch[1]);
      if (!document || (user.role !== "manager" && (user.role !== "employee" || document.employeeId !== user.employeeId))) {
        sendJson(res, 404, { error: "Documento non trovato." });
        return;
      }
      const filePath = path.join(employeeDocumentsDir, path.basename(document.file || ""));
      if (!document.file || !fs.existsSync(filePath)) {
        sendJson(res, 404, { error: "File non disponibile." });
        return;
      }
      const downloadName = safeDownloadName(`${document.title}-${document.employeeName}${path.extname(document.file)}`);
      res.writeHead(200, {
        "Content-Type": document.mimeType || mimeTypes[path.extname(document.file)] || "application/octet-stream",
        "Content-Length": fs.statSync(filePath).size,
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const employeeDocumentDeleteMatch = url.pathname.match(/^\/api\/employee-documents\/([^/]+)$/);
    if (employeeDocumentDeleteMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const result = await mutateState((state) => {
        const document = (state.employeeDocuments || []).find((item) => item.id === employeeDocumentDeleteMatch[1]);
        if (!document) return { skipWrite: true, statusCode: 404, response: { error: "Documento non trovato." } };
        state.employeeDocuments = state.employeeDocuments.filter((item) => item.id !== document.id);
        addActivity(state, {
          type: "Documenti",
          title: "Documento dipendente eliminato",
          detail: `${document.employeeName || "Dipendente"} - ${document.title || ""}`
        });
        return { deletedFile: document.file || "" };
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      const deletedPath = path.join(employeeDocumentsDir, path.basename(result.deletedFile || ""));
      if (result.deletedFile && fs.existsSync(deletedPath)) fs.unlinkSync(deletedPath);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/external/schedule" && req.method === "GET") {
      if (!externalOnly(req, res)) return;
      const state = readState();
      sendJson(res, 200, externalScheduleState(state));
      return;
    }

    if (url.pathname === "/api/external/login" && req.method === "POST") {
      if (!externalOnly(req, res)) return;
      const body = await readBody(req);
      const state = readState();
      const employee = activeEmployees(state).find((item) => item.id === body.employeeId);
      const isEmployee = body.role === "employee" && employee && verifyCredential(body.password, employee.pinHash);
      const isSupervisor = body.role === "supervisor" && employee?.supervisor && verifyCredential(body.password, employee.pinHash);
      if (!isEmployee && !isSupervisor) {
        sendJson(res, 401, { error: "Credenziali non valide" });
        return;
      }
      sendJson(res, 200, {
        authenticated: true,
        user: { role: isSupervisor ? "supervisor" : "employee", employeeId: employee.id },
        employee: sanitizeEmployeeForLogin(employee)
      });
      return;
    }

    if (url.pathname === "/api/push-public-key" && req.method === "GET") {
      const user = currentUser(req);
      if (!user || user.role !== "employee") {
        sendJson(res, 403, { error: "Solo i dipendenti possono attivare i promemoria" });
        return;
      }
      sendJson(res, 200, {
        enabled: Boolean(webPush && vapidPublicKey && vapidPrivateKey),
        publicKey: vapidPublicKey
      });
      return;
    }

    if (url.pathname === "/api/push-subscriptions" && req.method === "POST") {
      const user = currentUser(req);
      if (!user || user.role !== "employee") {
        sendJson(res, 403, { error: "Solo i dipendenti possono attivare i promemoria" });
        return;
      }
      const body = await readBody(req);
      if (!body.subscription?.endpoint) {
        sendJson(res, 400, { error: "Iscrizione push non valida" });
        return;
      }
      const state = readState();
      state.pushSubscriptions = Array.isArray(state.pushSubscriptions) ? state.pushSubscriptions : [];
      state.pushSubscriptions = state.pushSubscriptions.filter((item) => item.endpoint !== body.subscription.endpoint);
      state.pushSubscriptions.push({
        id: `ps${Date.now()}-${crypto.randomBytes(5).toString("hex")}`,
        employeeId: user.employeeId,
        endpoint: body.subscription.endpoint,
        subscription: body.subscription,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 220),
        createdAt: new Date().toISOString()
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    const publicationMatch = url.pathname.match(/^\/api\/weeks\/(-?\d+)\/publication$/);
    if (publicationMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const offset = String(Number(publicationMatch[1]) || 0);
      state.publishedWeeks = state.publishedWeeks || {};
      state.publishedWeeks[offset] = Boolean(body.published);
      const createdTasks = body.published ? generateTaskAssignmentsForPublication(state, offset) : 0;
      addActivity(state, {
        type: "Pubblicazione",
        title: body.published ? "Settimana pubblicata" : "Settimana nascosta",
        detail: `Periodo settimana ${offset}${createdTasks ? ` · ${createdTasks} mansioni create` : ""}`,
        weekOffset: offset
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    const dayPublicationMatch = url.pathname.match(/^\/api\/weeks\/(-?\d+)\/days\/([a-z]+)\/publication$/);
    if (dayPublicationMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const offset = String(Number(dayPublicationMatch[1]) || 0);
      const day = dayPublicationMatch[2];
      const validDays = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
      if (!validDays.has(day)) {
        sendJson(res, 400, { error: "Giorno non valido" });
        return;
      }
      state.publishedDays = state.publishedDays || {};
      state.publishedDays[offset] = state.publishedDays[offset] || {};
      state.publishedDays[offset][day] = Boolean(body.published);
      const createdTasks = body.published ? generateTaskAssignmentsForPublication(state, offset, day) : 0;
      addActivity(state, {
        type: "Pubblicazione",
        title: body.published ? "Giorno pubblicato" : "Giorno nascosto",
        detail: `${dayLabel(day)} · settimana ${offset}${createdTasks ? ` · ${createdTasks} mansioni create` : ""}`,
        weekOffset: offset
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/time-off-requests" && req.method === "POST") {
      const user = currentUser(req);
      if (!user || user.role !== "employee") {
        sendJson(res, 403, { error: "Solo un dipendente puo inviare una richiesta" });
        return;
      }

      const body = await readBody(req);
      const state = readState();
      if (!state) {
        sendJson(res, 500, { error: "Stato app non disponibile" });
        return;
      }

      const isHalfDay = body.type === "Mezza giornata";
      const day = dayKeys.includes(body.day) ? body.day : "mon";
      const endDay = isHalfDay ? day : dayKeys.includes(body.endDay) ? body.endDay : day;
      if (!isHalfDay && dayKeys.indexOf(endDay) < dayKeys.indexOf(day)) {
        sendJson(res, 400, { error: "Il giorno finale deve essere uguale o successivo al giorno iniziale" });
        return;
      }

      const request = {
        id: `r${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
        employeeId: user.employeeId,
        weekOffset: Number(body.weekOffset) || 0,
        day,
        endDay,
        type: body.type,
        startTime: body.startTime || "",
        endTime: body.endTime || "",
        note: body.note || "",
        status: "pending",
        createdAt: new Date().toISOString()
      };

      state.timeOffRequests = Array.isArray(state.timeOffRequests) ? state.timeOffRequests : [];
      state.timeOffRequests.push(request);
      writeState(state);
      sendJson(res, 200, { ok: true, request, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/attendance/punch" && req.method === "POST") {
      const user = currentUser(req);
      if (!user || user.role !== "employee") {
        sendJson(res, 403, { error: "Accedi come dipendente per timbrare" });
        return;
      }

      const body = await readBody(req);
      if (!verifyTotemToken(body.token)) {
        sendJson(res, 400, { error: "QR scaduto. Scansiona il codice aggiornato." });
        return;
      }

      const result = await mutateState((state) => {
        const latest = latestAttendanceForEmployee(state, user.employeeId);
        const type = latest?.type === "in" ? "out" : "in";
        const record = {
          id: `a${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
          employeeId: user.employeeId,
          type,
          timestamp: new Date().toISOString()
        };
        state.attendanceRecords = Array.isArray(state.attendanceRecords) ? state.attendanceRecords : [];
        state.attendanceRecords.push(record);
        addActivity(state, {
          type: "Presenze",
          title: type === "in" ? "Entrata registrata" : "Uscita registrata",
          detail: employeeName(state, user.employeeId)
        });
        return { record, type };
      });
      sendJson(res, 200, {
        ok: true,
        record: result.record,
        status: result.type === "in" ? "Entrata registrata" : "Uscita registrata",
        state: stateForUser(result.state, user)
      });
      return;
    }

    if (url.pathname === "/api/me/attendance" && req.method === "GET") {
      const user = currentUser(req);
      if (!user || user.role !== "employee") {
        sendJson(res, 403, { error: "Solo un dipendente puo vedere le proprie timbrature" });
        return;
      }
      const state = readState();
      sendJson(res, 200, {
        records: (state.attendanceRecords || []).filter((record) => record.employeeId === user.employeeId)
      });
      return;
    }

    if (url.pathname === "/api/attendance" && req.method === "GET") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      sendJson(res, 200, {
        records: attendanceWithEmployees(state),
        manualRequests: manualAttendanceRequestsWithEmployees(state),
        noWorkDays: attendanceNoWorkDaysWithEmployees(state),
        revenue: state.attendanceRevenue || {}
      });
      return;
    }

    if (url.pathname === "/api/attendance/revenue" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const date = String(body.date || "");
      const amount = Number(String(body.amount || "0").replace(",", "."));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(amount) || amount < 0) {
        sendJson(res, 400, { error: "Data o fatturato non validi" });
        return;
      }
      const result = await mutateState((state) => {
        const defaultWorkplace = state.companySettings?.workplaces?.[0] || state.companySettings?.companyName || "Bar Flora srl";
        const defaultScopeKey = `workplace:${defaultWorkplace}`;
        const scopeKey = String(body.scopeKey || defaultScopeKey).trim().slice(0, 120) || defaultScopeKey;
        const scopeLabel = String(body.scopeLabel || scopeKey.replace(/^(group|workplace):/, "")).trim().slice(0, 120) || defaultWorkplace;
        const workplaces = Array.isArray(body.workplaces)
          ? [...new Set(body.workplaces.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 30)
          : [defaultWorkplace];
        state.attendanceRevenue = state.attendanceRevenue && typeof state.attendanceRevenue === "object" ? state.attendanceRevenue : {};
        const existingDay = state.attendanceRevenue[date];
        let day = existingDay?.scopes ? existingDay : { scopes: {} };
        if (existingDay && !existingDay.scopes && Number(existingDay.amount || 0)) {
          day.scopes[defaultScopeKey] = {
            amount: Number(existingDay.amount || 0),
            note: String(existingDay.note || "").trim(),
            scopeKey: defaultScopeKey,
            scopeLabel: defaultWorkplace,
            workplaces: [defaultWorkplace],
            updatedAt: existingDay.updatedAt || new Date().toISOString(),
            updatedBy: existingDay.updatedBy || "manager"
          };
        }
        if (amount === 0) {
          delete day.scopes[scopeKey];
          if (Object.keys(day.scopes).length) state.attendanceRevenue[date] = day;
          else delete state.attendanceRevenue[date];
        } else {
          day.scopes[scopeKey] = {
            amount: Math.round(amount * 100) / 100,
            note: String(body.note || "").trim(),
            scopeKey,
            scopeLabel,
            workplaces,
            updatedAt: new Date().toISOString(),
            updatedBy: user.role
          };
          state.attendanceRevenue[date] = day;
        }
        addActivity(state, {
          type: "Presenze",
          title: amount === 0 ? "Fatturato giornaliero rimosso" : "Fatturato giornaliero salvato",
          detail: `${new Date(`${date}T12:00:00`).toLocaleDateString("it-IT")} · ${scopeLabel} · ${amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`
        });
        return {};
      });
      sendJson(res, 200, {
        ok: true,
        state: stateForUser(result.state, user),
        records: attendanceWithEmployees(result.state),
        manualRequests: manualAttendanceRequestsWithEmployees(result.state),
        noWorkDays: attendanceNoWorkDaysWithEmployees(result.state),
        revenue: result.state.attendanceRevenue || {}
      });
      return;
    }

    if (url.pathname === "/api/attendance/no-work" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      if (!body.employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date || ""))) {
        sendJson(res, 400, { error: "Dipendente o data non validi" });
        return;
      }
      const result = await mutateState((state) => {
        const employee = (state.employees || []).find((item) => item.id === body.employeeId);
        if (!employee) return { skipWrite: true, statusCode: 404, response: { error: "Dipendente non trovato" } };
        state.attendanceNoWorkDays = Array.isArray(state.attendanceNoWorkDays) ? state.attendanceNoWorkDays : [];
        let day = state.attendanceNoWorkDays.find((item) => item.employeeId === employee.id && item.date === body.date);
        if (!day) {
          day = {
            id: `nw${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
            employeeId: employee.id,
            date: body.date,
            createdAt: new Date().toISOString(),
            createdBy: user.role
          };
          state.attendanceNoWorkDays.push(day);
        }
        day.reason = ["malattia", "assenza", "permesso", "non_lavorato", "altro"].includes(body.reason) ? body.reason : "non_lavorato";
        day.note = String(body.note || "").trim();
        day.updatedAt = new Date().toISOString();
        addActivity(state, {
          type: "Presenze",
          title: "Assenza segnata",
          detail: `${employee.name} · ${new Date(`${body.date}T12:00:00`).toLocaleDateString("it-IT")}${day.note ? ` · ${day.note}` : ""}`
        });
        return { day };
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, {
        ok: true,
        state: stateForUser(result.state, user),
        records: attendanceWithEmployees(result.state),
        manualRequests: manualAttendanceRequestsWithEmployees(result.state),
        noWorkDays: attendanceNoWorkDaysWithEmployees(result.state),
        revenue: result.state.attendanceRevenue || {}
      });
      return;
    }

    const attendanceNoWorkMatch = url.pathname.match(/^\/api\/attendance\/no-work\/([^/]+)$/);
    if (attendanceNoWorkMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const result = await mutateState((state) => {
        const day = (state.attendanceNoWorkDays || []).find((item) => item.id === attendanceNoWorkMatch[1]);
        if (!day) return { skipWrite: true, statusCode: 404, response: { error: "Segnalazione non trovata" } };
        const employee = (state.employees || []).find((item) => item.id === day.employeeId);
        state.attendanceNoWorkDays = (state.attendanceNoWorkDays || []).filter((item) => item.id !== day.id);
        addActivity(state, {
          type: "Presenze",
          title: "Giornata non lavorata ripristinata",
          detail: `${employee?.name || "Dipendente"} · ${new Date(`${day.date}T12:00:00`).toLocaleDateString("it-IT")}`
        });
        return {};
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, {
        ok: true,
        state: stateForUser(result.state, user),
        records: attendanceWithEmployees(result.state),
        manualRequests: manualAttendanceRequestsWithEmployees(result.state),
        noWorkDays: attendanceNoWorkDaysWithEmployees(result.state),
        revenue: result.state.attendanceRevenue || {}
      });
      return;
    }

    if (url.pathname === "/api/attendance/import" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      let parsed;
      try {
        parsed = parseAttendanceImportRows(state, body);
      } catch (error) {
        sendJson(res, 400, { error: error.message || "File non leggibile" });
        return;
      }
      if (body.dryRun) {
        sendJson(res, 200, { ok: true, rows: parsed.rows, errors: parsed.errors });
        return;
      }
      if (!parsed.rows.length) {
        sendJson(res, 400, { error: parsed.errors[0] || "Nessuna riga valida da importare", rows: [], errors: parsed.errors });
        return;
      }
      const result = await mutateState((nextState) => {
        nextState.attendanceRecords = Array.isArray(nextState.attendanceRecords) ? nextState.attendanceRecords : [];
        const existing = new Set(nextState.attendanceRecords.map((record) => `${record.employeeId}:${record.type}:${record.timestamp}`));
        const created = [];
        parsed.rows.forEach((row) => {
          [
            { type: "in", timestamp: row.startTimestamp },
            { type: "out", timestamp: row.endTimestamp }
          ].forEach((record) => {
            const key = `${row.employeeId}:${record.type}:${record.timestamp}`;
            if (existing.has(key)) return;
            existing.add(key);
            const importedRecord = {
              id: `a${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
              employeeId: row.employeeId,
              type: record.type,
              timestamp: record.timestamp,
              manual: true,
              imported: true,
              note: row.note || "Import presenze"
            };
            nextState.attendanceRecords.push(importedRecord);
            created.push(importedRecord);
          });
        });
        addActivity(nextState, {
          type: "Presenze",
          title: "Presenze importate",
          detail: `${parsed.rows.length} righe elaborate · ${created.length} timbrature create`
        });
        return { created };
      });
      sendJson(res, 200, {
        ok: true,
        importedRows: parsed.rows.length,
        createdRecords: result.created.length,
        skippedRecords: parsed.rows.length * 2 - result.created.length,
        rows: parsed.rows,
        errors: parsed.errors,
        state: stateForUser(result.state, user),
        records: attendanceWithEmployees(result.state)
      });
      return;
    }

    if (url.pathname === "/api/attendance/manual-request" && req.method === "POST") {
      const body = await readBody(req);
      const startDate = parseLocalDateTime(body.date, body.startTime);
      const endDate = parseLocalDateTime(body.date, body.endTime);
      if (!startDate || !endDate) {
        sendJson(res, 400, { error: "Inserisci data, ora inizio e ora fine valide" });
        return;
      }
      if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
      const result = await mutateState((state) => {
        const employee = activeEmployees(state).find((item) => item.id === body.employeeId);
        if (!employee || !verifyCredential(body.pin, employee.pinHash)) {
          return { skipWrite: true, statusCode: 401, response: { error: "Dipendente o PIN non valido" } };
        }
        const request = {
          id: `mr${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
          employeeId: employee.id,
          startTimestamp: startDate.toISOString(),
          endTimestamp: endDate.toISOString(),
          crossesMidnight: endDate.toDateString() !== startDate.toDateString(),
          note: String(body.note || "").trim(),
          status: "pending",
          emailSentAt: "",
          emailError: "",
          createdAt: new Date().toISOString()
        };
        state.manualAttendanceRequests = Array.isArray(state.manualAttendanceRequests) ? state.manualAttendanceRequests : [];
        state.manualAttendanceRequests.push(request);
        addActivity(state, {
          type: "Presenze",
          title: "Richiesta timbratura manuale",
          detail: `${employee.name} · ${startDate.toLocaleDateString("it-IT")}`
        });
        return { request };
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      let emailResult = { sent: false, reason: "Email non inviata" };
      try {
        emailResult = await sendManualAttendanceEmail(result.state, result.request);
      } catch (error) {
        emailResult = { sent: false, reason: error.message || "Email non inviata" };
      }
      await mutateState((state) => {
        const request = (state.manualAttendanceRequests || []).find((item) => item.id === result.request.id);
        if (!request) return { skipWrite: true };
        if (emailResult.sent) request.emailSentAt = new Date().toISOString();
        else request.emailError = emailResult.reason || "Email non configurata";
        return {};
      });
      sendJson(res, 200, { ok: true, request: result.request, emailSent: Boolean(emailResult.sent), emailMessage: emailResult.reason || "" });
      return;
    }

    const manualAttendanceMatch = url.pathname.match(/^\/api\/attendance\/manual-request\/([^/]+)$/);
    if (manualAttendanceMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const action = body.action;
      if (!["approve", "reject"].includes(action)) {
        sendJson(res, 400, { error: "Azione richiesta non valida" });
        return;
      }
      const result = await mutateState((state) => {
        const request = (state.manualAttendanceRequests || []).find((item) => item.id === manualAttendanceMatch[1]);
        if (!request) return { skipWrite: true, statusCode: 404, response: { error: "Richiesta non trovata" } };
        if (request.status !== "pending") return { skipWrite: true, statusCode: 400, response: { error: "Richiesta gia gestita" } };
        const employee = (state.employees || []).find((item) => item.id === request.employeeId);
        if (action === "approve") {
          const base = {
            employeeId: request.employeeId,
            manual: true,
            employeeSubmitted: true,
            manualRequestId: request.id,
            approvedAt: new Date().toISOString(),
            approvedBy: user.role
          };
          state.attendanceRecords = Array.isArray(state.attendanceRecords) ? state.attendanceRecords : [];
          state.attendanceRecords.push({
            id: `a${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
            ...base,
            type: "in",
            timestamp: request.startTimestamp,
            note: request.note || "Entrata richiesta dal dipendente"
          });
          state.attendanceRecords.push({
            id: `a${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
            ...base,
            type: "out",
            timestamp: request.endTimestamp,
            note: request.note || "Uscita richiesta dal dipendente"
          });
        }
        request.status = action === "approve" ? "approved" : "rejected";
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = "manager";
        request.rejectionNote = action === "reject" ? String(body.rejectionNote || "").trim() : "";
        addActivity(state, {
          type: "Presenze",
          title: action === "approve" ? "Timbratura manuale approvata" : "Timbratura manuale respinta",
          detail: `${employee?.name || "Dipendente"} · ${new Date(request.startTimestamp).toLocaleDateString("it-IT")}`
        });
        return {};
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, {
        ok: true,
        state: stateForUser(result.state, user),
        records: attendanceWithEmployees(result.state),
        manualRequests: manualAttendanceRequestsWithEmployees(result.state)
      });
      return;
    }

    if (url.pathname === "/api/attendance/manual" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      if (!["in", "out"].includes(body.type) || Number.isNaN(new Date(body.timestamp).getTime())) {
        sendJson(res, 400, { error: "Timbratura non valida" });
        return;
      }
      const result = await mutateState((state) => {
        const employee = (state.employees || []).find((item) => item.id === body.employeeId);
        if (!employee) return { skipWrite: true, statusCode: 404, response: { error: "Dipendente non trovato" } };
        const record = {
          id: `a${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
          employeeId: employee.id,
          type: body.type,
          timestamp: new Date(body.timestamp).toISOString(),
          manual: true,
          note: body.note || ""
        };
        state.attendanceRecords = Array.isArray(state.attendanceRecords) ? state.attendanceRecords : [];
        state.attendanceRecords.push(record);
        addActivity(state, {
          type: "Presenze",
          title: body.type === "in" ? "Entrata manuale aggiunta" : "Uscita manuale aggiunta",
          detail: `${employee.name}${body.note ? ` · ${body.note}` : ""}`
        });
        return { record };
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, { ok: true, record: result.record, state: stateForUser(result.state, user), records: attendanceWithEmployees(result.state) });
      return;
    }

    const attendanceMatch = url.pathname.match(/^\/api\/attendance\/([^/]+)$/);
    if (attendanceMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      if (!["in", "out"].includes(body.type) || Number.isNaN(new Date(body.timestamp).getTime())) {
        sendJson(res, 400, { error: "Timbratura non valida" });
        return;
      }
      const result = await mutateState((state) => {
        const record = (state.attendanceRecords || []).find((item) => item.id === attendanceMatch[1]);
        if (!record) return { skipWrite: true, statusCode: 404, response: { error: "Timbratura non trovata" } };
        const employee = (state.employees || []).find((item) => item.id === body.employeeId);
        if (!employee) return { skipWrite: true, statusCode: 404, response: { error: "Dipendente non trovato" } };
        record.employeeId = employee.id;
        record.type = body.type;
        record.timestamp = new Date(body.timestamp).toISOString();
        record.manual = true;
        record.note = body.note || record.note || "";
        addActivity(state, {
          type: "Presenze",
          title: "Timbratura corretta",
          detail: `${employee.name} · ${body.type === "in" ? "Entrata" : "Uscita"}`
        });
        return {};
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, { ok: true, state: stateForUser(result.state, user), records: attendanceWithEmployees(result.state) });
      return;
    }

    if (attendanceMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const result = await mutateState((state) => {
        const record = (state.attendanceRecords || []).find((item) => item.id === attendanceMatch[1]);
        if (!record) return { skipWrite: true, statusCode: 404, response: { error: "Timbratura non trovata" } };
        const name = employeeName(state, record.employeeId);
        state.attendanceRecords = (state.attendanceRecords || []).filter((item) => item.id !== attendanceMatch[1]);
        addActivity(state, {
          type: "Presenze",
          title: "Timbratura eliminata",
          detail: `${name} · ${record.type === "in" ? "Entrata" : "Uscita"}`
        });
        return {};
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, { ok: true, state: stateForUser(result.state, user), records: attendanceWithEmployees(result.state) });
      return;
    }

    if (url.pathname === "/api/me/pin" && req.method === "PATCH") {
      const user = currentUser(req);
      if (!user || user.role !== "employee") {
        sendJson(res, 403, { error: "Solo un dipendente puo cambiare il proprio PIN" });
        return;
      }

      const body = await readBody(req);
      const state = readState();
      const employee = state?.employees?.find((item) => item.id === user.employeeId);
      if (!employee) {
        sendJson(res, 404, { error: "Dipendente non trovato" });
        return;
      }
      if (!verifyCredential(body.currentPin, employee.pinHash)) {
        sendJson(res, 401, { error: "PIN attuale non corretto" });
        return;
      }
      if (!isValidPin(body.newPin)) {
        sendJson(res, 400, { error: "Il nuovo PIN deve avere da 4 a 8 numeri" });
        return;
      }

      employee.pinHash = hashCredential(body.newPin);
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/employees" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      if (!isValidPin(body.pin)) {
        sendJson(res, 400, { error: "Imposta un PIN da 4 a 8 numeri per il nuovo dipendente" });
        return;
      }
      const pinHash = hashCredential(body.pin);
      const employee = {
        id: `e${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        name: body.name,
        role: body.role,
        color: body.color,
        target: Number(body.target) || 0,
        pinHash,
        phone: body.phone || "",
        email: body.email || "",
        intermittent: Boolean(body.intermittent),
        supervisor: hasFeature(licenseContext, "supervisor") && Boolean(body.supervisor),
        fiscalCode: body.fiscalCode || "",
        communicationCode: body.communicationCode || "",
        active: true
      };
      state.employees = Array.isArray(state.employees) ? state.employees : [];
      state.employees.push(employee);
      writeState(state);
      sendJson(res, 200, { ok: true, employee: sanitizeEmployee(employee), state: stateForUser(state, user) });
      return;
    }

    const employeeMatch = url.pathname.match(/^\/api\/employees\/([^/]+)$/);
    if (employeeMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      state.employees = (state.employees || []).map((employee) => {
        if (employee.id !== employeeMatch[1]) return employee;
        const allowedBody = { ...body };
        if (!hasFeature(licenseContext, "supervisor")) delete allowedBody.supervisor;
        const next = { ...employee, ...allowedBody, target: Number(body.target) || 0 };
        if (isValidPin(body.pin)) next.pinHash = hashCredential(body.pin);
        delete next.pin;
        delete next.hasPin;
        return next;
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (employeeMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      const employeeId = employeeMatch[1];
      const archivedAt = new Date().toISOString();
      state.employees = (state.employees || []).map((employee) => (
        employee.id === employeeId
          ? { ...employee, active: false, archivedAt }
          : employee
      ));
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    const requestStatusMatch = url.pathname.match(/^\/api\/time-off-requests\/([^/]+)$/);
    if (requestStatusMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const request = (state.timeOffRequests || []).find((item) => item.id === requestStatusMatch[1]);
      if (!request) {
        sendJson(res, 404, { error: "Richiesta non trovata" });
        return;
      }
      request.status = body.status;
      if (body.status === "approved") {
        const weekOffset = String(request.weekOffset);
        const requestDays = request.type === "Mezza giornata" ? [request.day] : requestDayRange(request);
        state.shiftsByWeek = state.shiftsByWeek || {};
        state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset] || [];
        state.shiftsByWeek[weekOffset] = [
          ...state.shiftsByWeek[weekOffset].filter((shift) => request.type === "Mezza giornata" || !(shift.employeeId === request.employeeId && requestDays.includes(shift.day))),
          ...requestDays.map((day) => requestShiftFromApproval(state, request, day))
        ];
      }
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (requestStatusMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      const request = (state.timeOffRequests || []).find((item) => item.id === requestStatusMatch[1]);
      if (!request) {
        sendJson(res, 404, { error: "Richiesta non trovata" });
        return;
      }
      state.timeOffRequests = (state.timeOffRequests || []).filter((item) => item.id !== requestStatusMatch[1]);
      addActivity(state, {
        type: "Richieste",
        title: "Richiesta eliminata",
        detail: `${employeeName(state, request.employeeId)} · ${request.type}`,
        weekOffset: request.weekOffset
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/shifts" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const result = await mutateState((state) => {
        const weekOffset = String(Number(body.weekOffset) || 0);
        const defaultWorkplace = state.companySettings?.workplaces?.[0] || state.companySettings?.companyName || "Bar Flora srl";
        state.shiftsByWeek = state.shiftsByWeek || {};
        state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset] || [];
        const shift = {
          id: `s${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
          employeeId: body.employeeId,
          day: body.day,
          type: body.type,
          start: body.start || "",
          end: body.end || "",
          workplace: body.workplace || defaultWorkplace,
          color: body.color || "#95ddd8",
          note: body.note || "",
          category: body.category || "day"
        };
        state.shiftsByWeek[weekOffset].push(shift);
        return { shift };
      });
      sendJson(res, 200, { ok: true, shift: result.shift, state: stateForUser(result.state, user) });
      return;
    }

    const shiftMatch = url.pathname.match(/^\/api\/shifts\/([^/]+)$/);
    if (shiftMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const shiftId = shiftMatch[1];
      const result = await mutateState((state) => {
        const defaultWorkplace = state.companySettings?.workplaces?.[0] || state.companySettings?.companyName || "Bar Flora srl";
        state.shiftsByWeek = state.shiftsByWeek || {};
        const weekOffset = findShiftWeekOffset(state, shiftId, body.weekOffset);
        state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset] || [];
        let found = false;
        state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset].map((shift) => {
          if (shift.id !== shiftId) return shift;
          found = true;
          const nextShift = {
            ...shift,
            employeeId: body.employeeId,
            day: body.day,
            type: body.type,
            start: body.start || "",
            end: body.end || "",
            workplace: body.workplace || defaultWorkplace,
            color: body.color || "#95ddd8",
            note: body.note || "",
            category: body.category || "day"
          };
          (state.taskAssignments || []).forEach((task) => {
            if (task.shiftId === shiftId && (task.status === "assigned" || task.status === "rejected")) {
              task.employeeId = nextShift.employeeId;
              task.day = nextShift.day;
              task.workplace = nextShift.workplace;
              task.shiftType = nextShift.type;
              task.start = nextShift.start;
              task.end = nextShift.end;
              task.updatedAt = new Date().toISOString();
            }
          });
          return nextShift;
        });
        if (!found) {
          return { skipWrite: true, statusCode: 404, response: { error: "Turno non trovato" } };
        }
        return {};
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, { ok: true, state: stateForUser(result.state, user) });
      return;
    }

    if (shiftMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const shiftId = shiftMatch[1];
      const result = await mutateState((state) => {
        state.shiftsByWeek = state.shiftsByWeek || {};
        const weekOffset = findShiftWeekOffset(state, shiftId, url.searchParams.get("weekOffset"));
        state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset] || [];
        const before = state.shiftsByWeek[weekOffset].length;
        state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset].filter((shift) => shift.id !== shiftId);
        if (state.shiftsByWeek[weekOffset].length === before) {
          return { skipWrite: true, statusCode: 404, response: { error: "Turno non trovato" } };
        }
        state.taskAssignments = (state.taskAssignments || []).filter((task) => (
          task.shiftId !== shiftId || task.status === "done" || task.status === "verified"
        ));
        return {};
      });
      if (result.response) {
        sendJson(res, result.statusCode || 400, result.response);
        return;
      }
      sendJson(res, 200, { ok: true, state: stateForUser(result.state, user) });
      return;
    }

    if (url.pathname === "/api/task-module" && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      state.taskModule = {
        enabled: Boolean(body.enabled),
        reminderMinutesBefore: Number(body.reminderMinutesBefore) || 30
      };
      addActivity(state, {
        type: "Mansionario",
        title: state.taskModule.enabled ? "Mansionario attivato" : "Mansionario disattivato",
        detail: "Impostazioni modulo aggiornate"
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/task-templates" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const template = normalizeTaskTemplate(body);
      if (!template.title) {
        sendJson(res, 400, { error: "Inserisci il titolo della mansione" });
        return;
      }
      if (template.assignmentMode === "single" && !template.assigneeEmployeeId) {
        sendJson(res, 400, { error: "Scegli il dipendente assegnato alla mansione" });
        return;
      }
      state.taskTemplates = Array.isArray(state.taskTemplates) ? state.taskTemplates : [];
      state.taskTemplates.push(template);
      addActivity(state, { type: "Mansionario", title: "Mansione creata", detail: template.title });
      writeState(state);
      sendJson(res, 200, { ok: true, template, state: stateForUser(state, user) });
      return;
    }

    const templateMatch = url.pathname.match(/^\/api\/task-templates\/([^/]+)$/);
    if (templateMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const template = (state.taskTemplates || []).find((item) => item.id === templateMatch[1]);
      if (!template) {
        sendJson(res, 404, { error: "Mansione non trovata" });
        return;
      }
      const nextTemplate = normalizeTaskTemplate(body, template);
      if (!nextTemplate.title) {
        sendJson(res, 400, { error: "Inserisci il titolo della mansione" });
        return;
      }
      if (nextTemplate.assignmentMode === "single" && !nextTemplate.assigneeEmployeeId) {
        sendJson(res, 400, { error: "Scegli il dipendente assegnato alla mansione" });
        return;
      }
      state.taskTemplates = (state.taskTemplates || []).map((item) => item.id === template.id ? nextTemplate : item);
      (state.taskAssignments || []).forEach((task) => {
        if (task.templateId === template.id && (task.status === "assigned" || task.status === "rejected")) {
          task.title = nextTemplate.title;
          task.description = nextTemplate.description;
          task.proofRequired = nextTemplate.proofRequired;
          task.verifierEmployeeId = nextTemplate.verifierEmployeeId || "";
          task.assignmentMode = nextTemplate.assignmentMode || "shared";
          task.assigneeEmployeeId = nextTemplate.assigneeEmployeeId || "";
          task.taskTime = nextTemplate.taskTime || "";
          task.updatedAt = new Date().toISOString();
        }
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (templateMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      state.taskTemplates = (state.taskTemplates || []).filter((item) => item.id !== templateMatch[1]);
      state.taskAssignments = (state.taskAssignments || []).filter((task) => (
        task.templateId !== templateMatch[1] || task.status === "done" || task.status === "verified"
      ));
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    const taskMatch = url.pathname.match(/^\/api\/task-assignments\/([^/]+)$/);
    if (taskMatch && req.method === "PATCH") {
      const user = currentUser(req);
      const body = await readBody(req);
      const state = readState();
      const task = (state.taskAssignments || []).find((item) => item.id === taskMatch[1]);
      if (!canAccessTask(user, task)) {
        sendJson(res, 403, { error: "Mansione non disponibile" });
        return;
      }
      if (body.action === "complete") {
        if (user.role !== "employee" || !taskEmployeeIds(task).includes(user.employeeId)) {
          sendJson(res, 403, { error: "Solo un dipendente del turno puo completare la mansione" });
          return;
        }
        const note = String(body.note || "").trim();
        if (task.proofRequired === "note" && !note) {
          sendJson(res, 400, { error: "Questa mansione richiede una nota" });
          return;
        }
        const photo = body.photoData ? saveTaskPhoto(task.id, body.photoData) : null;
        if (task.proofRequired === "photo" && !photo && !task.photo) {
          sendJson(res, 400, { error: "Questa mansione richiede una foto" });
          return;
        }
        task.status = "done";
        task.note = note;
        if (photo) task.photo = photo;
        task.completedAt = new Date().toISOString();
        task.completedBy = user.employeeId;
        task.rejectionNote = "";
        task.updatedAt = new Date().toISOString();
      } else if (body.action === "verify" || body.action === "reject") {
        if (!canVerifyTask(user, task)) {
          sendJson(res, 403, { error: "Non puoi verificare questa mansione" });
          return;
        }
        task.status = body.action === "verify" ? "verified" : "rejected";
        task.verifiedAt = new Date().toISOString();
        task.verifiedBy = user.employeeId || "manager";
        task.rejectionNote = String(body.rejectionNote || "").trim();
        task.updatedAt = new Date().toISOString();
      } else if (body.action === "reassign") {
        if (user.role !== "manager") {
          sendJson(res, 403, { error: "Solo il manager puo riassegnare" });
          return;
        }
        const employee = (state.employees || []).find((item) => item.id === body.employeeId);
        if (!employee) {
          sendJson(res, 400, { error: "Dipendente non valido" });
          return;
        }
        task.employeeId = employee.id;
        task.status = "assigned";
        task.completedAt = "";
        task.verifiedAt = "";
        task.verifiedBy = "";
        task.rejectionNote = "";
        task.updatedAt = new Date().toISOString();
      } else {
        sendJson(res, 400, { error: "Azione mansione non valida" });
        return;
      }
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (taskMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      const task = (state.taskAssignments || []).find((item) => item.id === taskMatch[1]);
      if (!task) {
        sendJson(res, 404, { error: "Mansione assegnata non trovata" });
        return;
      }
      state.taskAssignments = (state.taskAssignments || []).filter((item) => item.id !== taskMatch[1]);
      addActivity(state, {
        type: "Mansionario",
        title: "Mansione assegnata eliminata",
        detail: `${employeeName(state, task.employeeId)} · ${task.title}`,
        weekOffset: task.weekOffset
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/task-assignments/generate" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const offset = String(Number(body.weekOffset) || 0);
      const day = dayKeys.includes(body.day) ? body.day : null;
      const createdTasks = generateTaskAssignmentsForPublication(state, offset, day);
      writeState(state);
      sendJson(res, 200, { ok: true, createdTasks, state: stateForUser(state, user) });
      return;
    }

    const photoMatch = url.pathname.match(/^\/api\/task-photos\/([^/]+)$/);
    if (photoMatch && req.method === "GET") {
      const user = currentUser(req);
      const state = readState();
      const file = path.basename(photoMatch[1]);
      const task = (state.taskAssignments || []).find((item) => item.photo?.file === file);
      if (!canAccessTask(user, task)) {
        sendJson(res, 403, { error: "Foto non disponibile" });
        return;
      }
      const photoPath = path.join(taskUploadsDir, file);
      if (!fs.existsSync(photoPath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": task.photo.mimeType || "image/jpeg" });
      fs.createReadStream(photoPath).pipe(res);
      return;
    }

    if (url.pathname === "/api/backups" && req.method === "GET") {
      const user = currentUser(req);
      if (!user || user.role !== "manager") {
        sendJson(res, 403, { error: "Solo il manager puo vedere i backup" });
        return;
      }
      pruneBackups(80);
      const total = fs.existsSync(backupsDir)
        ? fs.readdirSync(backupsDir).filter((file) => file.endsWith(".json")).length
        : 0;
      sendJson(res, 200, { backups: listBackups(), total });
      return;
    }

    if (url.pathname === "/api/backups/restore" && req.method === "POST") {
      const user = currentUser(req);
      if (!user || user.role !== "manager") {
        sendJson(res, 403, { error: "Solo il manager puo ripristinare i backup" });
        return;
      }
      const body = await readBody(req);
      const backupPath = safeBackupPath(body.file || "");
      if (!backupPath || !fs.existsSync(backupPath)) {
        sendJson(res, 404, { error: "Backup non trovato" });
        return;
      }
      backupStateFile();
      fs.copyFileSync(backupPath, dbPath);
      const restoredState = readState();
      if (!restoredState) {
        sendJson(res, 500, { error: "Backup non leggibile: ripristino annullato" });
        return;
      }
      addActivity(restoredState, {
        type: "Backup",
        title: "Backup ripristinato",
        detail: body.file || ""
      });
      writeState(restoredState);
      sendJson(res, 200, { ok: true, state: stateForUser(readState(), user) });
      return;
    }

    if (url.pathname === "/api/activity" && req.method === "GET") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      sendJson(res, 200, { activityLog: state.activityLog || [] });
      return;
    }

    if (url.pathname === "/api/activity" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      addActivity(state, {
        type: body.type,
        title: body.title,
        detail: body.detail,
        weekOffset: body.weekOffset
      });
      writeState(state);
      sendJson(res, 200, { ok: true, activityLog: state.activityLog });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Errore server" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`App turni ristorante: http://localhost:${port}`);
  console.log(`Cliente: ${licenseContext.displayName} · piano ${licenseContext.planName} · licenza ${licenseContext.accessMode}`);
  if (!process.env.MANAGER_PASSWORD && !process.env.MANAGER_PASSWORD_HASH) {
    if (process.env.NODE_ENV === "production") {
      console.log("Accesso manager disattivato: impostare MANAGER_PASSWORD prima della pubblicazione.");
    } else {
      console.log("Accesso manager demo attivo solo in sviluppo locale. Impostare MANAGER_PASSWORD prima della pubblicazione.");
    }
  }
  console.log("Dipendenti: PIN personale cifrato e gestito dalla scheda dipendente.");
});

setInterval(() => {
  if (hasFeature(licenseContext, "task_module") && licenseContext.canWrite) {
    sendDueTaskReminders().catch((error) => console.warn("Promemoria mansionario non inviati:", error.message));
  }
}, 5 * 60 * 1000);
