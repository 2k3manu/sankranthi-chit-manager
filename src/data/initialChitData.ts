import { ChitFundData, ChitRound, Member } from '../types/chit';

export const RAW_MEMBERS: { slNo: number; name: string }[] = [
  { slNo: 1, name: 'Mutthuraju' },
  { slNo: 2, name: 'Shantharaju' },
  { slNo: 3, name: 'Shankara' },
  { slNo: 4, name: 'Harish' },
  { slNo: 5, name: 'Shrinivasa' },
  { slNo: 6, name: 'Baalu' },
  { slNo: 7, name: 'Daasasetty' },
  { slNo: 8, name: 'Rajanna' },
  { slNo: 9, name: 'Prabhu' },
  { slNo: 10, name: 'Pavi' },
  { slNo: 11, name: 'Somanna' },
  { slNo: 12, name: 'Manu' },
  { slNo: 13, name: 'Ningaraju' },
  { slNo: 14, name: 'Sharada' },
  { slNo: 15, name: 'Nilamma' },
  { slNo: 16, name: 'Shanthakumar' },
  { slNo: 17, name: 'Gurumurthy' },
  { slNo: 18, name: 'Hanumamma' },
  { slNo: 19, name: 'Chikkaningasetty' },
  { slNo: 20, name: 'Raju Auto' },
];

export const ROUND_DATES = [
  '10-01-2026',
  '10-02-2026',
  '10-03-2026',
  '10-04-2026',
  '10-05-2026',
  '10-06-2026',
  '10-07-2026',
  '10-08-2026',
  '10-09-2026',
  '10-10-2026',
  '10-11-2026',
  '10-12-2026',
  '10-01-2027',
  '10-02-2027',
  '10-03-2027',
  '10-04-2027',
  '10-05-2027',
  '10-06-2027',
  '10-07-2027',
  '10-08-2027',
];

export interface RawRoundInput {
  roundNumber: number;
  primaryWinner?: string;
  primaryAmount?: number;
  secondWinner?: string;
  secondAmount?: number;
}

export const DEFAULT_SPREADSHEET_ID = '1HqU4ECWFsHF7nutCYFsPLFzG4bURQujV6M3XGZDFDoA';

export const INITIAL_ROUND_INPUTS: RawRoundInput[] = [
  { roundNumber: 1, primaryWinner: 'Raju Auto', primaryAmount: 38500 },
  { roundNumber: 2, primaryWinner: 'Chikkaningasetty', primaryAmount: 40500 },
  { roundNumber: 3, primaryWinner: 'Agent', primaryAmount: 50000 },
  { roundNumber: 4, primaryWinner: 'Gurumurthy', primaryAmount: 40400 },
  { roundNumber: 5, primaryWinner: 'Pavi', primaryAmount: 43500 },
  {
    roundNumber: 6,
    primaryWinner: 'Manu',
    primaryAmount: 41800,
    secondWinner: 'Hanumamma',
    secondAmount: 42100,
  },
  { roundNumber: 7, primaryWinner: 'Somanna', primaryAmount: 43000 },
  { roundNumber: 8, primaryWinner: 'Shanthakumar', primaryAmount: 42400 },
  { roundNumber: 9, primaryWinner: 'Shrinivasa', primaryAmount: 44500 },
  { roundNumber: 10, primaryWinner: 'Ningaraju', primaryAmount: 44600 },
  { roundNumber: 11, primaryWinner: 'Rajanna', primaryAmount: 43400 },
  { roundNumber: 12 },
  { roundNumber: 13 },
  { roundNumber: 14 },
  { roundNumber: 15 },
  { roundNumber: 16 },
  { roundNumber: 17 },
  { roundNumber: 18 },
  { roundNumber: 19 },
  { roundNumber: 20 },
];

export interface ComputeOptions {
  spreadsheetName?: string;
  sheetName?: string;
  customDates?: string[];
  customMembers?: { slNo: number; name: string }[];
  isLiveSynced?: boolean;
  publicAutoSyncAvailable?: boolean;
  syncSource?: 'google_sheets_oauth' | 'google_sheets_public' | 'cached' | 'initial';
  syncError?: string | null;
}

export function computeChitFundData(
  roundInputs: RawRoundInput[] = INITIAL_ROUND_INPUTS,
  spreadsheetId: string | null = null,
  lastSyncedAt: string = new Date().toISOString(),
  options: ComputeOptions = {}
): ChitFundData {
  const membersList =
    options.customMembers && options.customMembers.length > 0
      ? options.customMembers
      : RAW_MEMBERS;
  const datesList =
    options.customDates && options.customDates.length > 0
      ? options.customDates
      : ROUND_DATES;

  const rounds: ChitRound[] = [];
  let prevFinalRemaining = 0;
  let totalDisbursed = 0;
  let completedCount = 0;

  for (let i = 1; i <= 20; i++) {
    const input = roundInputs.find((r) => r.roundNumber === i) || { roundNumber: i };
    const columnLetter = String.fromCharCode(65 + 1 + i); // C for 1, V for 20
    const date = datesList[i - 1] || ROUND_DATES[i - 1] || `Round ${i}`;
    const monthlyPool = 50000;

    const cleanPrimaryWinner = input.primaryWinner?.trim();
    const cleanSecondWinner = input.secondWinner?.trim();

    const hasPrimary =
      Boolean(cleanPrimaryWinner) &&
      cleanPrimaryWinner!.toLowerCase() !== 'x' &&
      typeof input.primaryAmount === 'number' &&
      input.primaryAmount > 0;

    const hasSecond =
      Boolean(cleanSecondWinner) &&
      cleanSecondWinner!.toLowerCase() !== 'x' &&
      typeof input.secondAmount === 'number' &&
      input.secondAmount > 0;

    let primaryRemaining: number | null = null;
    let finalRemaining: number | null = null;

    if (hasPrimary && input.primaryAmount !== undefined) {
      primaryRemaining = prevFinalRemaining + monthlyPool - input.primaryAmount;
      totalDisbursed += input.primaryAmount;
      completedCount++;

      if (hasSecond && input.secondAmount !== undefined) {
        finalRemaining = primaryRemaining - input.secondAmount;
        totalDisbursed += input.secondAmount;
      } else {
        finalRemaining = primaryRemaining;
      }

      prevFinalRemaining = finalRemaining;
    } else {
      primaryRemaining = null;
      finalRemaining = null;
    }

    const isSecondChitEligible =
      hasPrimary &&
      !hasSecond &&
      primaryRemaining !== null &&
      primaryRemaining >= 40000;

    const status = hasPrimary ? 'completed' : i === completedCount + 1 ? 'current' : 'upcoming';

    rounds.push({
      roundNumber: i,
      columnLetter,
      date,
      monthlyPool,
      primaryWinner: hasPrimary ? cleanPrimaryWinner || null : null,
      primaryAmount: hasPrimary ? input.primaryAmount || null : null,
      primaryRemaining,
      secondWinner: hasSecond ? cleanSecondWinner || null : null,
      secondAmount: hasSecond ? input.secondAmount || null : null,
      finalRemaining,
      status,
      isSecondChitEligible,
    });
  }

  // Months Left: count of unused columns out of 20 total rounds
  const monthsLeft = 20 - completedCount;

  // Latest remaining balance: check latest completed round
  let currentRemainingBalance = 0;
  for (let i = rounds.length - 1; i >= 0; i--) {
    if (rounds[i].finalRemaining !== null) {
      currentRemainingBalance = rounds[i].finalRemaining || 0;
      break;
    }
  }

  // Determine past winners
  const pastWinners: {
    name: string;
    roundNumber: number;
    chitType: 'primary' | 'second';
    amount: number;
    date: string;
  }[] = [];

  const winningNamesNormalized = new Set<string>();

  rounds.forEach((round) => {
    if (round.primaryWinner && round.primaryWinner.toLowerCase() !== 'x') {
      winningNamesNormalized.add(round.primaryWinner.toLowerCase().trim());
      pastWinners.push({
        name: round.primaryWinner,
        roundNumber: round.roundNumber,
        chitType: 'primary',
        amount: round.primaryAmount || 0,
        date: round.date,
      });
    }
    if (round.secondWinner && round.secondWinner.toLowerCase() !== 'x') {
      winningNamesNormalized.add(round.secondWinner.toLowerCase().trim());
      pastWinners.push({
        name: round.secondWinner,
        roundNumber: round.roundNumber,
        chitType: 'second',
        amount: round.secondAmount || 0,
        date: round.date,
      });
    }
  });

  // Dynamic available members list from B9:B22 who DO NOT appear in Row 24 or Row 27
  const availableMembers = membersList
    .map((m) => m.name)
    .filter((name) => !winningNamesNormalized.has(name.toLowerCase().trim()));

  // Map each member's status
  const members: Member[] = membersList.map((raw) => {
    const win = pastWinners.find(
      (w) => w.name.toLowerCase().trim() === raw.name.toLowerCase().trim()
    );
    return {
      slNo: raw.slNo,
      name: raw.name,
      monthlyContribution: 2500,
      totalPaid: completedCount * 2500,
      hasTakenChit: Boolean(win),
      chitRound: win?.roundNumber,
      chitDate: win?.date,
      chitType: win?.chitType,
      prizeAmount: win?.amount,
    };
  });

  // Check second chit alert for active or current round
  let secondChitAlert = null;
  const lastCompleted = [...rounds].reverse().find((r) => r.status === 'completed');

  if (lastCompleted && lastCompleted.isSecondChitEligible) {
    secondChitAlert = {
      eligible: true,
      roundNumber: lastCompleted.roundNumber,
      reason: `Round ${lastCompleted.roundNumber} balance is ₹${lastCompleted.primaryRemaining?.toLocaleString('en-IN')}, which exceeds ₹40,000 threshold. A 2nd chit draw is recommended for this month!`,
      potentialPool: lastCompleted.primaryRemaining || 0,
    };
  }

  // Next open round number (first round without primary chit)
  const firstOpenRound = rounds.find((r) => r.status !== 'completed');
  const currentRoundNumber = firstOpenRound ? firstOpenRound.roundNumber : 20;

  return {
    spreadsheetName: options.spreadsheetName || 'Sankranthi Chit',
    sheetName: options.sheetName || 'Sheet1',
    spreadsheetId,
    spreadsheetUrl: spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : null,
    lastSyncedAt,
    isLiveSynced: options.isLiveSynced ?? Boolean(spreadsheetId),
    publicAutoSyncAvailable: options.publicAutoSyncAvailable ?? false,
    syncSource: options.syncSource ?? (spreadsheetId ? 'cached' : 'initial'),
    syncError: options.syncError ?? null,
    totalRounds: 20,
    monthlyPoolPerRound: 50000,
    monthsLeft,
    currentRemainingBalance,
    totalCollected: completedCount * 50000,
    totalDisbursed,
    currentRoundNumber,
    members,
    rounds,
    availableMembers,
    pastWinners,
    secondChitAlert,
  };
}
