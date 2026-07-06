import { PDFDocument, rgb } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const page = pdfDoc.getPages()[0];

// Weißes Rechteck über den Achtung-Text zwischen SWIFT/BIC-Zeile (y~173) und Ort-Datum-Zeile (y~102)
page.drawRectangle({
  x: 55,
  y: 102,
  width: 485,
  height: 71.3,
  color: rgb(1, 1, 1),
});

const out = await pdfDoc.save();
writeFileSync("public/Lieferant_Lieferantenstammblatt.pdf", out);
console.log("Achtung-Text überdeckt und Vorlage überschrieben.");
