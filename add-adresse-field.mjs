import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
const form = pdfDoc.getForm();
const page = pdfDoc.getPages()[0];

const textField = form.createTextField("Adresse");
textField.addToPage(page, {
  x: 311.8,
  y: 748.9,
  width: 177.4,
  height: 27.0,
});
textField.updateAppearances(font);

const out = await pdfDoc.save();
writeFileSync("public/Lieferant_Lieferantenstammblatt.pdf", out);
console.log("Feld 'Adresse' hinzugefügt und Vorlage überschrieben.");
