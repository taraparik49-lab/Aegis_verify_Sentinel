import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoWorkspace,
  appendAudit,
  verifyAuditChain,
} from "./model.ts";
import { evaluateDossier, validateUploadFile, MAX_UPLOAD_BYTES } from "./engine.ts";
import {
  buildDossierReport,
  buildFindingsCsv,
  createPdfDocument,
} from "./report.ts";

test("validates supported uploads, empty files, unsupported types, and size limits", () => {
  assert.equal(validateUploadFile({ type: "application/pdf", size: 1024 }), null);
  assert.match(
    validateUploadFile({ type: "text/plain", size: 1024 }) ?? "",
    /Unsupported/,
  );
  assert.match(
    validateUploadFile({ type: "image/png", size: 0 }) ?? "",
    /empty/,
  );
  assert.match(
    validateUploadFile({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 }) ?? "",
    /12 MB/,
  );
});

test("demo scenarios distinguish missing, consistent, conflicting, and uncertain evidence", () => {
  const workspace = createDemoWorkspace();
  const get = (id: string) => {
    const application = workspace.applications.find((item) => item.id === id);
    assert.ok(application, `Expected demo scenario ${id}`);
    return evaluateDossier(application, workspace.rules);
  };

  assert.equal(get("AEG-A").status, "CONSISTENT_UNVERIFIED");
  assert.equal(get("AEG-B").status, "MISSING_EVIDENCE");
  assert.equal(get("AEG-C").status, "INCONSISTENT");
  assert.deepEqual(
    new Set(get("AEG-C").conflictingEvidenceIds),
    new Set(["C-id", "C-auth"]),
  );
  assert.equal(get("AEG-D").status, "NEEDS_HUMAN_REVIEW");
  const offlineScenario = workspace.applications.find((item) => item.id === "AEG-E");
  const anomalyScenario = workspace.applications.find((item) => item.id === "AEG-F");
  assert.equal(offlineScenario?.findings[0].status, "UNABLE_TO_VERIFY");
  assert.equal(anomalyScenario?.findings[0].status, "POTENTIALLY_SUSPICIOUS");
  assert.notEqual(get("AEG-A").status, "VERIFIED");
});

test("uncertainty, provider failure, contradiction, and anomaly fixtures are queued for review", () => {
  const workspace = createDemoWorkspace();
  const openFindingIds = new Set(
    workspace.reviews
      .filter((review) => review.reviewStatus === "Open")
      .map((review) => review.findingId),
  );
  for (const id of ["AEG-C", "AEG-D", "AEG-E", "AEG-F"]) {
    const application = workspace.applications.find((item) => item.id === id);
    assert.ok(application);
    assert.ok(openFindingIds.has(application.findings[0].id));
  }
});

test("new evaluations use the active rule version without rewriting prior findings", () => {
  const workspace = createDemoWorkspace();
  const application = workspace.applications.find((item) => item.id === "AEG-H");
  assert.ok(application);
  const priorVersion = application.findings[0].ruleVersion;
  const updatedRules = workspace.rules.map((rule) =>
    rule.id === "SYN-01" ? { ...rule, version: "2.0" } : rule,
  );

  assert.equal(evaluateDossier(application, updatedRules).rule.version, "2.0");
  assert.equal(application.findings[0].ruleVersion, priorVersion);
});

test("audit chain links events and detects an edited record", () => {
  const first = appendAudit(createDemoWorkspace(), {
    actorId: "Test reviewer",
    eventType: "TEST_CREATED",
    entityType: "Application",
    entityId: "AEG-A",
    reason: "Test event",
  });
  const second = appendAudit(first, {
    actorId: "Test reviewer",
    eventType: "TEST_UPDATED",
    entityType: "Application",
    entityId: "AEG-A",
    reason: "Second test event",
  });

  assert.equal(verifyAuditChain(second.audit), true);
  const [firstEvent, ...remaining] = second.audit;
  assert.equal(
    verifyAuditChain([{ ...firstEvent, reason: "Edited" }, ...remaining]),
    false,
  );
});

test("reports include rule, evidence, review, and audit limitations", () => {
  const workspace = createDemoWorkspace();
  const application = workspace.applications.find((item) => item.id === "AEG-C");
  assert.ok(application);
  const report = buildDossierReport(
    application,
    workspace.rules,
    workspace.reviews,
    workspace.audit,
    "2026-01-02T00:00:00.000Z",
  ).join("\n");

  assert.match(report, /FICTIONAL \/ DEMONSTRATION RECORD/);
  assert.match(report, /FINDINGS & RULE TRACEABILITY/);
  assert.match(report, /SYN-01 version 1\.0/);
  assert.match(report, /Conflicting evidence: C_authorization_record\.pdf/);
  assert.match(report, /No official requirements/);
});

test("PDF and CSV exports escape data and preserve long reports", () => {
  const pdf = createPdfDocument([
    "Title (escaped)",
    ...Array.from({ length: 48 }, (_, index) => `Report row ${index + 1}`),
  ]);
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /\/Count 2/);
  assert.match(pdf, /\\\(escaped\\\)/);
  assert.match(pdf, /startxref/);

  const workspace = createDemoWorkspace();
  const application = workspace.applications.find((item) => item.id === "AEG-A");
  assert.ok(application);
  const csv = buildFindingsCsv([
    { ...application.findings[0], explanation: 'Review "this", please' },
  ]);
  assert.match(csv, /"Review ""this"", please"/);
  assert.match(csv, /reviewer_disposition/);
});
