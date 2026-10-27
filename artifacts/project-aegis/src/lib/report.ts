import type { Application, AuditEvent, Finding, ReviewCase, Rule } from "./model.ts";

const printable = (value: string) =>
  value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?");

export function buildDossierReport(
  application: Application,
  rules: Rule[],
  reviews: ReviewCase[],
  audit: AuditEvent[],
  generatedAt = new Date().toISOString(),
): string[] {
  const recordLabel =
    application.demoOrReal === "DEMO"
      ? "FICTIONAL / DEMONSTRATION RECORD"
      : "LOCAL BROWSER DOSSIER";
  const applicationFindingIds = new Set(
    application.findings.map((finding) => finding.id),
  );
  const reviewCases = reviews.filter((review) =>
    applicationFindingIds.has(review.findingId),
  );
  const relatedIds = new Set([
    application.id,
    ...application.documents.map((document) => document.id),
    ...application.findings.map((finding) => finding.id),
    ...application.findings.map((finding) => finding.ruleId),
    ...reviewCases.map((review) => review.id),
  ]);
  const relatedEvents = audit.filter((event) => relatedIds.has(event.entityId));
  const evidenceName = (id: string) =>
    application.documents.find((document) => document.id === id)?.filename ?? id;

  return [
    "PROJECT AEGIS — LOCAL DOSSIER REPORT",
    recordLabel,
    `${application.institutionName} · ${application.id}`,
    `Generated: ${generatedAt}`,
    `Created: ${application.createdAt}`,
    `Current status: ${application.status}`,
    `Documents processed: ${application.documents.length}`,
    `Requirements evaluated: ${application.findings.length}`,
    "LIMITATION: This local demonstration does not make an approval decision or establish document authenticity.",
    "",
    "SOURCE DOCUMENTS & CLAIMS",
    ...application.documents.flatMap((document) => [
      `Document: ${document.filename}`,
      `Classification: ${document.classification} · ${document.processingStatus}`,
      `SHA-256: ${document.contentHash} · identifies these bytes only; not issuer proof`,
      ...document.claims.map(
        (claim) =>
          `${claim.fieldName}: ${claim.originalValue}${claim.correctedValue ? ` (reviewer correction: ${claim.correctedValue})` : ""} · page ${claim.pageNumber ?? "unknown"} · ${claim.extractionMethod} · heuristic text-readability indicator ${Math.round(claim.extractionConfidence * 100)}% (uncalibrated)`,
      ),
      "",
    ]),
    "FINDINGS & RULE TRACEABILITY",
    ...application.findings.flatMap((finding) => {
      const rule = rules.find((item) => item.id === finding.ruleId);
      return [
        `${finding.status} · ${rule?.title ?? finding.ruleId} · ${finding.ruleId} version ${finding.ruleVersion}`,
        `Source class: ${rule?.publicationStatus ?? "Unavailable"} · ${rule?.sourceReference ?? "No source reference"}`,
        `Effective date: ${rule?.effectiveDate ?? "Not specified"}`,
        `Configured rule text: ${rule?.clauseText ?? "Rule text unavailable"}`,
        finding.explanation,
        `Verification method: ${finding.verificationMethod}`,
        `Next action: ${finding.recommendedAction}`,
        `Supporting evidence: ${finding.supportingEvidenceIds.map(evidenceName).join(", ") || "None"}`,
        `Conflicting evidence: ${finding.conflictingEvidenceIds.map(evidenceName).join(", ") || "None"}`,
        `Reviewer disposition: ${finding.reviewerDisposition ?? "No disposition recorded"}`,
        "",
      ];
    }),
    "REVIEW ACTIONS",
    ...(reviewCases.length
      ? reviewCases.flatMap((review) => [
          `${review.reviewStatus} · assigned ${review.assignedRole} · ${review.resolution ?? "No disposition recorded"}`,
          `Reason: ${review.escalationReason}`,
          `Reviewer notes: ${review.reviewerNotes || "None"}`,
          `Request: ${review.request || "None"}`,
          "",
        ])
      : ["No review cases recorded.", ""]),
    `AUDIT SUMMARY: ${relatedEvents.length} related event(s) in the local append-only history.`,
    ...relatedEvents.map(
      (event) =>
        `${event.timestamp} · ${event.eventType} · ${event.reason || "No reason recorded"}`,
    ),
    "",
    `DISCLAIMER: ${recordLabel}. Synthetic local demonstration only. No official requirements, live verification, calibrated authenticity probability, or approval decision.`,
  ].map(printable);
}

function wrapLine(line: string, width: number): string[] {
  if (line.length <= width) return [line];
  const words = line.split(/\s+/);
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > width) {
      if (current) result.push(current);
      current = "";
      for (let start = 0; start < word.length; start += width) {
        result.push(word.slice(start, start + width));
      }
      continue;
    }
    if (current && current.length + word.length + 1 > width) {
      result.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) result.push(current);
  return result;
}

export function createPdfDocument(lines: string[]): string {
  const printableLines = lines
    .flatMap((line) => wrapLine(printable(line), 92))
    .map((line) => line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"));
  const pages: string[][] = [];
  for (let start = 0; start < printableLines.length; start += 47) {
    pages.push(printableLines.slice(start, start + 47));
  }
  if (!pages.length) pages.push([]);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    let stream = "BT\n/F1 10 Tf\n48 748 Td\n";
    pageLines.forEach((line, index) => {
      if (index > 0) stream += "0 -15 Td\n";
      stream += `(${line}) Tj\n`;
    });
    stream += "ET";
    const contentId = objects.length + 1;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = objects.length + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function downloadFile(name: string, content: string, type: string) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([content], { type }));
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

export function downloadPdf(name: string, lines: string[]) {
  downloadFile(name, createPdfDocument(lines), "application/pdf");
}

function quoteCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildFindingsCsv(findings: Finding[]) {
  const rows = [
    [
      "finding_id",
      "rule_id",
      "rule_version",
      "status",
      "explanation",
      "recommended_action",
      "supporting_document_ids",
      "conflicting_document_ids",
      "reviewer_disposition",
    ],
    ...findings.map((finding) => [
      finding.id,
      finding.ruleId,
      finding.ruleVersion,
      finding.status,
      finding.explanation,
      finding.recommendedAction,
      finding.supportingEvidenceIds.join("|"),
      finding.conflictingEvidenceIds.join("|"),
      finding.reviewerDisposition ?? "",
    ]),
  ];
  return rows.map((row) => row.map(quoteCsv).join(",")).join("\r\n");
}

export function downloadFindingsCsv(name: string, findings: Finding[]) {
  downloadFile(name, buildFindingsCsv(findings), "text/csv;charset=utf-8");
}
