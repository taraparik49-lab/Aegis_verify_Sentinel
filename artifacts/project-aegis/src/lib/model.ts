export type FindingStatus = 'VERIFIED' | 'CONSISTENT_UNVERIFIED' | 'INCONSISTENT' | 'MISSING_EVIDENCE' | 'NEEDS_HUMAN_REVIEW' | 'UNABLE_TO_VERIFY' | 'POTENTIALLY_SUSPICIOUS';
export type Claim = { id:string; documentId:string; fieldName:string; originalValue:string; normalizedValue:string; pageNumber:number|null; extractionMethod:string; extractionConfidence:number; correctedValue?:string };
export type DocumentRecord = { id:string; applicationId:string; filename:string; contentHash:string; mimeType:string; pageCount:number|null; classification:string; processingStatus:string; extractionMethod:string; claims:Claim[]; createdAt:string; blobKey?:string };
export type Rule = { id:string; title:string; clauseText:string; sourceReference:string; version:string; effectiveDate?:string; requiredInputs:string[]; evidenceRequirements:string[]; severity:string; publicationStatus:string };
export type Finding = { id:string; applicationId:string; ruleId:string; ruleVersion:string; status:FindingStatus; severity:string; supportingEvidenceIds:string[]; conflictingEvidenceIds:string[]; explanation:string; verificationMethod:string; confidenceMetadata:string; recommendedAction:string; reviewerDisposition?:string; createdAt:string; updatedAt:string };
export type Application = { id:string; institutionName:string; applicationType:string; status:string; createdAt:string; updatedAt:string; demoOrReal:'DEMO'|'LOCAL'; documents:DocumentRecord[]; findings:Finding[]; scenario?:string; statusHistory:{status:string;at:string;reason:string}[] };
export type ReviewCase = { id:string; findingId:string; assignedRole:string; reviewStatus:string; reviewerNotes:string; resolution?:string; escalationReason:string; createdAt:string; updatedAt:string; request?:string };
export type AuditEvent = { id:string; actorId:string; eventType:string; entityType:string; entityId:string; timestamp:string; previousValue?:string; newValue?:string; reason?:string; previousEventHash:string; eventHash:string };
export type Workspace = { applications:Application[]; rules:Rule[]; reviews:ReviewCase[]; audit:AuditEvent[] };

const t = '2025-02-14T09:30:00.000Z';
const syntheticRule = (id:string,title:string,clause:string,inputs:string[],evidence:string[],severity='Review') : Rule => ({id,title,clauseText:clause,sourceReference:'Aegis synthetic demo framework · not an official requirement',version:'1.0',effectiveDate:'2025-01-01',requiredInputs:inputs,evidenceRequirements:evidence,severity,publicationStatus:'SYNTHETIC'});
export const demoRules:Rule[] = [
  syntheticRule('SYN-01','Institution name agreement','Compare the institution name printed on submitted identity and authorization documents. Agreement is not issuer authentication.',['institution_name'],['Institution identity document','Authorization document']),
  syntheticRule('SYN-02','Required document presence','A synthetic dossier should include an institution identity record and a current authorization record.',['document_classification'],['Institution identity document','Authorization document']),
  syntheticRule('SYN-03','Readable source text','Low-confidence text extraction requires a human to inspect the source image.',['extraction_confidence'],['Readable source page']),
  syntheticRule('SYN-04','External source availability','A simulated offline source must remain unresolved; this demo does not contact government services.',['provider_status'],['Local provider response']),
  syntheticRule('SYN-05','Document pattern review','A synthetic pattern flag calls for contextual review and does not establish fraud or authenticity.',['pattern_flag'],['Original source document'])
];
function doc(id:string,appId:string,name:string,cls:string, claims:Partial<Claim>[]=[]):DocumentRecord {
 return {id,applicationId:appId,filename:name,contentHash:`demo-${id}-sha256-reference`,mimeType:'application/pdf',pageCount:2,classification:cls,processingStatus:'Extracted text · demo',extractionMethod:'Synthetic demo claim',createdAt:t,claims:claims.map((c,i)=>({id:`${id}-claim-${i+1}`,documentId:id,fieldName:c.fieldName||'institution_name',originalValue:c.originalValue||'Northstar Institute',normalizedValue:c.normalizedValue||'northstar institute',pageNumber:c.pageNumber??1,extractionMethod:c.extractionMethod||'Demo text extraction',extractionConfidence:c.extractionConfidence??.97,...c}))};
}
function finding(appId:string,ruleId:string,status:FindingStatus,explanation:string,docs:string[],conflicts:string[]=[],action='Review source evidence'):Finding {
 const rule=demoRules.find(r=>r.id===ruleId)!;
 return {id:`${appId}-${ruleId}-v1`,applicationId:appId,ruleId,ruleVersion:rule.version,status,severity:rule.severity,supportingEvidenceIds:docs,conflictingEvidenceIds:conflicts,explanation,verificationMethod:'Deterministic synthetic rule · local evidence only',confidenceMetadata:'No authenticity probability. Extraction confidence describes text readability only.',recommendedAction:action,createdAt:t,updatedAt:t};
}
function application(id:string,institutionName:string,scenario:string,documents:DocumentRecord[],findings:Finding[],status='In review'):Application {
 return {id,institutionName,applicationType:'Institutional authorization',status,createdAt:t,updatedAt:t,demoOrReal:'DEMO',documents,findings,scenario,statusHistory:[{status,at:t,reason:'Fictional scenario initialized for local demonstration'}]};
}
export function createDemoWorkspace():Workspace {
 const a='AEG-A', b='AEG-B', c='AEG-C', d='AEG-D', e='AEG-E', f='AEG-F', g='AEG-G', h='AEG-H';
 const da=doc('A-id',a,'A_identity_record.pdf','Institution identity document',[{originalValue:'Northstar Institute',normalizedValue:'northstar institute'}]), da2=doc('A-auth',a,'A_authorization_record.pdf','Authorization document',[{originalValue:'Northstar Institute',normalizedValue:'northstar institute'}]);
 const cb1=doc('C-id',c,'C_identity_record.pdf','Institution identity document',[{originalValue:'Cedar Vale College',normalizedValue:'cedar vale college'}]);
 const cb2=doc('C-auth',c,'C_authorization_record.pdf','Authorization document',[{originalValue:'Cedar Vale Collegiate',normalizedValue:'cedar vale collegiate'}]);
 const dd=doc('D-scan',d,'D_low_readability_scan.pdf','Institution identity document',[{originalValue:'[unclear scan]',normalizedValue:'',extractionConfidence:.31,extractionMethod:'Low confidence text extraction'}]);
 const apps=[
  application(a,'Northstar Institute','A · matching claims, not authenticated',[da,da2],[finding(a,'SYN-01','CONSISTENT_UNVERIFIED','Both fictional records display a matching institution name. Agreement alone does not verify issuer authenticity.',['A-id','A-auth'],[],'Treat as unverified; inspect source if needed')]),
  application(b,'Meridian Learning Trust','B · required evidence absent',[doc('B-id',b,'B_identity_record.pdf','Institution identity document')],[finding(b,'SYN-02','MISSING_EVIDENCE','The synthetic authorization record is absent from this dossier.',['B-id'],[],'Request the missing authorization record')]),
  application(c,'Cedar Vale College','C · conflicting source claims',[cb1,cb2],[finding(c,'SYN-01','INCONSISTENT','The two extracted institution-name claims differ. This is a document-level contradiction, not a conclusion about intent.',['C-id'],['C-auth'],'Escalated for human comparison')]),
   application(d,'Harbor Point Academy','D · unreadable scan',[dd,doc('D-auth',d,'D_authorization_record.pdf','Authorization document',[{originalValue:'Harbor Point Academy',normalizedValue:'harbor point academy'}])],[finding(d,'SYN-03','NEEDS_HUMAN_REVIEW','Text extraction confidence is low. The page must be inspected manually; no OCR claim is made.',['D-scan'],[],'Inspect the source image and request a clearer copy if needed')]),
  application(e,'Westbridge Skills Center','E · provider unavailable',[doc('E-id',e,'E_local_identity.pdf','Institution identity document')],[finding(e,'SYN-04','UNABLE_TO_VERIFY','A mocked offline provider response is shown. No external service was contacted.',['E-id'],[],'Retry only when a real authorized provider is configured')]),
  application(f,'Juniper Field Institute','F · synthetic anomaly for review',[doc('F-id',f,'F_identity_record.pdf','Institution identity document')],[finding(f,'SYN-05','POTENTIALLY_SUSPICIOUS','A fictional pattern flag is present for demonstration. It does not establish fraud, tampering, or authenticity.',['F-id'],[],'Escalate for contextual human review')]),
  application(g,'Redwood Coast College','G · resubmission history',[doc('G-id',g,'G_identity_record_v1.pdf','Institution identity document')],[finding(g,'SYN-02','MISSING_EVIDENCE','Initial synthetic check recorded a missing authorization document. Prior finding is retained when reprocessed.',['G-id'],[],'Await resubmission')]),
  application(h,'Pinecrest Technical Institute','H · versioned rule history',[doc('H-id',h,'H_identity_record.pdf','Institution identity document',[{originalValue:'Pinecrest Technical Institute',normalizedValue:'pinecrest technical institute'}]),doc('H-auth',h,'H_authorization_record.pdf','Authorization document',[{originalValue:'Pinecrest Technical Institute',normalizedValue:'pinecrest technical institute'}])],[finding(h,'SYN-01','CONSISTENT_UNVERIFIED','Claims agree under synthetic rule version 1.0. That does not verify authenticity.',['H-id','H-auth'],[],'Review the exact rule version')])
 ];
  const reviews:ReviewCase[]=[
   {id:'review-C',findingId:'AEG-C-SYN-01-v1',assignedRole:'Demo Reviewer',reviewStatus:'Open',reviewerNotes:'',escalationReason:'Conflicting institution-name claims across two fictional documents.',createdAt:t,updatedAt:t},
   {id:'review-D',findingId:'AEG-D-SYN-03-v1',assignedRole:'Demo Reviewer',reviewStatus:'Open',reviewerNotes:'',escalationReason:'A required source value is not readable with sufficient reliability.',createdAt:t,updatedAt:t},
   {id:'review-E',findingId:'AEG-E-SYN-04-v1',assignedRole:'Demo Reviewer',reviewStatus:'Open',reviewerNotes:'',escalationReason:'The synthetic external source is unavailable; no live provider was contacted.',createdAt:t,updatedAt:t},
   {id:'review-F',findingId:'AEG-F-SYN-05-v1',assignedRole:'Demo Reviewer',reviewStatus:'Open',reviewerNotes:'',escalationReason:'A fictional document anomaly requires contextual human review and is not proof of fraud.',createdAt:t,updatedAt:t},
  ];
 return {applications:apps,rules:demoRules.map(r=>({...r})),reviews,audit:[]};
}
export function hashText(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
export function appendAudit(ws:Workspace,event:Omit<AuditEvent,'id'|'timestamp'|'previousEventHash'|'eventHash'>):Workspace {
 const previousEventHash=ws.audit.at(-1)?.eventHash||'GENESIS';
 const base={...event,id:`evt-${ws.audit.length+1}`,timestamp:new Date().toISOString(),previousEventHash};
 const eventHash=hashText(JSON.stringify(base));
 return {...ws,audit:[...ws.audit,{...base,eventHash}]};
}
export function verifyAuditChain(events:AuditEvent[]) {
 let previous='GENESIS';
 for(const event of events) {
  const {eventHash,...base}=event;
  if(event.previousEventHash!==previous||hashText(JSON.stringify(base))!==eventHash)return false;
  previous=eventHash;
 }
 return true;
}
export function saveWorkspace(ws:Workspace){localStorage.setItem('aegis.workspace.v1',JSON.stringify(ws));window.dispatchEvent(new Event('aegis-change'))}
export function loadWorkspace():Workspace {
 try {const raw=localStorage.getItem('aegis.workspace.v1');if(raw)return JSON.parse(raw) as Workspace} catch{}
 const seeded=createDemoWorkspace();saveWorkspace(seeded);return seeded;
}
export function addAudit(ws:Workspace,type:string,entityType:string,entityId:string,reason:string,newValue='',previousValue=''):Workspace {
 return appendAudit(ws,{actorId:'Demo Reviewer (local)',eventType:type,entityType,entityId,reason,newValue,previousValue});
}
export async function sha256(file:File){const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function openDocumentDatabase() {
 return new Promise<IDBDatabase>((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('Browser document storage is unavailable'));return}
  const req=indexedDB.open('aegis-local-documents',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('documents'))req.result.createObjectStore('documents')};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Could not open browser document storage'));
 });
}
export async function putBlob(key:string,file:Blob) {
 const db=await openDocumentDatabase();
 return new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('documents','readwrite');
  tx.objectStore('documents').put(file,key);
  tx.oncomplete=()=>{db.close();resolve()};
  tx.onerror=()=>{const error=tx.error||new Error('Could not store the uploaded file');db.close();reject(error)};
  tx.onabort=()=>{const error=tx.error||new Error('The local file write was interrupted');db.close();reject(error)};
 });
}
export async function getBlob(key:string) {
 const db=await openDocumentDatabase();
 return new Promise<Blob|undefined>((resolve,reject)=>{
  const tx=db.transaction('documents','readonly');
  const request=tx.objectStore('documents').get(key);
  request.onsuccess=()=>resolve(request.result as Blob|undefined);
  request.onerror=()=>reject(request.error||new Error('Could not read the stored file'));
  tx.oncomplete=()=>db.close();
  tx.onerror=()=>{db.close();reject(tx.error||new Error('Could not read the stored file'))};
 });
}
export async function removeBlob(key:string) {
 const db=await openDocumentDatabase();
 return new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('documents','readwrite');
  tx.objectStore('documents').delete(key);
  tx.oncomplete=()=>{db.close();resolve()};
  tx.onerror=()=>{const error=tx.error||new Error('Could not remove the stored file');db.close();reject(error)};
 });
}
export async function clearBlobs() {
 const db=await openDocumentDatabase();
 return new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('documents','readwrite');
  tx.objectStore('documents').clear();
  tx.oncomplete=()=>{db.close();resolve()};
  tx.onerror=()=>{const error=tx.error||new Error('Could not clear browser document storage');db.close();reject(error)};
 });
}
