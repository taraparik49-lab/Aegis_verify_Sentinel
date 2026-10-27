import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export async function extractPdfText(file: File): Promise<{
  pageCount: number;
  pages: ExtractedPdfPage[];
}> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pages: ExtractedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber, text });
  }

  return { pageCount: pdf.numPages, pages };
}
