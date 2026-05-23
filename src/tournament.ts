// Tournament Mode - Bracket-style tournament with escalating AI difficulty
import { AIDifficulty } from './ai';

export interface TournamentMatch {
  round: number; // 0 = quarterfinal, 1 = semifinal, 2 = final
  matchIndex: number;
  player1: string;
  player2: string;
  winner: string | null;
  p1Score: number;
  p2Score: number;
}

export interface TournamentState {
  active: boolean;
  currentRound: number; // 0, 1, 2
  currentMatchIndex: number;
  matches: TournamentMatch[][];
  playerName: string;
  eliminated: boolean;
  champion: string | null;
}

// AI opponents with personality names
const AI_POOL_NAMES = [
  'Neon Nova',
  'Pixel Pete',
  'Laser Lou',
  'Grid Ghost',
  'Volt Viper',
  'Cyber Sam',
  'Holo Hawk',
];

// Difficulty per tournament round
const ROUND_DIFFICULTY: AIDifficulty[] = ['easy', 'medium', 'hard'];

export class TournamentManager {
  state: TournamentState;

  constructor() {
    this.state = this.createEmptyState();
  }

  private createEmptyState(): TournamentState {
    return {
      active: false,
      currentRound: 0,
      currentMatchIndex: 0,
      matches: [],
      playerName: 'Player 1',
      eliminated: false,
      champion: null,
    };
  }

  startTournament(): void {
    this.state = this.createEmptyState();
    this.state.active = true;

    // Pick 7 random AI names for opponents
    const shuffled = [...AI_POOL_NAMES].sort(() => Math.random() - 0.5);
    const aiNames = shuffled.slice(0, 7);

    // 8-player bracket: player is seeded #1
    const participants = [this.state.playerName, ...aiNames];

    // Quarterfinals (4 matches)
    const qf: TournamentMatch[] = [];
    for (let i = 0; i < 4; i++) {
      qf.push({
        round: 0,
        matchIndex: i,
        player1: participants[i * 2],
        player2: participants[i * 2 + 1],
        winner: null,
        p1Score: 0,
        p2Score: 0,
      });
    }

    // Semifinals (2 matches, TBD)
    const sf: TournamentMatch[] = [
      { round: 1, matchIndex: 0, player1: '???', player2: '???', winner: null, p1Score: 0, p2Score: 0 },
      { round: 1, matchIndex: 1, player1: '???', player2: '???', winner: null, p1Score: 0, p2Score: 0 },
    ];

    // Final
    const fin: TournamentMatch[] = [
      { round: 2, matchIndex: 0, player1: '???', player2: '???', winner: null, p1Score: 0, p2Score: 0 },
    ];

    this.state.matches = [qf, sf, fin];
    this.state.currentRound = 0;
    this.state.currentMatchIndex = 0;
  }

  getCurrentMatch(): TournamentMatch | null {
    if (!this.state.active || this.state.eliminated || this.state.champion) return null;
    const round = this.state.matches[this.state.currentRound];
    if (!round) return null;
    return round[this.state.currentMatchIndex] || null;
  }

  getCurrentDifficulty(): AIDifficulty {
    return ROUND_DIFFICULTY[Math.min(this.state.currentRound, ROUND_DIFFICULTY.length - 1)];
  }

  getPlayerOpponent(): string | null {
    const match = this.getCurrentMatch();
    if (!match) return null;
    if (match.player1 === this.state.playerName) return match.player2;
    if (match.player2 === this.state.playerName) return match.player1;
    return null;
  }

  isPlayerMatch(): boolean {
    const match = this.getCurrentMatch();
    if (!match) return false;
    return match.player1 === this.state.playerName || match.player2 === this.state.playerName;
  }

  // Record match result (player won or lost)
  recordResult(playerWon: boolean): void {
    const match = this.getCurrentMatch();
    if (!match) return;

    if (this.isPlayerMatch()) {
      match.winner = playerWon ? this.state.playerName : this.getPlayerOpponent()!;
    }

    // Advance to next match in round
    this.state.currentMatchIndex++;

    // Simulate remaining matches in this round (AI vs AI)
    const round = this.state.matches[this.state.currentRound];
    while (this.state.currentMatchIndex < round.length) {
      const m = round[this.state.currentMatchIndex];
      // AI vs AI - random winner with slight bias toward higher seed
      m.winner = Math.random() < 0.55 ? m.player1 : m.player2;
      m.p1Score = m.winner === m.player1 ? 2 : Math.floor(Math.random() * 2);
      m.p2Score = m.winner === m.player2 ? 2 : Math.floor(Math.random() * 2);
      this.state.currentMatchIndex++;
    }

    // Check if player was eliminated
    if (!playerWon) {
      this.state.eliminated = true;
    }

    // Advance to next round
    this.advanceRound();
  }

  private advanceRound(): void {
    const currentRound = this.state.matches[this.state.currentRound];
    const winners = currentRound.map(m => m.winner!).filter(Boolean);

    if (this.state.currentRound >= 2) {
      // Final is over
      this.state.champion = winners[0] || null;
      return;
    }

    // Fill next round
    const nextRound = this.state.matches[this.state.currentRound + 1];
    for (let i = 0; i < nextRound.length; i++) {
      nextRound[i].player1 = winners[i * 2] || '???';
      nextRound[i].player2 = winners[i * 2 + 1] || '???';
    }

    this.state.currentRound++;
    this.state.currentMatchIndex = 0;

    // Find player's match in next round (if not eliminated)
    if (!this.state.eliminated) {
      for (let i = 0; i < nextRound.length; i++) {
        if (nextRound[i].player1 === this.state.playerName || nextRound[i].player2 === this.state.playerName) {
          // Simulate earlier AI matches first
          for (let j = 0; j < i; j++) {
            const m = nextRound[j];
            m.winner = Math.random() < 0.55 ? m.player1 : m.player2;
            m.p1Score = m.winner === m.player1 ? 2 : Math.floor(Math.random() * 2);
            m.p2Score = m.winner === m.player2 ? 2 : Math.floor(Math.random() * 2);
          }
          this.state.currentMatchIndex = i;
          break;
        }
      }
    }
  }

  getRoundName(): string {
    switch (this.state.currentRound) {
      case 0: return 'QUARTERFINAL';
      case 1: return 'SEMIFINAL';
      case 2: return 'FINAL';
      default: return '';
    }
  }

  getBracketDisplay(): string[] {
    const lines: string[] = [];
    const roundNames = ['QUARTER', 'SEMI', 'FINAL'];

    for (let r = 0; r < this.state.matches.length; r++) {
      lines.push(`── ${roundNames[r]} ──`);
      for (const m of this.state.matches[r]) {
        const p1Mark = m.winner === m.player1 ? '★ ' : '  ';
        const p2Mark = m.winner === m.player2 ? '★ ' : '  ';
        const isPlayerP1 = m.player1 === this.state.playerName;
        const isPlayerP2 = m.player2 === this.state.playerName;
        const p1Name = isPlayerP1 ? `▶ ${m.player1}` : m.player1;
        const p2Name = isPlayerP2 ? `▶ ${m.player2}` : m.player2;
        lines.push(`${p1Mark}${p1Name}`);
        lines.push(`${p2Mark}${p2Name}`);
        if (m !== this.state.matches[r][this.state.matches[r].length - 1]) {
          lines.push('');
        }
      }
    }
    return lines;
  }

  isActive(): boolean {
    return this.state.active && !this.state.champion && !this.state.eliminated;
  }

  reset(): void {
    this.state = this.createEmptyState();
  }
}
