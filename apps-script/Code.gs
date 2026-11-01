// Thin layer between the web app and the Sheet. All the RSVP rules are in
// Core.gs; this file only reads and writes tabs. Checked by hand (see SETUP.md).

const GUESTS_TAB = 'Guests';
const RESPONSES_TAB = 'Responses';
const LOG_TAB = 'Log';

// Run once from the Apps Script editor to create the tabs and headers.
function setupSheet() {
  ensureTab(GUESTS_TAB, ['Household', 'Full name', 'Alias']);
  ensureTab(RESPONSES_TAB, [
    'Household',
    'Person',
    'Status',
    'Dietary',
    'Household note',
    'Email',
    'Last updated',
  ]);
  ensureTab(LOG_TAB, ['Timestamp', 'Household', 'Person', 'Status', 'Dietary', 'Household note', 'Email']);
}

function ensureTab(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// The site posts everything, with a text/plain body so the browser skips the
// CORS preflight Apps Script cannot answer. Guest names stay out of URLs.
function doPost(e) {
  let request;
  try {
    request = JSON.parse(e.postData.contents);
  } catch (error) {
    return jsonResponse({ ok: false, error: 'Bad request.' });
  }

  if (request && request.action === 'lookup') {
    return jsonResponse(lookup(request.name, readRows(GUESTS_TAB), readRows(RESPONSES_TAB)));
  }
  if (request && request.action === 'submit') {
    return jsonResponse(saveSubmission(request));
  }
  return jsonResponse({ ok: false, error: 'Bad request.' });
}

function saveSubmission(request) {
  // Responses is rewritten whole, so two households saving at once must queue.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const outcome = submit(request, readRows(GUESTS_TAB), readRows(RESPONSES_TAB), now);
    if (outcome.result.ok) {
      // Log first: if a write fails, history must not be what's missing.
      appendLog(outcome.logRows);
      writeResponses(outcome.responses);
    }
    return outcome.result;
  } finally {
    lock.releaseLock();
  }
}

function readRows(tab) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab).getDataRange().getValues().slice(1);
}

function writeResponses(rows) {
  // Sliced so a column the couple add to the right of the tab is left alone.
  const responseRows = rows.map(function (row) {
    return row.slice(0, RESPONSE.UPDATED + 1);
  });
  setAsText(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESPONSES_TAB), 2, responseRows);
}

function appendLog(rows) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_TAB);
  setAsText(sheet, sheet.getLastRow() + 1, rows);
}

// Plain-text format first, so a guest typing "=SUM(..." can't plant a formula.
function setAsText(sheet, firstRow, rows) {
  // getRange throws past the sheet's last row, and new tabs stop at 1000.
  const shortBy = firstRow + rows.length - 1 - sheet.getMaxRows();
  if (shortBy > 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), shortBy);
  }
  sheet.getRange(firstRow, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows);
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
