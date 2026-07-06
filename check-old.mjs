import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";

const bytes = readFileSync("old-template-6559989.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
const fields = form.getFields();
console.log(`Anzahl Felder in Commit 6559989: ${fields.length}`);
console.log(fields.some(f => f.getName() === "Adresse") ? "Enthält schon 'Adresse'-Feld" : "Kein 'Adresse'-Feld -> das ist die Version VOR unseren Änderungen");
