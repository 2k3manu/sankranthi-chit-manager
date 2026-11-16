import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  computeChitFundData,
  INITIAL_ROUND_INPUTS,
  RawRoundInput,
} from './src/data/initialChitData.ts';
import {
  extractSpreadsheetId,
  extractSpreadsheetInfo,
  parseCsv,
  parseSheetRows,
  SheetRowMapping,
} from './src/utils/sheetParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const STATE_FILE = path.resolve(__dirname, '.chit_state.json');

const ALLOWED_ADMINS = [
  '2k3manu@gmail.com',
  'ningaraj1905@gmail.com',
  'mantyamora@gmail.com',
];

const DEFAULT_ROW_MAPPING: SheetRowMapping = {
  primaryWinnerRow: 24,
  primaryAmountRow: 25,
  primaryRemainingRow: 26,
  secondWinnerRow: 27,
  secondAmountRow: 28,
  finalRemainingRow: 29,
  firstRoundColIndex: 2,
};

interface AppState {
  spreadsheetId: string | null;
  spreadsheetName: string;
  sheetName: string;
  sheetGid: number;
  roundInputs: RawRoundInput[];
  customDates?: string[];
  customMembers?: { slNo: number; name: string }[];
  rowMapping?: SheetRowMapping;
  lastSyncedAt: string;
  syncSource: 'google_sheets_oauth' | 'google_sheets_public' | 'cached' | 'initial';
  publicAutoSyncAvailable?: boolean;
  lastSyncError?: string | null;
}

// Load state from file or fallback to initial
function loadState(): AppState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      return {
        spreadsheetId: data.spreadsheetId || null,
        spreadsheetName: data.spreadsheetName || 'Sankranthi Chit',
        sheetName: data.sheetName || 'Sheet1',
        sheetGid: typeof data.sheetGid === 'number' ? data.sheetGid : 0,
        roundInputs: Array.isArray(data.roundInputs) ? data.roundInputs : INITIAL_ROUND_INPUTS,
        customDates: data.customDates,
        customMembers: data.customMembers,
        rowMapping: data.rowMapping || DEFAULT_ROW_MAPPING,
        lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
        syncSource: data.spreadsheetId ? (data.syncSource || 'cached') : 'initial',
        publicAutoSyncAvailable: Boolean(data.publicAutoSyncAvailable),
        lastSyncError: data.lastSyncError || null,
      };
    }
  } catch (e) {
    console.error('Failed to load state file, using initial:', e);
  }
  return {
    spreadsheetId: process.env.GOOGLE_SHEET_ID || null,
    spreadsheetName: 'Sankranthi Chit',
    sheetName: 'Sheet1',
    sheetGid: 0,
    roundInputs: INITIAL_ROUND_INPUTS,
    rowMapping: DEFAULT_ROW_MAPPING,
    lastSyncedAt: new Date().toISOString(),
    syncSource: 'initial',
    publicAutoSyncAvailable: false,
    lastSyncError: null,
  };
}

function saveState(state: AppState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save state file:', e);
  }
}

let appState = loadState();
let lastPublicFetchAttempt = 0;

function getComputedData(isLiveSyncedOverride?: boolean) {
  const isLiveSynced =
    isLiveSyncedOverride !== undefined
      ? isLiveSyncedOverride
      : Boolean(
          appState.spreadsheetId &&
            (appState.syncSource === 'google_sheets_oauth' ||
              appState.syncSource === 'google_sheets_public')
        );

  return computeChitFundData(appState.roundInputs, appState.spreadsheetId, appState.lastSyncedAt, {
    spreadsheetName: appState.spreadsheetName,
    sheetName: appState.sheetName,
    customDates: appState.customDates,
    customMembers: appState.customMembers,
    isLiveSynced,
    publicAutoSyncAvailable: Boolean(appState.publicAutoSyncAvailable),
    syncSource: appState.syncSource,
    syncError: appState.lastSyncError || null,
  });
}

async function verifyGoogleToken(authHeader: string | undefined): Promise<{ email: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
    if (res.ok) {
      const data = await res.json();
      if (data.email) {
        return { email: data.email };
      }
    }
  } catch (e) {
    console.error('Error verifying token with Google:', e);
  }
  return null;
}

/**
 * Attempts a lightweight background sync from Google Sheets raw CSV export
 * when spreadsheetId is known (works automatically with zero login if the sheet
 * is shared as "Anyone with the link can view").
 */
async function tryPublicSheetSync(force = false): Promise<boolean> {
  if (!appState.spreadsheetId) return false;
  const now = Date.now();
  if (!force && now - lastPublicFetchAttempt < 10_000) {
    return false;
  }
  lastPublicFetchAttempt = now;

  try {
    const gid = typeof appState.sheetGid === 'number' ? appState.sheetGid : 0;
    const exportUrl = `https://docs.google.com/spreadsheets/d/${appState.spreadsheetId}/export?format=csv&gid=${gid}`;
    let res = await fetch(exportUrl, {
      redirect: 'follow',
      headers: { 'Cache-Control': 'no-cache' },
    });
    let contentType = res.headers.get('content-type') || '';

    // Fallback to gviz CSV with headers=0 if export endpoint fails
    if (!res.ok || !contentType.includes('csv')) {
      const sheetTab = appState.sheetName || 'Sheet1';
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${appState.spreadsheetId}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(sheetTab)}`;
      res = await fetch(gvizUrl, {
        redirect: 'follow',
        headers: { 'Cache-Control': 'no-cache' },
      });
      contentType = res.headers.get('content-type') || '';
    }

    if (!res.ok || !contentType.includes('csv')) {
      appState.publicAutoSyncAvailable = false;
      return false;
    }

    const csvText = await res.text();
    if (!csvText || csvText.trim().startsWith('<')) {
      appState.publicAutoSyncAvailable = false;
      return false;
    }

    const rows = parseCsv(csvText);
    if (rows.length < 10) return false;

    const parsed = parseSheetRows(rows);
    appState.roundInputs = parsed.roundInputs;
    if (parsed.dates.length > 0) appState.customDates = parsed.dates;
    if (parsed.members.length > 0) appState.customMembers = parsed.members;
    appState.rowMapping = parsed.rowMapping;
    appState.lastSyncedAt = new Date().toISOString();
    appState.syncSource = 'google_sheets_public';
    appState.publicAutoSyncAvailable = true;
    appState.lastSyncError = null;
    saveState(appState);
    return true;
  } catch (err) {
    // Public fetch failed (sheet is private); keep existing synced/cached state
    return false;
  }
}

/**
 * Full authenticated sync using Google Drive & Google Sheets APIs with OAuth Bearer token.
 */
async function syncSpreadsheetWithToken(
  token: string,
  requestedSpreadsheetInput?: string | null
) {
  const parsedInput = extractSpreadsheetInfo(requestedSpreadsheetInput || '');
  let targetSpreadsheetId = parsedInput.spreadsheetId || appState.spreadsheetId;
  let resolvedSheetGid = parsedInput.gid ?? appState.sheetGid ?? 0;

  // 1. Discover spreadsheet in Google Drive if no ID is currently linked
  if (!targetSpreadsheetId) {
    const query = encodeURIComponent(
      "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    );
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!driveRes.ok) {
      const errJson = await driveRes.json().catch(() => ({}));
      const msg =
        errJson?.error?.message ||
        `Google Drive API error (HTTP ${driveRes.status}). Please re-authorize Google sign-in.`;
      const error: any = new Error(msg);
      error.status = driveRes.status;
      throw error;
    }

    const driveData = await driveRes.json();
    const files: { id: string; name: string }[] = driveData.files || [];

    const match =
      files.find((f) => f.name.trim().toLowerCase() === 'sankranthi chit') ||
      files.find((f) => f.name.trim().toLowerCase() === 'sankranti chit') ||
      files.find((f) => f.name.toLowerCase().includes('sankrant')) ||
      files.find((f) => f.name.toLowerCase().includes('chit'));

    if (match) {
      targetSpreadsheetId = match.id;
      appState.spreadsheetName = match.name;
    } else {
      const availableNames = files.slice(0, 5).map((f) => `"${f.name}"`).join(', ');
      const error: any = new Error(
        files.length > 0
          ? `Spreadsheet "Sankranthi Chit" was not found automatically (found: ${availableNames}). Paste your Google Sheet URL in Spreadsheet Config to link it directly.`
          : 'No Google Spreadsheets found in your Google Drive. Please paste the Google Sheet URL in Spreadsheet Config.'
      );
      error.status = 404;
      throw error;
    }
  }

  // 2. Fetch spreadsheet metadata to discover exact title, tab name & gid
  let resolvedSheetName = appState.sheetName || 'Sheet1';
  let resolvedTitle = appState.spreadsheetName || 'Sankranthi Chit';

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}?fields=properties.title,sheets(properties(sheetId,title))`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (metaRes.ok) {
    const meta = await metaRes.json();
    if (meta.properties?.title) {
      resolvedTitle = meta.properties.title;
    }
    const sheets: { properties: { sheetId: number; title: string } }[] = meta.sheets || [];
    if (sheets.length > 0) {
      const byGid =
        parsedInput.gid !== null
          ? sheets.find((s) => s.properties.sheetId === parsedInput.gid)
          : undefined;
      const exactSheet1 = sheets.find(
        (s) => s.properties.title.trim().toLowerCase() === 'sheet1'
      );
      const chosen = byGid || exactSheet1 || sheets[0];
      resolvedSheetName = chosen.properties.title;
      resolvedSheetGid = chosen.properties.sheetId;
    }
  } else if (metaRes.status === 401 || metaRes.status === 403 || metaRes.status === 404) {
    const errJson = await metaRes.json().catch(() => ({}));
    const msg =
      errJson?.error?.message ||
      `Unable to access Google Sheet (HTTP ${metaRes.status}). Make sure you have access and signed in with the right Google account.`;
    const error: any = new Error(msg);
    error.status = metaRes.status;
    throw error;
  }

  // 3. Fetch sheet values (A1:Z45 with FORMATTED_VALUE)
  const range = `${resolvedSheetName}!A1:Z45`;
  const sheetRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!sheetRes.ok) {
    const errText = await sheetRes.text();
    const error: any = new Error(`Google Sheets API error: ${errText}`);
    error.status = sheetRes.status;
    throw error;
  }

  const sheetData = await sheetRes.json();
  const rows: any[][] = sheetData.values || [];

  const parsed = parseSheetRows(rows);

  appState.spreadsheetId = targetSpreadsheetId;
  appState.spreadsheetName = resolvedTitle;
  appState.sheetName = resolvedSheetName;
  appState.sheetGid = resolvedSheetGid;
  appState.roundInputs = parsed.roundInputs;
  if (parsed.dates.length > 0) appState.customDates = parsed.dates;
  if (parsed.members.length > 0) appState.customMembers = parsed.members;
  appState.rowMapping = parsed.rowMapping;
  appState.lastSyncedAt = new Date().toISOString();
  appState.syncSource = 'google_sheets_oauth';
  appState.lastSyncError = null;
  saveState(appState);

  // Probe whether server-side public CSV auto-sync works (for zero-login future months)
  try {
    const probeRes = await fetch(
      `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/export?format=csv&gid=${resolvedSheetGid}`,
      { redirect: 'follow' }
    );
    const probeCt = probeRes.headers.get('content-type') || '';
    appState.publicAutoSyncAvailable = probeRes.ok && probeCt.includes('csv');
    saveState(appState);
  } catch {
    appState.publicAutoSyncAvailable = false;
  }

  return {
    computed: getComputedData(true),
    detectedEntriesCount: parsed.detectedEntriesCount,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: Public Chit Fund Data (Available to Viewer & Admin)
  app.get('/api/chit/data', async (req, res) => {
    // Recover spreadsheetId from client cache if server restarted without .chit_state.json
    if (!appState.spreadsheetId && typeof req.query.spreadsheetId === 'string') {
      const cleanId = extractSpreadsheetId(req.query.spreadsheetId);
      if (cleanId) {
        appState.spreadsheetId = cleanId;
        if (typeof req.query.gid === 'string' && !isNaN(Number(req.query.gid))) {
          appState.sheetGid = Number(req.query.gid);
        }
        saveState(appState);
      }
    }

    await tryPublicSheetSync(req.query.refresh === '1');
    res.json(getComputedData());
  });

  // API Route: Sync with Google Sheets
  app.post('/api/chit/sync', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({
        error: 'Google authorization token required to sync with Google Sheets. Please click Sign In / Sync again.',
      });
    }

    try {
      const { computed, detectedEntriesCount } = await syncSpreadsheetWithToken(
        token,
        req.body?.spreadsheetId
      );

      return res.json({
        success: true,
        message: `Synced ${detectedEntriesCount} completed rounds from "${appState.spreadsheetName}" (${appState.sheetName})`,
        data: computed,
      });
    } catch (err: any) {
      console.error('Sync error:', err);
      appState.lastSyncError = err.message;
      return res
        .status(err.status && err.status >= 400 ? err.status : 500)
        .json({ error: err.message || 'Failed to sync with Google Sheets' });
    }
  });

  // API Route: Submit New Chit Draw (RBAC Admin Protected)
  app.post('/api/chit/submit-draw', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // RBAC validation
    const tokenInfo = await verifyGoogleToken(authHeader);
    const userEmail = tokenInfo?.email?.toLowerCase();
    const isAdmin = userEmail && ALLOWED_ADMINS.some((a) => a.toLowerCase() === userEmail);

    if (!isAdmin) {
      return res.status(403).json({
        error: `Access Denied: Only authorized managers (${ALLOWED_ADMINS.join(', ')}) can record chit draws. Current: ${userEmail || 'Unauthenticated'}`,
      });
    }

    const { roundNumber, chitType, winnerName, amountReceived } = req.body;

    if (!roundNumber || roundNumber < 1 || roundNumber > 20) {
      return res.status(400).json({ error: 'Invalid round number (1-20)' });
    }

    if (!winnerName || typeof winnerName !== 'string') {
      return res.status(400).json({ error: 'Winner name is required' });
    }

    const amount = Number(amountReceived);
    if (isNaN(amount) || amount <= 0 || amount > 50000) {
      return res.status(400).json({ error: 'Amount received must be a valid number between ₹1 and ₹50,000' });
    }

    // Verify member hasn't won already (unless 'Agent' or permitted duplicate)
    const currentData = getComputedData();
    if (winnerName !== 'Agent' && !currentData.availableMembers.includes(winnerName)) {
      const alreadyWon = currentData.pastWinners.find(
        (w) => w.name.toLowerCase().trim() === winnerName.toLowerCase().trim()
      );
      if (alreadyWon && (alreadyWon.roundNumber !== roundNumber || alreadyWon.chitType !== chitType)) {
        return res.status(400).json({
          error: `Member "${winnerName}" has already taken their chit in Round ${alreadyWon.roundNumber}!`,
        });
      }
    }

    // Update in local state
    const roundIdx = appState.roundInputs.findIndex((r) => r.roundNumber === roundNumber);
    if (roundIdx === -1) {
      appState.roundInputs.push({ roundNumber });
    }
    const targetRound = appState.roundInputs.find((r) => r.roundNumber === roundNumber)!;

    if (chitType === 'primary') {
      targetRound.primaryWinner = winnerName;
      targetRound.primaryAmount = amount;
    } else if (chitType === 'second') {
      targetRound.secondWinner = winnerName;
      targetRound.secondAmount = amount;
    } else {
      return res.status(400).json({ error: "Invalid chitType. Must be 'primary' or 'second'" });
    }

    const updatedData = getComputedData();
    const updatedRound = updatedData.rounds.find((r) => r.roundNumber === roundNumber);

    // If Google Sheet is linked and token available, update Google Sheet directly
    let googleSheetUpdated = false;
    let googleSheetError: string | null = null;

    if (appState.spreadsheetId && token) {
      try {
        const mapping = appState.rowMapping || DEFAULT_ROW_MAPPING;
        const colIdx = mapping.firstRoundColIndex + (roundNumber - 1);
        const colLetter = String.fromCharCode(65 + colIdx);
        const sheetTab = appState.sheetName || 'Sheet1';

        const startRow =
          chitType === 'primary' ? mapping.primaryWinnerRow : mapping.secondWinnerRow;
        const endRow =
          chitType === 'primary' ? mapping.primaryRemainingRow : mapping.finalRemainingRow;
        const range = `${sheetTab}!${colLetter}${startRow}:${colLetter}${endRow}`;

        const remainingVal =
          chitType === 'primary'
            ? updatedRound?.primaryRemaining ?? 0
            : updatedRound?.finalRemaining ?? 0;

        const sheetRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${appState.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range,
              majorDimension: 'COLUMNS',
              values: [[winnerName, amount, remainingVal]],
            }),
          }
        );

        googleSheetUpdated = sheetRes.ok;
        if (!googleSheetUpdated) {
          const errText = await sheetRes.text();
          googleSheetError = `Google Sheets write error: ${errText}`;
        }
      } catch (err: any) {
        console.error('Failed to update Google Sheet directly:', err);
        googleSheetError = err.message;
      }
    }

    appState.lastSyncedAt = new Date().toISOString();
    saveState(appState);

    return res.json({
      success: true,
      message: `Successfully recorded ${chitType === 'primary' ? 'Primary Chit' : 'Second Chit'} for Round ${roundNumber}: ${winnerName} (₹${amount.toLocaleString('en-IN')})${googleSheetUpdated ? ' & synced to Google Sheet!' : ''}`,
      googleSheetUpdated,
      googleSheetError,
      data: getComputedData(),
    });
  });

  // API Route: Manually set/link spreadsheet ID AND immediately sync its contents
  app.post('/api/chit/link-spreadsheet', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const tokenInfo = await verifyGoogleToken(authHeader);
    const userEmail = tokenInfo?.email?.toLowerCase();
    const isAdmin = userEmail && ALLOWED_ADMINS.some((a) => a.toLowerCase() === userEmail);

    if (!isAdmin || !token) {
      return res.status(403).json({
        error: 'Admin Google sign-in required to link and sync Google Sheet',
      });
    }

    const rawInput = req.body?.spreadsheetId || '';
    const cleanId = extractSpreadsheetId(rawInput);
    if (!cleanId) {
      return res.status(400).json({
        error: 'Please enter a valid Google Sheet URL or Spreadsheet ID',
      });
    }

    try {
      const { computed, detectedEntriesCount } = await syncSpreadsheetWithToken(token, rawInput);
      return res.json({
        success: true,
        message: `Linked & synced "${appState.spreadsheetName}" (${detectedEntriesCount} completed rounds found)!`,
        data: computed,
      });
    } catch (err: any) {
      return res
        .status(err.status && err.status >= 400 ? err.status : 500)
        .json({ error: err.message || 'Failed to read the linked Google Sheet' });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Startup & periodic background auto-sync from Google Sheets
  if (appState.spreadsheetId) {
    tryPublicSheetSync(true).catch(() => {});
  }
  setInterval(() => {
    if (appState.spreadsheetId) {
      tryPublicSheetSync(true).catch(() => {});
    }
  }, 60_000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
