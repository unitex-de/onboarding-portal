import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "fs";

const data = new Uint8Array(readFileSync("public/Lieferant_Lieferantenstammblatt.pdf"));
const pdf = await getDocument({ data }).promise;
const page = await pdf.getPage(1);
const content = await page.getTextContent();

for (const item of content.items) {
  if (item.str.includes("Achtung") || item.str.includes("Vielen Dank") || item.str.includes("Handelsregister")) {
    console.log(`"${item.str}" -> x=${item.transform[4].toFixed(1)} y=${item.transform[5].toFixed(1)} height=${item.height.toFixed(1)} width=${item.width.toFixed(1)}`);
  }
}
