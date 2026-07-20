let currentUser = null;
let appState = null;
let editingTemplateId = null;
let completingTaskId = null;

const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const baseWeekStart = new Date(2026, 4, 18);
let selectedWeekOffset = 0;

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch {
    throw new Error("Connessione al server non riuscita. Apri il mansionario da Render o da localhost, non come file locale.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Operazione non riuscita");
  return payload;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function employee(id) {
  return (appState?.employees || []).find((item) => item.id === id);
}

function sortedEmployees() {
  return [...(appState?.employees || [])].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

function taskEmployeeIds(task) {
  return [...new Set([...(Array.isArray(task.employeeIds) ? task.employeeIds : []), task.employeeId].filter(Boolean))];
}

function employeeNames(task) {
  return taskEmployeeIds(task).map((id) => employee(id)?.name).filter(Boolean).join(", ");
}

function dayLabel(dayKey) {
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function weekOffsetForDate(date) {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(date) - startOfDay(baseWeekStart)) / oneWeek);
}

function todayInfo() {
  const offset = weekOffsetForDate(new Date());
  const start = addDays(baseWeekStart, offset * 7);
  const today = startOfDay();
  const day = dayKeys.find((key, index) => addDays(start, index).toDateString() === today.toDateString()) || "mon";
  return { offset, day };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function weekLabel(offset) {
  const start = addDays(baseWeekStart, Number(offset) * 7);
  const end = addDays(start, 6);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function statusLabel(status) {
  return {
    assigned: "Da fare",
    done: "Da verificare",
    verified: "Verificata",
    rejected: "Da rifare"
  }[status] || status || "Da fare";
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function shiftTypes() {
  return [...new Set(Object.values(appState?.shiftsByWeek || {})
    .flat()
    .map((shift) => shift.type)
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "it"));
}

function workplaces() {
  return [...new Set([
    ...(appState?.companySettings?.workplaces || []),
    ...Object.values(appState?.shiftsByWeek || {}).flat().map((shift) => shift.workplace),
    ...(appState?.taskTemplates || []).map((template) => template.workplace),
    ...(appState?.taskAssignments || []).map((task) => task.workplace)
  ].filter((place) => place && place !== "all"))]
    .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

function setError(selector, message) {
  const element = document.querySelector(selector);
  element.textContent = message || "";
  element.classList.toggle("hidden", !message);
}

function applyState(nextState) {
  appState = nextState || appState || {};
  document.querySelector("#companyName").textContent = appState?.companySettings?.companyName || "Mansionario";
  populateSelects();
  render();
}

async function loadLoginEmployees() {
  const payload = await apiRequest("/api/login/employees");
  appState = { ...(appState || {}), employees: payload.employees || [] };
  populateEmployeeLogin();
}

async function loadState() {
  const payload = await apiRequest("/api/state");
  applyState(payload.state);
}

function populateEmployeeLogin() {
  const options = sortedEmployees().map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("");
  document.querySelector("#loginEmployee").innerHTML = options;
}

function populateSelects() {
  populateEmployeeLogin();
  const employeeOptions = sortedEmployees().map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("");
  document.querySelector("#taskAssignee").innerHTML = `<option value="">Scegli dipendente</option>${employeeOptions}`;
  document.querySelector("#taskVerifier").innerHTML = `<option value="">Manager / capoturno</option>${employeeOptions}`;
  document.querySelector("#taskRole").innerHTML = `<option value="all">Tutti i reparti</option>${(appState?.companySettings?.roles || []).map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join("")}`;
  document.querySelector("#taskWorkplace").innerHTML = `<option value="all">Tutti i luoghi</option>${workplaces().map((place) => `<option value="${escapeHtml(place)}">${escapeHtml(place)}</option>`).join("")}`;
  document.querySelector("#taskShiftType").innerHTML = `<option value="all">Tutti i turni</option><option value="day">Tutti i diurni</option><option value="evening">Tutti i serali</option>${shiftTypes().map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
  document.querySelector("#taskDay").innerHTML = `<option value="all">Tutti i giorni</option>${dayKeys.map((key) => `<option value="${key}">${dayLabel(key)}</option>`).join("")}`;
}

function render() {
  document.querySelector("#loginForm").classList.toggle("hidden", Boolean(currentUser));
  document.querySelector("#logoutButton").classList.toggle("hidden", !currentUser);
  document.querySelector("#managerPanel").classList.toggle("hidden", currentUser?.role !== "manager");
  document.querySelector("#tasksPanel").classList.toggle("hidden", !currentUser);
  document.querySelector("#enableModuleButton").textContent = appState?.taskModule?.enabled ? "Disattiva mansionario" : "Attiva mansionario";
  document.querySelector("#weekLabel").textContent = weekLabel(selectedWeekOffset);
  renderTemplates();
  renderAssignments();
}

function renderTemplates() {
  const list = document.querySelector("#templateList");
  if (currentUser?.role !== "manager") {
    list.innerHTML = "";
    return;
  }
  const templates = appState?.taskTemplates || [];
  list.innerHTML = templates.length ? templates.map((template) => `
    <article class="card">
      <div>
        <strong>${escapeHtml(template.title)}</strong>
        <span>${template.assignmentMode === "single" ? `Solo ${escapeHtml(employee(template.assigneeEmployeeId)?.name || "dipendente")}` : "Condivisa nel turno"} · ${template.day === "all" ? "Tutti i giorni" : dayLabel(template.day)}${template.taskTime ? ` · ore ${escapeHtml(template.taskTime)}` : ""}</span>
        <small>${escapeHtml(template.role === "all" ? "Tutti i reparti" : template.role)} · ${escapeHtml(template.workplace === "all" ? "Tutti i luoghi" : template.workplace)} · ${escapeHtml(template.shiftType === "all" ? "Tutti i turni" : template.shiftType)}</small>
        ${template.description ? `<small>${escapeHtml(template.description)}</small>` : ""}
      </div>
      <div class="card-actions">
        <button class="ghost edit-template" data-id="${template.id}" type="button">Modifica</button>
        <button class="danger delete-template" data-id="${template.id}" type="button">Elimina</button>
      </div>
    </article>
  `).join("") : "<p>Nessuna mansione ricorrente salvata.</p>";
  bindDynamicButtons(list);
}

function visibleAssignments() {
  if (!currentUser) return [];
  const assignments = appState?.taskAssignments || [];
  const today = todayInfo();
  if (currentUser.role === "manager") {
    return assignments.filter((task) => String(task.weekOffset) === String(selectedWeekOffset));
  }
  const todayTasks = assignments.filter((task) => String(task.weekOffset) === String(today.offset) && task.day === today.day);
  if (currentUser.role === "supervisor") return todayTasks;
  return todayTasks.filter((task) => taskEmployeeIds(task).includes(currentUser.employeeId) || task.verifierEmployeeId === currentUser.employeeId);
}

function renderAssignments() {
  const list = document.querySelector("#assignmentList");
  if (!currentUser) return;
  const tasks = visibleAssignments();
  document.querySelector("#taskPanelEyebrow").textContent = currentUser.role === "manager" ? weekLabel(selectedWeekOffset) : "Oggi";
  document.querySelector("#taskPanelTitle").textContent = currentUser.role === "manager" ? "Mansioni generate" : "Mansioni di oggi";
  list.innerHTML = tasks.length ? tasks.map(renderTaskCard).join("") : "<p>Nessuna mansione.</p>";
  bindDynamicButtons(list);
}

function renderTaskCard(task) {
  const completedBy = employee(task.completedBy);
  const verifiedBy = task.verifiedBy === "manager" ? "Manager" : employee(task.verifiedBy)?.name;
  const canSeeTaskPeople = currentUser.role === "manager" || currentUser.role === "supervisor" || task.verifierEmployeeId === currentUser.employeeId;
  const peopleLabel = canSeeTaskPeople ? (employeeNames(task) || "Dipendenti del turno") : "Mansione del tuo turno";
  const canComplete = currentUser.role === "employee" && taskEmployeeIds(task).includes(currentUser.employeeId) && ["assigned", "rejected"].includes(task.status);
  const canVerify = task.status === "done" && (currentUser.role === "manager" || currentUser.role === "supervisor" || task.verifierEmployeeId === currentUser.employeeId);
  const canDelete = currentUser.role === "manager";
  const photo = task.photo?.file ? `<a class="photo-link" href="/api/task-photos/${encodeURIComponent(task.photo.file)}" target="_blank">Apri foto</a>` : "";
  return `
    <article class="card ${escapeHtml(task.status)}">
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(peopleLabel)} · ${dayLabel(task.day)}${task.taskTime ? ` · ore ${escapeHtml(task.taskTime)}` : ""}</span>
        <small>${escapeHtml(task.workplace || "")} · ${escapeHtml(task.shiftType || "")}</small>
        ${task.description ? `<small>${escapeHtml(task.description)}</small>` : ""}
        ${completedBy && canSeeTaskPeople ? `<small>Completata da: ${escapeHtml(completedBy.name)}</small>` : ""}
        ${verifiedBy && canSeeTaskPeople ? `<small>Verificata da: ${escapeHtml(verifiedBy)}</small>` : ""}
        ${task.note ? `<small>Nota: ${escapeHtml(task.note)}</small>` : ""}
        ${task.rejectionNote ? `<small>Rimandata: ${escapeHtml(task.rejectionNote)}</small>` : ""}
      </div>
      <div class="card-actions">
        <span class="status">${statusLabel(task.status)}</span>
        ${photo}
        ${canComplete ? `<button class="primary complete-task" data-id="${task.id}" type="button">Completa</button>` : ""}
        ${canVerify ? `<button class="primary verify-task" data-id="${task.id}" type="button">Verifica</button><button class="ghost reject-task" data-id="${task.id}" type="button">Rimanda</button>` : ""}
        ${canDelete ? `<button class="danger delete-assignment" data-id="${task.id}" type="button">Elimina</button>` : ""}
      </div>
    </article>
  `;
}

function templatePayload() {
  const rawTime = document.querySelector("#taskTime").value.trim();
  const taskTime = normalizeTime(rawTime);
  if (rawTime && !taskTime) throw new Error("Inserisci l'ora in formato 24h, esempio 09:30.");
  return {
    title: document.querySelector("#taskTitle").value.trim(),
    description: document.querySelector("#taskDescription").value.trim(),
    role: document.querySelector("#taskRole").value,
    workplace: document.querySelector("#taskWorkplace").value,
    shiftType: document.querySelector("#taskShiftType").value,
    assignmentMode: document.querySelector("#taskAssignmentMode").value,
    assigneeEmployeeId: document.querySelector("#taskAssignee").value,
    day: document.querySelector("#taskDay").value,
    taskTime,
    verifierEmployeeId: document.querySelector("#taskVerifier").value,
    proofRequired: document.querySelector("#taskProof").value,
    active: true
  };
}

function resetTemplateForm() {
  editingTemplateId = null;
  document.querySelector("#taskTitle").value = "";
  document.querySelector("#taskDescription").value = "";
  document.querySelector("#taskRole").value = "all";
  document.querySelector("#taskWorkplace").value = "all";
  document.querySelector("#taskShiftType").value = "all";
  document.querySelector("#taskAssignmentMode").value = "shared";
  document.querySelector("#taskAssignee").value = "";
  document.querySelector("#taskDay").value = "all";
  document.querySelector("#taskTime").value = "";
  document.querySelector("#taskVerifier").value = "";
  document.querySelector("#taskProof").value = "none";
  document.querySelector("#cancelTemplateEdit").classList.add("hidden");
}

async function saveTemplate() {
  try {
    const payload = templatePayload();
    if (!payload.title) throw new Error("Inserisci il titolo.");
    if (payload.assignmentMode === "single" && !payload.assigneeEmployeeId) throw new Error("Scegli il dipendente.");
    const endpoint = editingTemplateId ? `/api/task-templates/${editingTemplateId}` : "/api/task-templates";
    const response = await apiRequest(endpoint, {
      method: editingTemplateId ? "PATCH" : "POST",
      body: JSON.stringify(payload)
    });
    applyState(response.state);
    resetTemplateForm();
  } catch (error) {
    alert(error.message);
  }
}

function editTemplate(id) {
  const template = (appState?.taskTemplates || []).find((item) => item.id === id);
  if (!template) return;
  editingTemplateId = id;
  document.querySelector("#taskTitle").value = template.title || "";
  document.querySelector("#taskDescription").value = template.description || "";
  document.querySelector("#taskRole").value = template.role || "all";
  document.querySelector("#taskWorkplace").value = template.workplace || "all";
  document.querySelector("#taskShiftType").value = template.shiftType || "all";
  document.querySelector("#taskAssignmentMode").value = template.assignmentMode || "shared";
  document.querySelector("#taskAssignee").value = template.assigneeEmployeeId || "";
  document.querySelector("#taskDay").value = template.day || "all";
  document.querySelector("#taskTime").value = template.taskTime || "";
  document.querySelector("#taskVerifier").value = template.verifierEmployeeId || "";
  document.querySelector("#taskProof").value = template.proofRequired || "none";
  document.querySelector("#cancelTemplateEdit").classList.remove("hidden");
}

function openComplete(id) {
  const task = (appState?.taskAssignments || []).find((item) => item.id === id);
  if (!task) return;
  completingTaskId = id;
  document.querySelector("#completeTitle").textContent = task.title;
  document.querySelector("#completeDescription").textContent = task.description || "Segna la mansione come completata.";
  document.querySelector("#completeNote").value = "";
  document.querySelector("#completePhoto").value = "";
  setError("#completeError", "");
  document.querySelector("#completeDialog").showModal();
}

function compressImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    image.onerror = () => reject(new Error("Foto non leggibile."));
    image.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return reject(new Error("Usa JPG, PNG o WEBP."));
    const reader = new FileReader();
    reader.onload = () => compressImage(reader.result).then(resolve).catch(reject);
    reader.onerror = () => reject(new Error("Foto non leggibile."));
    reader.readAsDataURL(file);
  });
}

async function completeTask(event) {
  event.preventDefault();
  const task = (appState?.taskAssignments || []).find((item) => item.id === completingTaskId);
  if (!task) return;
  const note = document.querySelector("#completeNote").value.trim();
  const file = document.querySelector("#completePhoto").files[0];
  try {
    if (task.proofRequired === "note" && !note) throw new Error("Nota obbligatoria.");
    if (task.proofRequired === "photo" && !file && !task.photo) throw new Error("Foto obbligatoria.");
    const photoData = await fileToDataUrl(file);
    const response = await apiRequest(`/api/task-assignments/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "complete", note, photoData })
    });
    applyState(response.state);
    document.querySelector("#completeDialog").close();
  } catch (error) {
    setError("#completeError", error.message);
  }
}

async function patchAssignment(id, action, extra = {}) {
  const response = await apiRequest(`/api/task-assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action, ...extra })
  });
  applyState(response.state);
}

async function deleteAssignment(id) {
  if (!confirm("Eliminare questa mansione assegnata?")) return;
  const response = await apiRequest(`/api/task-assignments/${id}`, { method: "DELETE" });
  applyState(response.state);
}

async function deleteTemplate(id) {
  if (!confirm("Eliminare questa mansione predefinita?")) return;
  const response = await apiRequest(`/api/task-templates/${id}`, { method: "DELETE" });
  applyState(response.state);
}

function bindDynamicButtons(root = document) {
  root.querySelectorAll(".edit-template").forEach((button) => button.addEventListener("click", () => editTemplate(button.dataset.id)));
  root.querySelectorAll(".delete-template").forEach((button) => button.addEventListener("click", () => deleteTemplate(button.dataset.id)));
  root.querySelectorAll(".complete-task").forEach((button) => button.addEventListener("click", () => openComplete(button.dataset.id)));
  root.querySelectorAll(".verify-task").forEach((button) => button.addEventListener("click", () => patchAssignment(button.dataset.id, "verify")));
  root.querySelectorAll(".reject-task").forEach((button) => button.addEventListener("click", () => patchAssignment(button.dataset.id, "reject", { rejectionNote: prompt("Motivo:") || "" })));
  root.querySelectorAll(".delete-assignment").forEach((button) => button.addEventListener("click", () => deleteAssignment(button.dataset.id)));
}

async function toggleTaskModule() {
  const enabled = !appState?.taskModule?.enabled;
  const response = await apiRequest("/api/task-module", {
    method: "PATCH",
    body: JSON.stringify({ enabled, reminderMinutesBefore: 30 })
  });
  applyState(response.state);
}

async function generateTasks() {
  if (!appState?.taskModule?.enabled) {
    alert("Prima attiva il mansionario.");
    return;
  }
  const response = await apiRequest("/api/task-assignments/generate", {
    method: "POST",
    body: JSON.stringify({ weekOffset: selectedWeekOffset })
  });
  applyState(response.state);
  const created = Number(response.createdTasks) || 0;
  alert(created ? `${created} mansioni generate dalla ricorrenza.` : "Nessuna nuova mansione generata per questa settimana.");
}

function moveWeek(delta) {
  selectedWeekOffset += delta;
  render();
}

async function login() {
  setError("#loginError", "");
  const button = document.querySelector("#loginButton");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Accesso...";
  try {
    const payload = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({
        role: document.querySelector("#loginRole").value,
        employeeId: document.querySelector("#loginEmployee").value,
        password: document.querySelector("#loginPassword").value
      })
    });
    currentUser = payload.user;
    await loadState();
  } catch (error) {
    setError("#loginError", error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function logout() {
  await apiRequest("/api/logout", { method: "POST" });
  currentUser = null;
  appState = { employees: appState?.employees || [] };
  render();
}

async function init() {
  selectedWeekOffset = weekOffsetForDate(new Date());
  await loadLoginEmployees();
  updateLoginEmployeeVisibility();
  try {
    const session = await apiRequest("/api/session");
    currentUser = session.user || null;
    if (currentUser) await loadState();
  } catch {
    render();
  }
}

function updateLoginEmployeeVisibility() {
  const role = document.querySelector("#loginRole").value;
  document.querySelector("#loginEmployeeWrap").classList.toggle("hidden", role === "manager");
}

document.querySelector("#loginRole").addEventListener("change", () => {
  updateLoginEmployeeVisibility();
});
document.querySelector("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  login();
});
document.querySelector("#logoutButton").addEventListener("click", logout);
document.querySelector("#enableModuleButton").addEventListener("click", toggleTaskModule);
document.querySelector("#generateButton").addEventListener("click", generateTasks);
document.querySelector("#previousWeekButton").addEventListener("click", () => moveWeek(-1));
document.querySelector("#nextWeekButton").addEventListener("click", () => moveWeek(1));
document.querySelector("#saveTemplate").addEventListener("click", saveTemplate);
document.querySelector("#cancelTemplateEdit").addEventListener("click", resetTemplateForm);
document.querySelector("#cancelComplete").addEventListener("click", () => document.querySelector("#completeDialog").close());
document.querySelector("#completeDialog form").addEventListener("submit", completeTask);

init();
