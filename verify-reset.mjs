import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
console.log(`Anzahl Felder: ${form.getFields().length}`);
console.log(form.getFields().some(f => f.getName() === "Adresse") ? "Hat 'Adresse'-Feld (noch NICHT zurückgesetzt)" : "Kein 'Adresse'-Feld (sauber zurückgesetzt)");
