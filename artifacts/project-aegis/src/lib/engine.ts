import type { Application, FindingStatus, Rule } from "./model.ts";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export function validateUploadFile(file: Pick<File, "type" | "size">): string | null {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return "Unsupported file type. Choose PDF, PNG, JPEG, or WebP.";
  }
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File exceeds the 12 MB per-file limit.";
  }
  return null;
}

export type RuleEvaluation = {
  rule: Rule;
  status: FindingStatus;
  explanation: string;
  supportingEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  recommendedAction: string;
};

export function evaluateDossier(
  application: Pick<Application, "documents">,
  rules: Rule[],
): RuleEvaluation {
  const ruleFor = (id: string, fallbackIndex: number) =>
    rules.find((rule) => rule.id === id) ?? rules[fallbackIndex];
  const documents = application.documents;
  const identityDocs = documents.filter(
    (document) => document.classification === "Institution identity document",
  );
  const authorizationDocs = documents.filter(
    (document) => document.classification === "Authorization document",
  );
  const evidenceIds = documents.map((document) => document.id);
  const missingEvidence =
    identityDocs.length === 0 || authorizationDocs.length === 0;

  if (missingEvidence) {
    return {
      rule: ruleFor("SYN-02", 1),
      status: "MISSING_EVIDENCE",
      explanation:
        "A synthetic identity record and authorization record are required for this comparison. One or both document classifications are absent.",
      supportingEvidenceIds: evidenceIds,
      conflictingEvidenceIds: [],
      recommendedAction: "Request additional evidence",
    };
  }

  const claims = documents.flatMap((document) =>
    document.claims.map((claim) => ({
      ...claim,
      sourceDocumentId: document.id,
      value: (claim.correctedValue ?? claim.normalizedValue).trim().toLowerCase(),
    })),
  );

  if (claims.some((claim) => claim.extractionConfidence < 0.5)) {
    return {
      rule: ruleFor("SYN-03", 2),
      status: "NEEDS_HUMAN_REVIEW",
      explanation:
        "At least one source claim has low extraction confidence. Inspect the original source manually; no OCR or authenticity conclusion is implied.",
      supportingEvidenceIds: evidenceIds,
      conflictingEvidenceIds: [],
      recommendedAction:
        "Inspect the source image and request a clearer copy if needed",
    };
  }

  const claimsByField = new Map<string, typeof claims>();
  for (const claim of claims) {
    const group = claimsByField.get(claim.fieldName) ?? [];
    group.push(claim);
    claimsByField.set(claim.fieldName, group);
  }
  const conflictingClaims = [...claimsByField.values()]
    .filter(
      (group) =>
        new Set(group.map((claim) => claim.value)).size > 1 &&
        new Set(group.map((claim) => claim.sourceDocumentId)).size > 1,
    )
    .flat();

  if (conflictingClaims.length > 0) {
    return {
      rule: ruleFor("SYN-01", 0),
      status: "INCONSISTENT",
      explanation:
        "Source claims for the same field differ across documents. This is a reproducible contradiction, not a conclusion about intent.",
      supportingEvidenceIds: [...new Set(conflictingClaims.map((claim) => claim.sourceDocumentId))],
      conflictingEvidenceIds: [...new Set(conflictingClaims.map((claim) => claim.sourceDocumentId))],
      recommendedAction: "Compare both source documents and record a human review",
    };
  }

  if (claims.length < 2) {
    return {
      rule: ruleFor("SYN-03", 2),
      status: "NEEDS_HUMAN_REVIEW",
      explanation:
        "There are not enough readable extracted claims to compare the required sources. Review both originals; no authenticity conclusion is available.",
      supportingEvidenceIds: evidenceIds,
      conflictingEvidenceIds: [],
      recommendedAction:
        "Inspect the source documents or request clearer evidence",
    };
  }

  return {
    rule: ruleFor("SYN-01", 0),
    status: "CONSISTENT_UNVERIFIED",
    explanation:
      "Available claims are consistent under this synthetic rule. Agreement between documents does not independently authenticate either source.",
    supportingEvidenceIds: evidenceIds,
    conflictingEvidenceIds: [],
    recommendedAction:
      "Keep authenticity unverified unless an authorized independent source is available",
  };
}
