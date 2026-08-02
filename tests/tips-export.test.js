const assert = require("node:assert/strict");
const {
  allocateTipCents,
  createTipsWorkbook,
  createTipsWorkbookBuffer,
  normalizeTipsExportPayload,
  tipsExportModel,
  tipsLabels
} = require("../tips-export");

const rows = [
  { employeeName: "Anna", hours: 10, baseHours: 10, archived: false },
  { employeeName: "Bruno", hours: 20, baseHours: 18, archived: false },
  { employeeName: "Carla", hours: 30, baseHours: 30, archived: true }
];
const model = tipsExportModel({
  month: "2026-08",
  language: "it",
  companyName: "Locale Test",
  cashTotal: 100,
  posTotal: 50,
  rows
});

assert.equal(model.totalHours, 60);
assert.equal(model.totalTips, 150);
assert.equal(model.participatingEmployees, 3);
assert.equal(model.rows.reduce((sum, row) => sum + Math.round(row.cash * 100), 0), 10000);
assert.equal(model.rows.reduce((sum, row) => sum + Math.round(row.pos * 100), 0), 5000);
assert.equal(model.rows.reduce((sum, row) => sum + Math.round(row.total * 100), 0), 15000);
assert.equal(model.rows[0].percentage, 1 / 6);
assert.deepEqual(allocateTipCents(0.02, [{ hours: 1 }, { hours: 1 }, { hours: 1 }]), [1, 1, 0]);
assert.equal(tipsLabels("en").employee, "Employee");
assert.equal(tipsLabels("it").employee, "Dipendente");
assert.throws(() => normalizeTipsExportPayload({ month: "agosto", cashTotal: 1, posTotal: 1, rows: [] }), /Mese/);
assert.throws(() => normalizeTipsExportPayload({ month: "2026-08", cashTotal: -1, posTotal: 1, rows: [] }), /importi/);
assert.throws(() => normalizeTipsExportPayload({ month: "2026-08", cashTotal: 1, posTotal: 1, rows: [{ hours: -1 }] }), /Ore/);

function encodeCell({ r, c }) {
  let column = "";
  for (let value = c + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    column = String.fromCharCode(65 + ((value - 1) % 26)) + column;
  }
  return `${column}${r + 1}`;
}

const fakeXlsx = {
  utils: {
    encode_cell: encodeCell,
    aoa_to_sheet(values) {
      const sheet = {};
      values.forEach((row, r) => row.forEach((value, c) => {
        if (value !== "") sheet[encodeCell({ r, c })] = { v: value };
      }));
      sheet["!ref"] = `A1:${encodeCell({ r: values.length - 1, c: values[0].length - 1 })}`;
      return sheet;
    },
    book_new() { return { SheetNames: [], Sheets: {} }; },
    book_append_sheet(workbook, worksheet, name) {
      workbook.SheetNames.push(name);
      workbook.Sheets[name] = worksheet;
    }
  }
};

const built = createTipsWorkbook(fakeXlsx, {
  month: "2026-08",
  language: "en",
  companyName: "Test Restaurant",
  cashTotal: 100,
  posTotal: 50,
  rows
}, new Date("2026-08-31T12:00:00.000Z"));
const sheet = built.workbook.Sheets["Tips report"];
assert.equal(sheet.A1.v, "EMPLOYEE TIPS REPORT");
assert.equal(sheet.A13.v, "Employee");
assert.equal(sheet.A14.v, "Anna");
assert.equal(sheet.A16.v, "Carla (Former employee)");
assert.equal(sheet.A17.v, "Total");
assert.equal(sheet.F17.v, 150);
assert.equal(sheet.C14.z, "0.00%");
assert.equal(sheet.F17.z, "€ #,##0.00");
assert.equal(sheet["!autofilter"].ref, "A13:F16");

try {
  const xlsx = require("xlsx");
  const buffer = createTipsWorkbookBuffer(xlsx, {
    month: "2026-08",
    language: "it",
    companyName: "Locale Test",
    cashTotal: 100,
    posTotal: 50,
    rows
  }, new Date("2026-08-31T12:00:00.000Z"));
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
  const parsed = xlsx.read(buffer, { type: "buffer", cellDates: true, cellNF: true });
  const parsedSheet = parsed.Sheets["Prospetto mance"];
  assert.equal(parsedSheet.A1.v, "PROSPETTO MANCE DIPENDENTI");
  assert.equal(parsedSheet.F17.v, 150);
  assert.equal(parsedSheet.B4.z, "dd/mm/yyyy hh:mm");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
}

console.log("Tips export tests passed");
