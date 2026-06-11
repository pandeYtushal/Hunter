import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure worker src
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";

    try {
      const annotations = await page.getAnnotations();
      const links = annotations
        .filter((a: any) => a.subtype === "Link" && a.url)
        .map((a: any) => a.url);
      if (links.length > 0) {
        fullText += "\nLinks found on this page:\n" + links.join("\n") + "\n";
      }
    } catch (err) {
      console.warn(`Failed to extract annotations for page ${i}`, err);
    }
  }

  return fullText;
}
