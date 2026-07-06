import { PDFDocument } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
const fields = form.getFields();

for (const f of fields) {
  const name = f.getName();
  try {
    form.getTextField(name).setText(name);
  } catch (err) {
    console.warn(`Übersprungen (keine Textfeld, z.B. Checkbox/Signatur): "${name}"`);
  }
}

const out = await pdfDoc.save();
writeFileSync("diagnose-feldpositionen.pdf", out);
console.log("Fertig -> diagnose-feldpositionen.pdf");
