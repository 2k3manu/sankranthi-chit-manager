import { RawRoundInput } from '../data/initialChitData.ts';

export interface SheetRowMapping {
  primaryWinnerRow: number; // 1-indexed sheet row (default 24)
  primaryAmountRow: number; // 1-indexed sheet row (default 25)
  primaryRemainingRow: number; // 1-indexed sheet row (default 26)
  secondWinnerRow: number; // 1-indexed sheet row (default 27)
  secondAmountRow: number; // 1-indexed sheet row (default 28)
  finalRemainingRow: number; // 1-indexed sheet row (default 29)
  firstRoundColIndex: number; // 0-indexed column (default 2 -> Col C)
}

export interface ParsedSheetResult {
  roundInputs: RawRoundInput[];
  dates: string[];
  members: { slNo: number; name: string }[];
  rowMapping: SheetRowMapping;
  detectedEntriesCount: number;
}

export function extractSpreadsheetInfo(input: string): {
  spreadsheetId: string | null;
  gid: number | null;
} {
  if (!input) return { spreadsheetId: null, gid: null };
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = trimmed.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch && gidMatch[1] ? Number(gidMatch[1]) : null;

  if (urlMatch && urlMatch[1]) {
    return { spreadsheetId: urlMatch[1], gid };
  }
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return { spreadsheetId: trimmed, gid };
  }
  return { spreadsheetId: null, gid: null };
}

export function extractSpreadsheetId(input: string): string | null {
  return extractSpreadsheetInfo(input).spreadsheetId;
}

export function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function parseWinnerCell(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'x' || lower === '-' || lower === '—' || lower === 'nil' || lower === 'none' || lower === 'n/a') {
    return undefined;
  }
  return trimmed;
}

export function parseAmountCell(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const str = String(raw).trim();
  if (!str) return undefined;
  const lower = str.toLowerCase();
  if (lower === 'x' || lower === '-' || lower === '—' || lower === 'nil' || lower === 'none') {
    return undefined;
  }
  // Strip currency symbols (₹, Rs, INR), commas, spaces, and trailing '/-'
  const cleaned = str.replace(/₹|rs\.?|inr|\/-|\s|,/gi, '');
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  if (isNaN(num) || num <= 0) return undefined;
  return num;
}

function getRowLabel(row: any[]): string {
  const a = String(row?.[0] ?? '').trim();
  const b = String(row?.[1] ?? '').trim();
  return `${a} ${b}`.trim().toLowerCase();
}

export function parseSheetRows(rows: any[][]): ParsedSheetResult {
  // 1. Detect round header row (where consecutive columns contain 1, 2, 3...)
  let headerRowIdx = -1;
  let firstRoundColIndex = 2; // Default Col C

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < Math.min(row.length - 2, 10); c++) {
      const v1 = String(row[c] ?? '').trim();
      const v2 = String(row[c + 1] ?? '').trim();
      const v3 = String(row[c + 2] ?? '').trim();
      if (v1 === '1' && v2 === '2' && v3 === '3') {
        headerRowIdx = r;
        firstRoundColIndex = c;
        break;
      }
    }
    if (headerRowIdx !== -1) break;
  }

  // 2. Detect date row (row right after header row, or first row with date-like strings)
  const dates: string[] = [];
  let dateRowIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;
  if (dateRowIdx < rows.length) {
    const candidate = rows[dateRowIdx] || [];
    const looksLikeDates = String(candidate[firstRoundColIndex] ?? '').trim().length >= 6;
    if (looksLikeDates) {
      for (let i = 0; i < 20; i++) {
        const d = String(candidate[firstRoundColIndex + i] ?? '').trim();
        if (d) dates[i] = d;
      }
    }
  }

  // 3. Detect member rows (Column A = 1..20, Column B = Name)
  const members: { slNo: number; name: string }[] = [];
  let lastMemberRowIdx = -1;
  const memberColIndex = Math.max(1, firstRoundColIndex - 1);
  const slColIndex = Math.max(0, memberColIndex - 1);

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const slVal = Number(String(row[slColIndex] ?? '').trim());
    const nameVal = String(row[memberColIndex] ?? '').trim();
    if (
      Number.isInteger(slVal) &&
      slVal >= 1 &&
      slVal <= 20 &&
      nameVal &&
      !/^sl\.?\s*no/i.test(nameVal)
    ) {
      members.push({ slNo: slVal, name: nameVal });
      lastMemberRowIdx = r;
    }
  }

  // 4. Locate Primary Winner, Primary Amount, Second Winner, Second Amount rows
  // Default 0-indexed rows: Row 24 -> 23, Row 25 -> 24, Row 27 -> 26, Row 28 -> 27
  let primaryWinnerIdx = -1;
  let primaryAmountIdx = -1;
  let secondWinnerIdx = -1;
  let secondAmountIdx = -1;

  for (let r = Math.max(0, lastMemberRowIdx + 1); r < rows.length; r++) {
    const label = getRowLabel(rows[r]);
    if (!label) continue;

    const isSecond = /\b(second|2nd)\b/i.test(label);
    if (!isSecond) {
      if (primaryWinnerIdx === -1 && /(chit\s*for|winner|primary\s*chit|^for$)/i.test(label)) {
        primaryWinnerIdx = r;
      } else if (
        primaryAmountIdx === -1 &&
        /(chit\s*value|chit\s*amount|prize|amount\s*received|primary\s*amount)/i.test(label)
      ) {
        primaryAmountIdx = r;
      }
    } else {
      if (secondWinnerIdx === -1 && /(for|winner|chit(?!.*(value|amount|rem)))/i.test(label)) {
        secondWinnerIdx = r;
      } else if (secondAmountIdx === -1 && /(value|amount|prize)/i.test(label)) {
        secondAmountIdx = r;
      }
    }
  }

  // Anchor fallback based on member table end if labels weren't found
  const defaultPrimaryWinnerIdx =
    lastMemberRowIdx >= 18 ? lastMemberRowIdx + 2 : 23;

  if (primaryWinnerIdx === -1) primaryWinnerIdx = defaultPrimaryWinnerIdx;
  if (primaryAmountIdx === -1) primaryAmountIdx = primaryWinnerIdx + 1;
  if (secondWinnerIdx === -1) secondWinnerIdx = primaryWinnerIdx + 3;
  if (secondAmountIdx === -1) secondAmountIdx = secondWinnerIdx + 1;

  // 5. Extract all 20 rounds (Columns C to V, or starting at firstRoundColIndex)
  const roundInputs: RawRoundInput[] = [];
  let detectedEntriesCount = 0;

  for (let r = 1; r <= 20; r++) {
    const colIdx = firstRoundColIndex + (r - 1);
    const primaryWinner = parseWinnerCell(rows[primaryWinnerIdx]?.[colIdx]);
    const primaryAmount = parseAmountCell(rows[primaryAmountIdx]?.[colIdx]);
    const secondWinner = parseWinnerCell(rows[secondWinnerIdx]?.[colIdx]);
    const secondAmount = parseAmountCell(rows[secondAmountIdx]?.[colIdx]);

    if (primaryWinner && primaryAmount) {
      detectedEntriesCount++;
    }

    roundInputs.push({
      roundNumber: r,
      primaryWinner,
      primaryAmount,
      secondWinner,
      secondAmount,
    });
  }

  return {
    roundInputs,
    dates,
    members,
    rowMapping: {
      primaryWinnerRow: primaryWinnerIdx + 1,
      primaryAmountRow: primaryAmountIdx + 1,
      primaryRemainingRow: primaryAmountIdx + 2,
      secondWinnerRow: secondWinnerIdx + 1,
      secondAmountRow: secondAmountIdx + 1,
      finalRemainingRow: secondAmountIdx + 2,
      firstRoundColIndex,
    },
    detectedEntriesCount,
  };
}
