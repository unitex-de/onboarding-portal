import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";

const bytes = readFileSync("public/Lieferant_Lieferantenstammblatt.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();

for (const name of ["SWIFT Code", "BIC", "Ort Datum", "Unterschrift"]) {
  const field = form.getTextField(name);
  const widgets = field.acroField.getWidgets();
  for (const w of widgets) {
    const r = w.getRectangle();
    console.log(`${name}: x=${r.x.toFixed(1)} y=${r.y.toFixed(1)} width=${r.width.toFixed(1)} height=${r.height.toFixed(1)}`);
  }
}
