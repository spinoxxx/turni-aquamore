const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const xlsx = require("xlsx");
const { PDFDocument, StandardFonts } = require("pdf-lib");

async function main() {
  // Exercise the public APIs used by the app without sending a real email.
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const mail = await transport.sendMail({
    from: '"Locale Test" <sender@example.invalid>',
    to: "recipient@example.invalid",
    subject: "Prova notifiche",
    text: "Notifica di prova",
    html: "<p>Notifica di prova</p>"
  });
  assert.deepEqual(mail.envelope.to, ["recipient@example.invalid"]);
  assert.ok(Buffer.isBuffer(mail.message));
  assert.match(mail.message.toString(), /multipart\/alternative/);

  const rows = [["Dipendente", "Ore"], ["Anna", 8]];
  for (const bookType of ["xlsx", "xls"]) {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), "Presenze");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType });
    const parsed = xlsx.read(buffer, { type: "buffer", cellDates: true });
    const values = xlsx.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]], {
      header: 1, blankrows: false, raw: false
    });
    assert.deepEqual(values, [["Dipendente", "Ore"], ["Anna", "8"]]);
  }

  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.Helvetica);
  source.addPage().drawText("Cedolino test ottobre 2026", { font, size: 12 });
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await source.save()), disableWorker: true, useSystemFonts: true
  });
  const document = await loadingTask.promise;
  try {
    const content = await (await document.getPage(1)).getTextContent();
    assert.match(content.items.map((item) => item.str || "").join(" "), /Cedolino test ottobre 2026/);
  } finally {
    await loadingTask.destroy();
  }
  console.log("Security dependency compatibility tests passed (email, XLS/XLSX, PDF)");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
