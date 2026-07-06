import { PDFDocument } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();

const adresseField = form.getTextField("Adresse");
adresseField.enableMultiline();
adresseField.setFontSize(8);

const out = await pdfDoc.save();
writeFileSync("public/Lieferant_Lieferantenstammblatt.pdf", out);
console.log("Adresse-Feld: mehrzeilig + Schriftgröße 8pt gesetzt.");
