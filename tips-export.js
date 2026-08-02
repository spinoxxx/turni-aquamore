const MAX_TIP_EXPORT_ROWS = 500;

function cleanText(value, fallback = "", maxLength = 160) {
  return String(value || fallback).trim().slice(0, maxLength) || fallback;
}

function allocateTipCents(total, rows) {
  const cents = Math.max(0, Math.round((Number(total) || 0) * 100));
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const allocations = rows.map(() => 0);
  if (!cents || totalHours <= 0 || !rows.length) return allocations;
  const shares = rows.map((row, index) => {
    const exact = cents * row.hours / totalHours;
    return { index, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = cents - shares.reduce((sum, share) => sum + share.cents, 0);
  shares.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) shares[index % shares.length].cents += 1;
  shares.forEach((share) => { allocations[share.index] = share.cents; });
  return allocations;
}

function normalizeTipsExportPayload(body = {}) {
  const month = /^\d{4}-\d{2}$/.test(String(body.month || "")) ? String(body.month) : "";
  if (!month) throw new Error("Mese del prospetto non valido.");
  const cashTotal = Number(body.cashTotal);
  const posTotal = Number(body.posTotal);
  if (!Number.isFinite(cashTotal) || cashTotal < 0 || !Number.isFinite(posTotal) || posTotal < 0) {
    throw new Error("Inserisci importi validi per contanti e POS.");
  }
  if (!Array.isArray(body.rows) || body.rows.length > MAX_TIP_EXPORT_ROWS) {
    throw new Error(`Il prospetto puo contenere al massimo ${MAX_TIP_EXPORT_ROWS} dipendenti.`);
  }
  const rows = body.rows.map((row, index) => {
    const hours = Number(row?.hours);
    const baseHours = Number(row?.baseHours);
    if (!Number.isFinite(hours) || hours < 0) throw new Error(`Ore non valide alla riga ${index + 1}.`);
    return {
      employeeName: cleanText(row?.employeeName, `Dipendente ${index + 1}`),
      hours,
      baseHours: Number.isFinite(baseHours) && baseHours >= 0 ? baseHours : hours,
      archived: Boolean(row?.archived)
    };
  });
  return {
    month,
    language: body.language === "en" ? "en" : "it",
    companyName: cleanText(body.companyName, "Turni Ristorante"),
    cashTotal,
    posTotal,
    rows
  };
}

function tipsExportModel(body = {}) {
  const data = normalizeTipsExportPayload(body);
  const totalHours = data.rows.reduce((sum, row) => sum + row.hours, 0);
  const cashAllocations = allocateTipCents(data.cashTotal, data.rows);
  const posAllocations = allocateTipCents(data.posTotal, data.rows);
  const rows = data.rows.map((row, index) => {
    const cashCents = cashAllocations[index] || 0;
    const posCents = posAllocations[index] || 0;
    return {
      ...row,
      percentage: totalHours > 0 ? row.hours / totalHours : 0,
      cash: cashCents / 100,
      pos: posCents / 100,
      total: (cashCents + posCents) / 100
    };
  });
  return {
    ...data,
    totalHours,
    totalTips: data.cashTotal + data.posTotal,
    participatingEmployees: rows.filter((row) => row.hours > 0).length,
    rows
  };
}

function tipsLabels(language) {
  return language === "en" ? {
    title: "EMPLOYEE TIPS REPORT",
    company: "Business",
    month: "Month",
    generated: "Generated",
    summary: "SUMMARY",
    cash: "Cash tips",
    pos: "Card tips",
    totalTips: "Total tips",
    totalHours: "Total hours",
    employees: "Employees with hours",
    employee: "Employee",
    hours: "Hours worked",
    percentage: "Percentage",
    total: "Total",
    archived: "Former employee",
    sheet: "Tips report"
  } : {
    title: "PROSPETTO MANCE DIPENDENTI",
    company: "Attivita",
    month: "Mese",
    generated: "Generato il",
    summary: "RIEPILOGO",
    cash: "Mance contanti",
    pos: "Mance POS",
    totalTips: "Mance totali",
    totalHours: "Ore totali",
    employees: "Dipendenti con ore",
    employee: "Dipendente",
    hours: "Ore lavorate",
    percentage: "Percentuale",
    total: "Totale",
    archived: "Dipendente storico",
    sheet: "Prospetto mance"
  };
}

function createTipsWorkbook(xlsx, body = {}, generatedAt = new Date()) {
  if (!xlsx?.utils?.aoa_to_sheet || !xlsx?.utils?.book_new || !xlsx?.utils?.book_append_sheet) {
    throw new Error("Libreria Excel non disponibile.");
  }
  const model = tipsExportModel(body);
  const labels = tipsLabels(model.language);
  const locale = model.language === "en" ? "en-GB" : "it-IT";
  const monthDate = new Date(`${model.month}-01T12:00:00Z`);
  const monthLabel = monthDate.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const generatedDate = new Date(generatedAt);
  const values = [
    [labels.title, "", "", "", "", ""],
    [labels.company, model.companyName, "", "", "", ""],
    [labels.month, monthLabel, "", "", "", ""],
    [labels.generated, generatedDate, "", "", "", ""],
    ["", "", "", "", "", ""],
    [labels.summary, "", "", "", "", ""],
    [labels.cash, model.cashTotal, "", "", "", ""],
    [labels.pos, model.posTotal, "", "", "", ""],
    [labels.totalTips, model.totalTips, "", "", "", ""],
    [labels.totalHours, model.totalHours, "", "", "", ""],
    [labels.employees, model.participatingEmployees, "", "", "", ""],
    ["", "", "", "", "", ""],
    [labels.employee, labels.hours, labels.percentage, labels.cash, labels.pos, labels.total],
    ...model.rows.map((row) => [
      `${row.employeeName}${row.archived ? ` (${labels.archived})` : ""}`,
      row.hours,
      row.percentage,
      row.cash,
      row.pos,
      row.total
    ]),
    [labels.total, model.totalHours, model.totalHours > 0 ? 1 : 0, model.cashTotal, model.posTotal, model.totalTips]
  ];
  const worksheet = xlsx.utils.aoa_to_sheet(values, { cellDates: true });
  const firstDataRow = 14;
  const lastDataRow = firstDataRow + model.rows.length - 1;
  const totalRow = Math.max(firstDataRow, lastDataRow + 1);
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }
  ];
  worksheet["!cols"] = [
    { wch: 34 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }
  ];
  worksheet["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 8 }, { hpt: 22 }];
  worksheet["!autofilter"] = { ref: `A13:F${Math.max(13, lastDataRow)}` };
  worksheet["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

  ["B7", "B8", "B9"].forEach((address) => { if (worksheet[address]) worksheet[address].z = '€ #,##0.00'; });
  if (worksheet.B4) worksheet.B4.z = "dd/mm/yyyy hh:mm";
  if (worksheet.B10) worksheet.B10.z = "0.00";
  if (worksheet.B11) worksheet.B11.z = "0";
  for (let row = firstDataRow; row <= totalRow; row += 1) {
    if (worksheet[`B${row}`]) worksheet[`B${row}`].z = "0.00";
    if (worksheet[`C${row}`]) worksheet[`C${row}`].z = "0.00%";
    ["D", "E", "F"].forEach((column) => {
      if (worksheet[`${column}${row}`]) worksheet[`${column}${row}`].z = '€ #,##0.00';
    });
  }
  if (worksheet.A1) worksheet.A1.s = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "163A5F" } }, alignment: { horizontal: "center" } };
  if (worksheet.A6) worksheet.A6.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1D6F78" } } };
  for (let column = 0; column < 6; column += 1) {
    const header = worksheet[xlsx.utils.encode_cell({ r: 12, c: column })];
    if (header) header.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1D6F78" } }, alignment: { horizontal: column ? "right" : "left" } };
    const total = worksheet[xlsx.utils.encode_cell({ r: totalRow - 1, c: column })];
    if (total) total.s = { font: { bold: true }, fill: { fgColor: { rgb: "E8F3F4" } } };
  }

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, labels.sheet);
  workbook.Props = {
    Title: labels.title,
    Subject: `${model.companyName} - ${model.month}`,
    Author: "Turni Ristorante",
    CreatedDate: generatedDate
  };
  return { workbook, model, sheetName: labels.sheet };
}

function createTipsWorkbookBuffer(xlsx, body = {}, generatedAt = new Date()) {
  const { workbook } = createTipsWorkbook(xlsx, body, generatedAt);
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx", cellStyles: true, compression: true });
}

module.exports = {
  MAX_TIP_EXPORT_ROWS,
  allocateTipCents,
  createTipsWorkbook,
  createTipsWorkbookBuffer,
  normalizeTipsExportPayload,
  tipsExportModel,
  tipsLabels
};
