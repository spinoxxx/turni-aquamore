const employeeSelect = document.querySelector("#manualEmployee");
const form = document.querySelector("#manualAttendanceForm");
const statusBox = document.querySelector("#manualStatus");
const submitButton = document.querySelector("#manualSubmit");
const overnightNotice = document.querySelector("#manualOvernightNotice");

function todayInputValue() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function showStatus(message, type = "success") {
  statusBox.textContent = message;
  statusBox.className = `manual-status ${type}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch {
    throw new Error("Connessione al server non riuscita. Riprova tra poco.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Richiesta non inviata");
  return payload;
}

function updateOvernightNotice() {
  const start = normalizeTimeValue(document.querySelector("#manualStart").value);
  const end = normalizeTimeValue(document.querySelector("#manualEnd").value);
  overnightNotice.classList.toggle("hidden", !start || !end || end > start);
}

function normalizeDateValue(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function normalizeTimeValue(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (/[ap]\.?m\.?/.test(clean)) return "";
  const match = clean.match(/^(\d{1,2})(?::|\.)(\d{2})$/) || clean.match(/^(\d{1,2})(\d{2})$/);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function loadEmployees() {
  employeeSelect.innerHTML = '<option value="">Caricamento...</option>';
  try {
    const payload = await apiRequest("/api/login/employees");
    const employees = Array.isArray(payload.employees) ? payload.employees : [];
    employeeSelect.innerHTML = employees
      .map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.name)}</option>`)
      .join("");
  } catch (error) {
    employeeSelect.innerHTML = '<option value="">Dipendenti non disponibili</option>';
    showStatus(error.message || "Dipendenti non disponibili.", "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Invio...";
  statusBox.classList.add("hidden");
  try {
    const date = normalizeDateValue(document.querySelector("#manualDate").value);
    const startTime = normalizeTimeValue(document.querySelector("#manualStart").value);
    const endTime = normalizeTimeValue(document.querySelector("#manualEnd").value);
    if (!date) throw new Error("Inserisci la data in formato italiano: gg/mm/aaaa.");
    if (!startTime || !endTime) throw new Error("Inserisci gli orari in formato 24 ore: 08:30, 14:00, 20:30.");
    const payload = await apiRequest("/api/attendance/manual-request", {
      method: "POST",
      body: JSON.stringify({
        employeeId: employeeSelect.value,
        pin: document.querySelector("#manualPin").value.trim(),
        date,
        startTime,
        endTime,
        note: document.querySelector("#manualNote").value.trim()
      })
    });
    form.reset();
    document.querySelector("#manualDate").value = todayInputValue();
    updateOvernightNotice();
    showStatus(payload.emailSent
      ? "Richiesta inviata. Il manager e stato avvisato via email."
      : "Richiesta inviata. Il manager la vedra in rosso nelle presenze.", "success");
  } catch (error) {
    showStatus(error.message || "Richiesta non inviata.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Invia richiesta";
  }
});

["#manualStart", "#manualEnd"].forEach((selector) => {
  const input = document.querySelector(selector);
  input.addEventListener("input", updateOvernightNotice);
  input.addEventListener("blur", () => {
    const normalized = normalizeTimeValue(input.value);
    if (normalized) input.value = normalized;
    updateOvernightNotice();
  });
});

document.querySelector("#manualDate").value = todayInputValue();
document.querySelector("#manualDate").addEventListener("blur", (event) => {
  const normalized = normalizeDateValue(event.target.value);
  if (normalized) event.target.value = normalized;
});
loadEmployees();
