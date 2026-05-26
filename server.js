const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = Number(process.env.PORT || 4190);
const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : root;
const seedDbPath = path.join(root, "seed-data.json");
const legacyDbPath = path.join(root, "restaurant-data.json");
const dbPath = path.join(dataDir, "restaurant-data.json");
const backupsDir = path.join(dataDir, "backups");
const sessions = new Map();
const sessionMaxAgeSeconds = 60 * 60 * 12;
const qrWindowMs = 30 * 1000;

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
      if (body.length > 1_000_000) {
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
    companyName: state.companySettings?.companyName || "Piscine Aquamore",
    roles: Array.isArray(state.companySettings?.roles) && state.companySettings.roles.length ? state.companySettings.roles : ["Reception", "Bagnini", "Istruttori", "Pulizie", "Bar"],
    workplaces: Array.isArray(state.companySettings?.workplaces) && state.companySettings.workplaces.length ? state.companySettings.workplaces : ["Piscine Aquamore"],
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
  return {
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
    activityLog: Array.isArray(state.activityLog) ? state.activityLog : []
  };
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
    hasPin: publicEmployee.hasPin
  };
}

function sanitizeStateForManager(state) {
  return {
    ...state,
    employees: state.employees.map(sanitizeEmployee)
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
    notificationLog: [],
    notificationStatus: {},
    activityLog: []
  };
}

function attendanceWithEmployees(state) {
  const employeeNames = new Map((state.employees || []).map((employee) => [employee.id, employee.name]));
  return (state.attendanceRecords || []).map((record) => ({
    ...record,
    employeeName: employeeNames.get(record.employeeId) || "Dipendente"
  }));
}

function latestAttendanceForEmployee(state, employeeId) {
  return (state.attendanceRecords || [])
    .filter((record) => record.employeeId === employeeId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;
}

function stateForUser(state, user) {
  return user.role === "employee" ? employeeVisibleState(state, user) : sanitizeStateForManager(state);
}

function mergeSensitiveEmployeeFields(incomingState, currentState) {
  const currentById = new Map((currentState?.employees || []).map((employee) => [employee.id, employee]));
  return {
    ...incomingState,
    employees: (incomingState.employees || []).map((employee) => {
      const current = currentById.get(employee.id);
      const next = { ...employee };
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
  fs.writeFileSync(dbPath, JSON.stringify(normalizeState(state), null, 2));
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

function backupStateFile() {
  ensureDataStorage();
  if (!fs.existsSync(dbPath)) return;
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `restaurant-data-${stamp}.json`);
  fs.copyFileSync(dbPath, backupPath);
}

function listBackups() {
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse()
    .map((file) => {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      return {
        file,
        size: stats.size,
        createdAt: stats.mtime.toISOString()
      };
    });
}

function safeBackupPath(file) {
  const resolved = path.normalize(path.join(backupsDir, file));
  if (!resolved.startsWith(backupsDir) || !file.endsWith(".json")) return null;
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

function defaultShiftPresets(state) {
  return state.shiftPresets || {};
}

function requestShiftFromApproval(state, request) {
  const presets = defaultShiftPresets(state);
  const effectiveType = request.type === "Mezza giornata" ? "Giorno di riposo" : request.type;
  const preset = presets[effectiveType] || presets["Giorno di riposo"] || { color: "#f1f1f3", category: "rest" };
  const defaultWorkplace = state.companySettings?.workplaces?.[0] || state.companySettings?.companyName || "Piscine Aquamore";
  return {
    id: `s${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
    employeeId: request.employeeId,
    day: request.day,
    type: request.type,
    start: request.type === "Mezza giornata" ? request.startTime : "",
    end: request.type === "Mezza giornata" ? request.endTime : "",
    workplace: defaultWorkplace,
    color: preset.color,
    note: request.note ? `Richiesta approvata: ${request.note}` : "Richiesta approvata",
    category: preset.category
  };
}

function isValidPin(pin) {
  return typeof pin === "string" && /^\d{4,8}$/.test(pin);
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));
  const relativePath = path.relative(root, filePath);

  if (
    !filePath.startsWith(root) ||
    relativePath === "restaurant-data.json" ||
    relativePath === "seed-data.json" ||
    relativePath === "server.js" ||
    relativePath === "package.json" ||
    relativePath.startsWith(`backups${path.sep}`) ||
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

    if (url.pathname === "/api/session" && req.method === "GET") {
      const user = currentUser(req);
      sendJson(res, 200, { authenticated: Boolean(user), user });
      return;
    }

    if (url.pathname === "/api/login/employees" && req.method === "GET") {
      const state = readState();
      sendJson(res, 200, {
        employees: (state?.employees || []).map(sanitizeEmployeeForLogin)
      });
      return;
    }

    if (url.pathname === "/api/totem/token" && req.method === "GET") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      sendJson(res, 200, {
        ...activeTotemToken(req),
        companyName: state?.companySettings?.companyName || "Piscine Aquamore"
      }, {
        "Cache-Control": "no-store"
      });
      return;
    }

    if (url.pathname === "/api/login" && req.method === "POST") {
      const body = await readBody(req);
      const isManager = body.role === "manager" && verifyManagerPassword(body.password);
      const state = readState();
      const employee = state?.employees?.find((item) => item.id === body.employeeId);
      const isEmployee = body.role === "employee" && employee && verifyCredential(body.password, employee.pinHash);

      if (!isManager && !isEmployee) {
        sendJson(res, 401, { error: "Credenziali non valide" });
        return;
      }

      const sid = crypto.randomBytes(18).toString("hex");
      const user = isManager
        ? { role: "manager" }
        : { role: "employee", employeeId: body.employeeId };
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
      const currentState = readState();
      writeState(mergeSensitiveEmployeeFields(body.state, currentState));
      sendJson(res, 200, { ok: true });
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
      addActivity(state, {
        type: "Pubblicazione",
        title: body.published ? "Settimana pubblicata" : "Settimana nascosta",
        detail: `Periodo settimana ${offset}`,
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
      addActivity(state, {
        type: "Pubblicazione",
        title: body.published ? "Giorno pubblicato" : "Giorno nascosto",
        detail: `${dayLabel(day)} · settimana ${offset}`,
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

      const request = {
        id: `r${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
        employeeId: user.employeeId,
        weekOffset: Number(body.weekOffset) || 0,
        day: body.day,
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

      const state = readState();
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
      writeState(state);
      sendJson(res, 200, {
        ok: true,
        record,
        status: type === "in" ? "Entrata registrata" : "Uscita registrata",
        state: stateForUser(state, user)
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
        records: attendanceWithEmployees(state)
      });
      return;
    }

    if (url.pathname === "/api/attendance/manual" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const employee = (state.employees || []).find((item) => item.id === body.employeeId);
      if (!employee) {
        sendJson(res, 404, { error: "Dipendente non trovato" });
        return;
      }
      if (!["in", "out"].includes(body.type) || Number.isNaN(new Date(body.timestamp).getTime())) {
        sendJson(res, 400, { error: "Timbratura non valida" });
        return;
      }
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
      writeState(state);
      sendJson(res, 200, { ok: true, record, state: stateForUser(state, user), records: attendanceWithEmployees(state) });
      return;
    }

    const attendanceMatch = url.pathname.match(/^\/api\/attendance\/([^/]+)$/);
    if (attendanceMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const record = (state.attendanceRecords || []).find((item) => item.id === attendanceMatch[1]);
      if (!record) {
        sendJson(res, 404, { error: "Timbratura non trovata" });
        return;
      }
      const employee = (state.employees || []).find((item) => item.id === body.employeeId);
      if (!employee) {
        sendJson(res, 404, { error: "Dipendente non trovato" });
        return;
      }
      if (!["in", "out"].includes(body.type) || Number.isNaN(new Date(body.timestamp).getTime())) {
        sendJson(res, 400, { error: "Timbratura non valida" });
        return;
      }
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
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user), records: attendanceWithEmployees(state) });
      return;
    }

    if (attendanceMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      const record = (state.attendanceRecords || []).find((item) => item.id === attendanceMatch[1]);
      if (!record) {
        sendJson(res, 404, { error: "Timbratura non trovata" });
        return;
      }
      const name = employeeName(state, record.employeeId);
      state.attendanceRecords = (state.attendanceRecords || []).filter((item) => item.id !== attendanceMatch[1]);
      addActivity(state, {
        type: "Presenze",
        title: "Timbratura eliminata",
        detail: `${name} · ${record.type === "in" ? "Entrata" : "Uscita"}`
      });
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user), records: attendanceWithEmployees(state) });
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
        email: body.email || ""
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
        const next = { ...employee, ...body, target: Number(body.target) || 0 };
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
      state.employees = (state.employees || []).filter((employee) => employee.id !== employeeId);
      Object.keys(state.shiftsByWeek || {}).forEach((offset) => {
        state.shiftsByWeek[offset] = state.shiftsByWeek[offset].filter((shift) => shift.employeeId !== employeeId);
      });
      state.timeOffRequests = (state.timeOffRequests || []).filter((request) => request.employeeId !== employeeId);
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
        state.shiftsByWeek = state.shiftsByWeek || {};
        state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset] || [];
        state.shiftsByWeek[weekOffset] = [
          ...state.shiftsByWeek[weekOffset].filter((shift) => request.type === "Mezza giornata" || !(shift.employeeId === request.employeeId && shift.day === request.day)),
          requestShiftFromApproval(state, request)
        ];
      }
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/shifts" && req.method === "POST") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const weekOffset = String(Number(body.weekOffset) || 0);
      const defaultWorkplace = state.companySettings?.workplaces?.[0] || state.companySettings?.companyName || "Piscine Aquamore";
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
      writeState(state);
      sendJson(res, 200, { ok: true, shift, state: stateForUser(state, user) });
      return;
    }

    const shiftMatch = url.pathname.match(/^\/api\/shifts\/([^/]+)$/);
    if (shiftMatch && req.method === "PATCH") {
      const user = managerOnly(req, res);
      if (!user) return;
      const body = await readBody(req);
      const state = readState();
      const weekOffset = String(Number(body.weekOffset) || 0);
      const defaultWorkplace = state.companySettings?.workplaces?.[0] || state.companySettings?.companyName || "Piscine Aquamore";
      const shiftId = shiftMatch[1];
      state.shiftsByWeek = state.shiftsByWeek || {};
      state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset] || [];
      let found = false;
      state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset].map((shift) => {
        if (shift.id !== shiftId) return shift;
        found = true;
        return {
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
      });
      if (!found) {
        sendJson(res, 404, { error: "Turno non trovato" });
        return;
      }
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (shiftMatch && req.method === "DELETE") {
      const user = managerOnly(req, res);
      if (!user) return;
      const state = readState();
      const shiftId = shiftMatch[1];
      const weekOffset = String(Number(url.searchParams.get("weekOffset")) || 0);
      state.shiftsByWeek = state.shiftsByWeek || {};
      state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset] || [];
      const before = state.shiftsByWeek[weekOffset].length;
      state.shiftsByWeek[weekOffset] = state.shiftsByWeek[weekOffset].filter((shift) => shift.id !== shiftId);
      if (state.shiftsByWeek[weekOffset].length === before) {
        sendJson(res, 404, { error: "Turno non trovato" });
        return;
      }
      writeState(state);
      sendJson(res, 200, { ok: true, state: stateForUser(state, user) });
      return;
    }

    if (url.pathname === "/api/backups" && req.method === "GET") {
      const user = currentUser(req);
      if (!user || user.role !== "manager") {
        sendJson(res, 403, { error: "Solo il manager puo vedere i backup" });
        return;
      }
      sendJson(res, 200, { backups: listBackups() });
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
  if (!process.env.MANAGER_PASSWORD && !process.env.MANAGER_PASSWORD_HASH) {
    if (process.env.NODE_ENV === "production") {
      console.log("Accesso manager disattivato: impostare MANAGER_PASSWORD prima della pubblicazione.");
    } else {
      console.log("Accesso manager demo attivo solo in sviluppo locale. Impostare MANAGER_PASSWORD prima della pubblicazione.");
    }
  }
  console.log("Dipendenti: PIN personale cifrato e gestito dalla scheda dipendente.");
});
