import { fromBuffer } from "pdf2pic";
import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";

const options = {
  density: 100,
  saveFilename: "page",
  savePath: "./images", // all images will go here
  format: "png",
  width: 600,
  height: 600
};



async function extractPDFText(buffer, numPages) {
  const allText = [];
  let Pages = numPages;
  const convert = fromBuffer(buffer, options);

  for (let i = 1; i <= Pages; i++) {
    console.log(`[OCR] Converting page ${i}/${numPages} to image...`);
    
    // This saves the image in ./images
    const result = await convert(i);

    const imagePath = result.path; // path of the saved image
    console.log(`[OCR] Saved image: ${imagePath}`);

    console.log(`[OCR] Running Tesseract on page ${i}...`);
    const { data: { text: ocrText } } = await Tesseract.recognize(imagePath, "eng");

    if (ocrText?.trim()) {
      allText.push(ocrText.trim());
    }

    // Delete image after OCR
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error(`Error deleting image ${imagePath}:`, err);
      } else {
        console.log(`[CLEANUP] Deleted image: ${imagePath}`);
      }
    });
  }

  const finalText = allText.join("\n\n");
  console.log("✅ OCR Complete. Extracted text:");
return finalText;
}

extractPDFText().catch(console.error);

export default extractPDFText;
