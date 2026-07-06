import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
const fields = form.getFields();

console.log(`Anzahl Felder: ${fields.length}`);
for (const f of fields) {
  console.log(`${f.constructor.name.padEnd(20)} | ${f.getName()}`);
}
