export interface Member {
  slNo: number;
  name: string;
  monthlyContribution: number;
  totalPaid: number;
  hasTakenChit: boolean;
  chitRound?: number;
  chitDate?: string;
  chitType?: 'primary' | 'second';
  prizeAmount?: number;
}

export interface ChitRound {
  roundNumber: number; // 1 to 20
  columnLetter: string; // 'C' to 'V'
  date: string; // e.g. "10-01-2026"
  monthlyPool: number; // ₹50,000
  primaryWinner: string | null; // Name or null
  primaryAmount: number | null; // Prize value received
  primaryRemaining: number | null; // Row 26
  secondWinner: string | null; // Name or null (Row 27)
  secondAmount: number | null; // Prize value (Row 28)
  finalRemaining: number | null; // Row 29 if second chit exists, otherwise Row 26
  status: 'completed' | 'current' | 'upcoming';
  isSecondChitEligible: boolean;
}

export interface ChitFundData {
  spreadsheetName: string;
  sheetName: string;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncedAt: string;
  isLiveSynced?: boolean;
  publicAutoSyncAvailable?: boolean;
  syncSource?: 'google_sheets_oauth' | 'google_sheets_public' | 'cached' | 'initial';
  syncError?: string | null;
  totalRounds: number; // 20
  monthlyPoolPerRound: number; // 50000
  monthsLeft: number; // Count of unused columns out of 20
  currentRemainingBalance: number; // Row 29 if second chit exists, otherwise Row 26
  totalCollected: number;
  totalDisbursed: number;
  currentRoundNumber: number;
  members: Member[];
  rounds: ChitRound[];
  availableMembers: string[];
  pastWinners: {
    name: string;
    roundNumber: number;
    chitType: 'primary' | 'second';
    amount: number;
    date: string;
  }[];
  secondChitAlert: {
    eligible: boolean;
    roundNumber: number;
    reason: string;
    potentialPool: number;
  } | null;
}

export interface DrawSubmission {
  roundNumber: number;
  chitType: 'primary' | 'second';
  winnerName: string;
  amountReceived: number;
}

export interface UserAuth {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  role: 'viewer' | 'admin';
  accessToken: string | null;
}
