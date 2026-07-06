import { PDFDocument, rgb } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const page = pdfDoc.getPages()[0];

// Achtung-Text: Zeile 1 bei y=132 (bis ~142), Zeile 2 "Vielen Dank!" bei y=118 (bis ~128)
// Rechteck y=110 bis y=150 -> deckt beide Zeilen mit Puffer ab, bleibt aber
// unterhalb der SWIFT/BIC-Feldunterkante (173.3) und oberhalb der
// Ort-Datum-Feldoberkante (102).
page.drawRectangle({
  x: 55,
  y: 110,
  width: 465,
  height: 40,
  color: rgb(1, 1, 1),
});

const out = await pdfDoc.save();
writeFileSync("public/Lieferant_Lieferantenstammblatt.pdf", out);
console.log("Achtung-Text präzise überdeckt.");
