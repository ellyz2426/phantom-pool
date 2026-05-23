// Game Manager - game state, scoring, rules (8-ball and 9-ball), AI support, match play
import { Vector3 } from '@iwsdk/core';
import { BallManager, CUE_BALL_ID } from './balls';
import { PhysicsEngine } from './physics';
import { CueStick } from './cue';
import { AudioManager } from './audio';
import { TABLE_HEIGHT, TABLE_LENGTH, TABLE_WIDTH } from './table';
import { AIOpponent, AIDifficulty } from './ai';
import { AchievementManager } from './achievements';
import type { SpinSystem } from './spin';
import type { EffectsManager } from './effects';

export type GameMode = '8ball' | '9ball' | 'freeplay' | 'trickshot';
export type GameState = 'title' | 'mode_select' | 'difficulty_select' | 'playing' | 'aiming' | 'shooting' | 'watching' | 'ball_in_hand' | 'game_over' | 'paused' | 'settings' | 'leaderboard' | 'achievements' | 'help';
export type PlayerAssignment = 'solids' | 'stripes' | 'none';

export interface Player {
  name: string;
  assignment: PlayerAssignment;
  score: number;
  ballsPocketed: number[];
  fouls: number;
  isAI: boolean;
}

export interface TrickShot {
  name: string;
  description: string;
  setupFn: (bm: BallManager) => void;
  targetPockets: number[];
  maxShots: number;
}

export interface MatchState {
  bestOf: number;
  p1Wins: number;
  p2Wins: number;
  currentGame: number;
}

export class GameManager {
  ballManager: BallManager;
  physics: PhysicsEngine;
  cueStick: CueStick;
  audio: AudioManager;
  effects: EffectsManager;

  state: GameState = 'title';
  mode: GameMode = '8ball';
  isPaused: boolean = false;

  players: Player[] = [];
  currentPlayerIndex: number = 0;
  assignmentsDone: boolean = false;

  shotCount: number = 0;
  message: string = '';
  messageTimer: number = 0;

  // AI
  ai: AIOpponent;
  useAI: boolean = false;
  aiDifficulty: AIDifficulty = 'medium';
  selectedModeForDifficulty: GameMode = '8ball';

  // Match play
  match: MatchState | null = null;
  matchEnabled: boolean = false;

  // Trick shot state
  trickShots: TrickShot[] = [];
  currentTrickIndex: number = 0;
  trickShotsRemaining: number = 0;

  // Stats
  totalGames: number = 0;
  bestStreak: number = 0;
  currentStreak: number = 0;

  // Leaderboard
  leaderboard: { name: string; mode: string; shots: number; date: string }[] = [];

  achievements: AchievementManager;
  spinSystem: SpinSystem | null = null;
  isBreakShot: boolean = false;
  currentGameFouls: number = 0;

  onUIUpdate: (() => void) | null = null;
  onAchievementUnlock: ((ach: { id: string; name: string; description: string; icon: string; unlocked: boolean }) => void) | null = null;

  constructor(ballManager: BallManager, physics: PhysicsEngine, cueStick: CueStick, audio: AudioManager, effects: EffectsManager) {
    this.ballManager = ballManager;
    this.physics = physics;
    this.cueStick = cueStick;
    this.audio = audio;
    this.effects = effects;
    this.ai = new AIOpponent('medium');
    this.achievements = new AchievementManager();

    this.achievements.onUnlock = (ach) => {
      if (this.onAchievementUnlock) {
        this.onAchievementUnlock(ach);
      }
    };

    this.loadStats();
    this.initTrickShots();
  }

  setSpinSystem(spin: SpinSystem): void {
    this.spinSystem = spin;
  }

  showTitle(): void {
    this.state = 'title';
    this.cueStick.hide();
    this.match = null;
    this.matchEnabled = false;
  }

  showModeSelect(): void {
    this.state = 'mode_select';
  }

  showDifficultySelect(mode: GameMode): void {
    this.selectedModeForDifficulty = mode;
    this.state = 'difficulty_select';
  }

  startGameWithAI(mode: GameMode, difficulty: AIDifficulty): void {
    this.useAI = true;
    this.aiDifficulty = difficulty;
    this.ai.setDifficultyParams(difficulty);
    this.startGame(mode);
  }

  startGameLocal(mode: GameMode): void {
    this.useAI = false;
    this.startGame(mode);
  }

  startGame(mode: GameMode): void {
    this.mode = mode;
    this.state = 'aiming';
    this.isPaused = false;
    this.shotCount = 0;
    this.assignmentsDone = false;
    this.currentStreak = 0;
    this.isBreakShot = true;
    this.currentGameFouls = 0;

    // Reset spin
    if (this.spinSystem) this.spinSystem.reset();

    // Initialize players
    const p2Name = this.useAI
      ? `CPU (${this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1)})`
      : mode === 'freeplay' ? 'Free Play' : 'Player 2';

    this.players = [
      { name: 'Player 1', assignment: 'none', score: 0, ballsPocketed: [], fouls: 0, isAI: false },
      { name: p2Name, assignment: 'none', score: 0, ballsPocketed: [], fouls: 0, isAI: this.useAI },
    ];
    this.currentPlayerIndex = 0;

    // Initialize match if enabled
    if (this.matchEnabled && !this.match) {
      this.match = { bestOf: 3, p1Wins: 0, p2Wins: 0, currentGame: 1 };
    }

    // Create and rack balls
    this.ballManager.createBalls();
    if (mode === '9ball') {
      this.ballManager.rack9Ball();
    } else if (mode === 'trickshot') {
      this.currentTrickIndex = 0;
      this.setupCurrentTrick();
    } else {
      this.ballManager.rackBalls();
    }

    // Show cue
    this.cueStick.show();
    this.cueStick.setAimAngle(Math.PI);

    this.audio.playGameStart();
    this.showMessage('BREAK!', 2.0);
  }

  isCurrentPlayerAI(): boolean {
    const player = this.players[this.currentPlayerIndex];
    return player?.isAI ?? false;
  }

  onShot(): void {
    this.state = 'shooting';
    this.shotCount++;
    this.physics.resetShotTracking();

    // Track spin usage for achievements
    if (this.spinSystem) {
      const spin = this.spinSystem.spin;
      this.achievements.checkAchievements({
        spinUsed: {
          back: spin.y < -0.3,
          top: spin.y > 0.3,
          english: Math.abs(spin.x) > 0.3,
        },
      });
    }

    setTimeout(() => {
      if (this.state === 'shooting') {
        this.state = 'watching';
      }
    }, 100);
  }

  onShotComplete(physics: PhysicsEngine): void {
    const pocketed = physics.pocketedThisShot;
    const firstHit = physics.firstHitBallId;
    const cueScratch = physics.cueBallPocketed;
    const currentPlayer = this.players[this.currentPlayerIndex];

    if (this.mode === 'freeplay') {
      if (cueScratch) {
        this.handleBallInHand();
        this.showMessage('SCRATCH', 1.5);
      } else {
        this.state = 'aiming';
        this.cueStick.show();
        this.checkAndStartAI();
      }
      return;
    }

    if (this.mode === 'trickshot') {
      this.handleTrickShotResult(pocketed);
      return;
    }

    // Check for fouls
    let foul = false;

    if (cueScratch) {
      foul = true;
      this.showMessage('SCRATCH!', 2.0);
      this.audio.playScratch();
    } else if (firstHit === -1 && pocketed.length === 0) {
      foul = true;
      this.showMessage('NO CONTACT', 2.0);
    } else if (this.mode === '8ball' && this.assignmentsDone) {
      const targetGroup = currentPlayer.assignment === 'solids'
        ? [1, 2, 3, 4, 5, 6, 7]
        : [9, 10, 11, 12, 13, 14, 15];

      const ownBalls = this.ballManager.balls.filter(
        b => targetGroup.includes(b.id) && !b.pocketed
      );
      if (ownBalls.length === 0) {
        if (firstHit !== 8) {
          foul = true;
          this.showMessage('MUST HIT 8-BALL', 2.0);
        }
      } else if (!targetGroup.includes(firstHit)) {
        foul = true;
        this.showMessage('WRONG BALL', 2.0);
      }
    } else if (this.mode === '9ball') {
      const lowestActive = this.ballManager.getActiveBalls()
        .filter(b => b.id !== CUE_BALL_ID)
        .sort((a, b) => a.id - b.id)[0];
      if (lowestActive && firstHit !== lowestActive.id) {
        foul = true;
        this.showMessage(`MUST HIT ${lowestActive.id}-BALL`, 2.0);
      }
    }

    if (foul) {
      currentPlayer.fouls++;
      this.currentGameFouls++;
      if (cueScratch) {
        this.handleBallInHand();
      } else {
        this.switchPlayer();
        this.state = 'aiming';
        this.cueStick.show();
        this.checkAndStartAI();
      }
      return;
    }

    // Process pocketed balls
    const objectBallsPocketed = pocketed.filter(id => id !== CUE_BALL_ID);

    if (this.mode === '8ball') {
      if (!this.assignmentsDone && objectBallsPocketed.length > 0) {
        const first = objectBallsPocketed[0];
        if (first >= 1 && first <= 7) {
          currentPlayer.assignment = 'solids';
          this.players[1 - this.currentPlayerIndex].assignment = 'stripes';
          this.assignmentsDone = true;
          this.showMessage(`${currentPlayer.name}: SOLIDS`, 2.0);
        } else if (first >= 9 && first <= 15) {
          currentPlayer.assignment = 'stripes';
          this.players[1 - this.currentPlayerIndex].assignment = 'solids';
          this.assignmentsDone = true;
          this.showMessage(`${currentPlayer.name}: STRIPES`, 2.0);
        }
      }

      if (objectBallsPocketed.includes(8)) {
        if (this.assignmentsDone) {
          const targetGroup = currentPlayer.assignment === 'solids'
            ? [1, 2, 3, 4, 5, 6, 7]
            : [9, 10, 11, 12, 13, 14, 15];
          const ownRemaining = this.ballManager.balls.filter(
            b => targetGroup.includes(b.id) && !b.pocketed
          );
          if (ownRemaining.length === 0) {
            this.showMessage(`${currentPlayer.name} WINS!`, 3.0);
            this.audio.playWin();
            this.endGame(this.currentPlayerIndex);
            return;
          }
        }
        this.showMessage(`${currentPlayer.name} LOSES (early 8-ball)`, 3.0);
        this.audio.playLose();
        this.endGame(1 - this.currentPlayerIndex);
        return;
      }

      for (const id of objectBallsPocketed) {
        currentPlayer.ballsPocketed.push(id);
      }
    }

    if (this.mode === '9ball') {
      if (objectBallsPocketed.includes(9)) {
        this.showMessage(`${currentPlayer.name} WINS!`, 3.0);
        this.audio.playWin();
        this.endGame(this.currentPlayerIndex);
        return;
      }
      for (const id of objectBallsPocketed) {
        currentPlayer.ballsPocketed.push(id);
        currentPlayer.score += id;
      }
    }

    if (objectBallsPocketed.length > 0 && !foul) {
      this.currentStreak++;
      this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
      this.showMessage('NICE SHOT!', 1.0);

      // Achievement checks for pocketing
      this.achievements.checkAchievements({
        ballsPocketed: objectBallsPocketed.length,
        consecutivePockets: this.currentStreak,
        multiPocket: objectBallsPocketed.length >= 2,
        breakPocket: this.isBreakShot,
      });
    } else {
      this.currentStreak = 0;
      this.switchPlayer();
    }

    this.isBreakShot = false;
    this.state = 'aiming';
    this.cueStick.show();
    this.cueStick.setAimAngle(this.cueStick.aimAngle);
    if (this.spinSystem) this.spinSystem.reset();
    this.checkAndStartAI();
  }

  handleBallInHand(): void {
    this.state = 'ball_in_hand';
    const cueBall = this.ballManager.getCueBall();
    if (cueBall) {
      cueBall.pocketed = false;
      cueBall.position.set(0, TABLE_HEIGHT + 0.028, TABLE_LENGTH / 4);
      cueBall.velocity.set(0, 0, 0);
    }
    this.switchPlayer();

    if (this.isCurrentPlayerAI()) {
      this.showMessage('CPU PLACING BALL...', 2.0);
      // AI places cue ball after a brief delay
      setTimeout(() => {
        if (this.state === 'ball_in_hand' && this.isCurrentPlayerAI()) {
          this.ai.placeCueBall(this);
          this.placeCueBall();
        }
      }, 1500);
    } else {
      this.showMessage('BALL IN HAND - Click to place', 3.0);
    }
  }

  placeCueBall(): void {
    if (this.state !== 'ball_in_hand') return;
    this.state = 'aiming';
    this.cueStick.show();
    this.showMessage('YOUR SHOT', 1.0);
    this.checkAndStartAI();
  }

  // Check if it's AI's turn and start thinking
  checkAndStartAI(): void {
    if (this.isCurrentPlayerAI() && this.state === 'aiming') {
      this.showMessage(`${this.players[this.currentPlayerIndex].name} thinking...`, 5.0);
      this.ai.startThinking(this);
    }
  }

  switchPlayer(): void {
    if (this.mode === 'freeplay') return;
    this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    this.currentStreak = 0;
    this.audio.playTurnChange();
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  showMessage(text: string, duration: number): void {
    this.message = text;
    this.messageTimer = duration;
  }

  update(dt: number): void {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.message = '';
      }
    }

    // Update AI if it's AI's turn
    if (this.isCurrentPlayerAI() && !this.isPaused) {
      this.ai.update(dt, this, this.cueStick, this.audio);
    }
  }

  endGame(winnerIndex: number): void {
    this.state = 'game_over';
    this.totalGames++;
    this.cueStick.hide();

    // Achievement checks
    const isPlayerWin = winnerIndex === 0;
    const noFouls = this.players[winnerIndex].fouls === 0;
    this.achievements.checkAchievements({
      gameCompleted: true,
      gameWon: isPlayerWin,
      noFouls: isPlayerWin && noFouls,
      difficulty: this.useAI ? this.aiDifficulty : undefined,
      mode: this.mode,
    });

    // Update match state
    if (this.match) {
      if (winnerIndex === 0) this.match.p1Wins++;
      else this.match.p2Wins++;

      const neededWins = Math.ceil(this.match.bestOf / 2);
      if (this.match.p1Wins >= neededWins || this.match.p2Wins >= neededWins) {
        // Match over
        const matchWinner = this.match.p1Wins >= neededWins ? this.players[0].name : this.players[1].name;
        this.showMessage(`${matchWinner} WINS THE MATCH! (${this.match.p1Wins}-${this.match.p2Wins})`, 4.0);
        const matchWonByPlayer = this.match.p1Wins >= neededWins;
        this.achievements.checkAchievements({ matchWon: matchWonByPlayer });
        this.match = null;
      } else {
        this.match.currentGame++;
        this.showMessage(`Game ${this.match.currentGame - 1} complete! (${this.match.p1Wins}-${this.match.p2Wins})`, 3.0);
      }
    }

    const entry = {
      name: this.players[winnerIndex].name,
      mode: this.mode,
      shots: this.shotCount,
      date: new Date().toISOString().slice(0, 10),
    };
    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => a.shots - b.shots);
    this.leaderboard = this.leaderboard.slice(0, 20);
    this.saveStats();
  }

  // Continue match (next game in series)
  continueMatch(): void {
    if (!this.match) return;
    this.startGame(this.mode);
  }

  hasMatchPending(): boolean {
    return this.match !== null;
  }

  getMatchStatus(): string {
    if (!this.match) return '';
    return `Game ${this.match.currentGame} of ${this.match.bestOf} | ${this.match.p1Wins}-${this.match.p2Wins}`;
  }

  private initTrickShots(): void {
    const HL = TABLE_LENGTH / 2;
    const HW = TABLE_WIDTH / 2;

    this.trickShots = [
      {
        name: 'Straight Shot',
        description: 'Pocket the 1-ball in the corner',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id !== 0 && b.id !== 1) b.pocketed = true;
          }
          const b1 = bm.getBall(1)!;
          b1.position.set(0, TABLE_HEIGHT + 0.028, -HL * 0.3);
          const cue = bm.getCueBall()!;
          cue.position.set(0, TABLE_HEIGHT + 0.028, HL * 0.3);
        },
        targetPockets: [1],
        maxShots: 1,
      },
      {
        name: 'Bank Shot',
        description: 'Use the rail to pocket the 2-ball',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id !== 0 && b.id !== 2) b.pocketed = true;
          }
          const b2 = bm.getBall(2)!;
          b2.position.set(HW * 0.4, TABLE_HEIGHT + 0.028, -HL * 0.5);
          const cue = bm.getCueBall()!;
          cue.position.set(-HW * 0.3, TABLE_HEIGHT + 0.028, HL * 0.3);
        },
        targetPockets: [2],
        maxShots: 2,
      },
      {
        name: 'Combo Shot',
        description: 'Hit the 1 into the 3 to pocket the 3',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id !== 0 && b.id !== 1 && b.id !== 3) b.pocketed = true;
          }
          const b1 = bm.getBall(1)!;
          b1.position.set(0, TABLE_HEIGHT + 0.028, 0);
          const b3 = bm.getBall(3)!;
          b3.position.set(0, TABLE_HEIGHT + 0.028, -HL * 0.5);
          const cue = bm.getCueBall()!;
          cue.position.set(0, TABLE_HEIGHT + 0.028, HL * 0.4);
        },
        targetPockets: [3],
        maxShots: 1,
      },
      {
        name: 'Three Ball Run',
        description: 'Pocket all 3 balls in order',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id > 3) b.pocketed = true;
          }
          const b1 = bm.getBall(1)!;
          b1.position.set(-HW * 0.3, TABLE_HEIGHT + 0.028, -HL * 0.3);
          const b2 = bm.getBall(2)!;
          b2.position.set(HW * 0.3, TABLE_HEIGHT + 0.028, -HL * 0.5);
          const b3 = bm.getBall(3)!;
          b3.position.set(0, TABLE_HEIGHT + 0.028, HL * 0.2);
          const cue = bm.getCueBall()!;
          cue.position.set(0, TABLE_HEIGHT + 0.028, HL * 0.5);
        },
        targetPockets: [1, 2, 3],
        maxShots: 3,
      },
      // --- NEW TRICK SHOTS ---
      {
        name: 'Double Kiss',
        description: 'Pocket two balls with one shot',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id !== 0 && b.id !== 1 && b.id !== 2) b.pocketed = true;
          }
          // 1-ball near top-left pocket, 2-ball near top-right pocket
          const b1 = bm.getBall(1)!;
          b1.position.set(-HW * 0.5, TABLE_HEIGHT + 0.028, -HL * 0.7);
          const b2 = bm.getBall(2)!;
          b2.position.set(HW * 0.5, TABLE_HEIGHT + 0.028, -HL * 0.7);
          const cue = bm.getCueBall()!;
          cue.position.set(0, TABLE_HEIGHT + 0.028, -HL * 0.3);
        },
        targetPockets: [1, 2],
        maxShots: 1,
      },
      {
        name: 'Long Rail',
        description: 'Bank off the long rail to pocket the 4-ball',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id !== 0 && b.id !== 4) b.pocketed = true;
          }
          const b4 = bm.getBall(4)!;
          b4.position.set(HW * 0.6, TABLE_HEIGHT + 0.028, 0);
          const cue = bm.getCueBall()!;
          cue.position.set(-HW * 0.4, TABLE_HEIGHT + 0.028, HL * 0.6);
        },
        targetPockets: [4],
        maxShots: 2,
      },
      {
        name: 'Cluster Break',
        description: 'Break the cluster and pocket any 2 balls',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id > 5) b.pocketed = true;
          }
          // Tight cluster of balls 1-5
          const positions = [
            [0, -HL * 0.2],
            [-0.03, -HL * 0.25],
            [0.03, -HL * 0.25],
            [-0.015, -HL * 0.15],
            [0.015, -HL * 0.15],
          ];
          for (let i = 1; i <= 5; i++) {
            const b = bm.getBall(i)!;
            const [x, z] = positions[i - 1];
            b.position.set(x, TABLE_HEIGHT + 0.028, z);
          }
          const cue = bm.getCueBall()!;
          cue.position.set(0, TABLE_HEIGHT + 0.028, HL * 0.5);
        },
        targetPockets: [1, 2, 3, 4, 5], // Any 2 of these
        maxShots: 2,
      },
      {
        name: 'Corner Pocket Sniper',
        description: 'Pocket balls in all 4 corner pockets',
        setupFn: (bm) => {
          bm.createBalls();
          for (const b of bm.balls) {
            if (b.id > 4) b.pocketed = true;
          }
          // One ball near each corner
          bm.getBall(1)!.position.set(-HW * 0.4, TABLE_HEIGHT + 0.028, -HL * 0.6);
          bm.getBall(2)!.position.set(HW * 0.4, TABLE_HEIGHT + 0.028, -HL * 0.6);
          bm.getBall(3)!.position.set(-HW * 0.4, TABLE_HEIGHT + 0.028, HL * 0.6);
          bm.getBall(4)!.position.set(HW * 0.4, TABLE_HEIGHT + 0.028, HL * 0.6);
          const cue = bm.getCueBall()!;
          cue.position.set(0, TABLE_HEIGHT + 0.028, 0);
        },
        targetPockets: [1, 2, 3, 4],
        maxShots: 4,
      },
    ];
  }

  private setupCurrentTrick(): void {
    if (this.currentTrickIndex >= this.trickShots.length) {
      this.showMessage('ALL TRICKS COMPLETE!', 3.0);
      this.audio.playWin();
      this.state = 'game_over';
      return;
    }
    const trick = this.trickShots[this.currentTrickIndex];
    trick.setupFn(this.ballManager);
    this.trickShotsRemaining = trick.maxShots;
    this.showMessage(`${trick.name}: ${trick.description}`, 3.0);
  }

  private handleTrickShotResult(pocketed: number[]): void {
    const trick = this.trickShots[this.currentTrickIndex];
    this.trickShotsRemaining--;

    const allPocketed = trick.targetPockets.every(
      id => this.ballManager.getBall(id)?.pocketed
    );

    // For "pocket any 2" type tricks (Cluster Break)
    const pocketedCount = trick.targetPockets.filter(
      id => this.ballManager.getBall(id)?.pocketed
    ).length;
    const isClusterTrick = trick.name === 'Cluster Break';
    const clusterComplete = isClusterTrick && pocketedCount >= 2;

    if (allPocketed || clusterComplete) {
      this.showMessage('TRICK COMPLETE!', 2.0);
      this.audio.playPocket();
      this.currentTrickIndex++;
      setTimeout(() => this.setupCurrentTrick(), 2500);
    } else if (this.trickShotsRemaining <= 0) {
      this.showMessage('FAILED - Try again', 2.0);
      this.trickShotsRemaining = trick.maxShots;
      trick.setupFn(this.ballManager);
    }

    this.state = 'aiming';
    this.cueStick.show();
  }

  loadStats(): void {
    try {
      const data = localStorage.getItem('phantom-pool-stats');
      if (data) {
        const parsed = JSON.parse(data);
        this.totalGames = parsed.totalGames || 0;
        this.bestStreak = parsed.bestStreak || 0;
        this.leaderboard = parsed.leaderboard || [];
      }
    } catch (e) { /* ignore */ }
  }

  saveStats(): void {
    try {
      localStorage.setItem('phantom-pool-stats', JSON.stringify({
        totalGames: this.totalGames,
        bestStreak: this.bestStreak,
        leaderboard: this.leaderboard,
      }));
    } catch (e) { /* ignore */ }
  }
}
