import { PDFDocument } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
const fields = form.getFields();

console.log("Reihenfolge laut getFields():");
fields.forEach((f, i) => {
  const num = String(i + 1).padStart(2, "0");
  console.log(`${num} -> ${f.getName()}`);
  try {
    form.getTextField(f.getName()).setText(num);
  } catch (err) {
    console.warn(`  (übersprungen, keine Textfeld-Box: ${f.getName()})`);
  }
});

const out = await pdfDoc.save();
writeFileSync("diagnose-nummern.pdf", out);
console.log("Fertig -> diagnose-nummern.pdf");
