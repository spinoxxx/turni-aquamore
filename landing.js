const leadForm = document.querySelector("#leadForm");
const formStatus = document.querySelector("#formStatus");

function setStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = leadForm.querySelector("button[type='submit']");
  const payload = Object.fromEntries(new FormData(leadForm).entries());

  submitButton.disabled = true;
  submitButton.textContent = "Invio in corso...";
  setStatus("Stiamo registrando la richiesta.");

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Non siamo riusciti a inviare la richiesta.");
    }

    leadForm.reset();
    setStatus("Richiesta ricevuta. Ti ricontattiamo per attivare i 2 mesi gratis.", "success");
  } catch (error) {
    setStatus(error.message || "Errore temporaneo. Riprova tra poco.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Richiedi 2 mesi gratis";
  }
});
