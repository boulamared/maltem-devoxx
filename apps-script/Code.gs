/**
 * Maltem @ Devoxx Morocco – booth API (Google Apps Script)
 *
 * The landing page (hosted on GitHub Pages) POSTs JSON here.
 * Resumes are saved to a Google Drive folder; every submission is logged in a Google Sheet.
 */

// ===== CONFIG =====
const FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE'; // Drive folder for resumes + the leads Sheet
const NOTIFY_EMAIL = '';   // optional: gets a short email per submission
const MAX_MB = 10;
// ==================

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png'
];

/** Health check: open the /exec URL in a browser to confirm the deployment works. */
function doGet() {
  return json_({ ok: true, service: 'maltem-devoxx-booth' });
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return json_({ ok: true }); // honeypot: bots fill hidden fields
    if (d.type === 'resume') return json_(submitResume_(d));
    if (d.type === 'contact') return json_(submitContact_(d));
    return json_({ ok: false, error: 'Unknown request.' });
  } catch (err) {
    return json_({ ok: false, error: err.message || 'Something went wrong. Please try again.' });
  }
}

/** Run once from the editor: grants permissions and creates the leads Sheet. */
function setup() {
  getSheet_('Candidates');
  getSheet_('Partners');
  Logger.log('Ready. Leads sheet: ' + getSpreadsheet_().getUrl());
}

function submitResume_(d) {
  const name = clean_(d.name, 120), email = clean_(d.email, 160);
  requireContact_(name, email, d.consent);
  if (!d.base64 || ALLOWED_TYPES.indexOf(d.mimeType) === -1) throw new Error('Please attach a PDF, Word or image file.');

  const bytes = Utilities.base64Decode(d.base64);
  if (bytes.length > MAX_MB * 1024 * 1024) throw new Error('This file is over ' + MAX_MB + ' MB. Please send a lighter version.');

  const stamp = Utilities.formatDate(new Date(), 'Africa/Casablanca', 'yyyy-MM-dd HHmm');
  const fileName = (stamp + ' - ' + name + ' - ' + clean_(d.fileName, 80)).replace(/[\\/:*?"<>|]/g, '_');
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, d.mimeType, fileName));

  getSheet_('Candidates').appendRow([
    new Date(), name, email, clean_(d.phone, 40), clean_(d.profile, 60),
    clean_(d.experience, 30), clean_(d.linkedin, 200), file.getUrl()
  ].map(cell_));
  notify_('New resume: ' + name, name + ' (' + email + ')\n' + file.getUrl());
  return { ok: true };
}

function submitContact_(d) {
  const name = clean_(d.name, 120), email = clean_(d.email, 160), company = clean_(d.company, 120);
  requireContact_(name, email, d.consent);
  if (!company) throw new Error('Please add your company.');

  getSheet_('Partners').appendRow([
    new Date(), name, company, clean_(d.role, 120), email,
    clean_(d.phone, 40), clean_(d.topic, 60), clean_(d.message, 2000)
  ].map(cell_));
  notify_('Meeting request: ' + name + ' – ' + company,
          [name, clean_(d.role, 120), company, email, clean_(d.phone, 40), clean_(d.topic, 60), clean_(d.message, 2000)].join('\n'));
  return { ok: true };
}

// ----- helpers -----
function requireContact_(name, email, consent) {
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Please add your name and a valid email.');
  if (!consent) throw new Error('Please accept the data consent to continue.');
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('Devoxx 2026 – Maltem leads');
  DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(FOLDER_ID));
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function getSheet_(name) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = getSpreadsheet_();
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(name === 'Candidates'
        ? ['Date', 'Name', 'Email', 'Phone', 'Profile', 'Experience', 'LinkedIn', 'Resume']
        : ['Date', 'Name', 'Company', 'Role', 'Email', 'Phone', 'Topic', 'Message']);
      sh.setFrozenRows(1);
      const blank = ss.getSheetByName('Sheet1');
      if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
    }
    return sh;
  } finally {
    lock.releaseLock();
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
// keeps a value like "=HYPERLINK(...)" from running as a formula in the Sheet
function cell_(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function notify_(subject, body) { if (NOTIFY_EMAIL) MailApp.sendEmail(NOTIFY_EMAIL, '[Devoxx] ' + subject, body); }
