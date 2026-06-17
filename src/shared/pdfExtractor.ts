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
    const positionedItems = textContent.items
      .filter((item): item is any => "str" in item && Boolean(item.str?.trim()))
      .map((item: any) => ({
        text: item.str.trim(),
        x: Array.isArray(item.transform) ? item.transform[4] : 0,
        y: Array.isArray(item.transform) ? Math.round(item.transform[5]) : 0
      }))
      .sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: Array<{ y: number; parts: Array<{ x: number; text: string }> }> = [];
    for (const item of positionedItems) {
      const line = lines.find((entry) => Math.abs(entry.y - item.y) <= 3);
      if (line) {
        line.parts.push({ x: item.x, text: item.text });
      } else {
        lines.push({ y: item.y, parts: [{ x: item.x, text: item.text }] });
      }
    }

    const pageText = lines
      .map((line) =>
        line.parts
          .sort((a, b) => a.x - b.x)
          .map((part) => part.text)
          .join(" ")
      )
      .join("\n");

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
