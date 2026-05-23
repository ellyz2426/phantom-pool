// Game Manager - game state, scoring, rules (8-ball and 9-ball)
import { Vector3 } from '@iwsdk/core';
import { BallManager, CUE_BALL_ID } from './balls';
import { PhysicsEngine } from './physics';
import { CueStick } from './cue';
import { AudioManager } from './audio';
import { TABLE_HEIGHT, TABLE_LENGTH, TABLE_WIDTH } from './table';

export type GameMode = '8ball' | '9ball' | 'freeplay' | 'trickshot';
export type GameState = 'title' | 'mode_select' | 'playing' | 'aiming' | 'shooting' | 'watching' | 'ball_in_hand' | 'game_over' | 'paused' | 'settings' | 'leaderboard';
export type PlayerAssignment = 'solids' | 'stripes' | 'none';

export interface Player {
  name: string;
  assignment: PlayerAssignment;
  score: number; // For 9-ball: accumulated ball values
  ballsPocketed: number[];
  fouls: number;
}

export interface TrickShot {
  name: string;
  description: string;
  setupFn: (bm: BallManager) => void;
  targetPockets: number[]; // Ball IDs that should be pocketed
  maxShots: number;
}

export class GameManager {
  ballManager: BallManager;
  physics: PhysicsEngine;
  cueStick: CueStick;
  audio: AudioManager;

  state: GameState = 'title';
  mode: GameMode = '8ball';
  isPaused: boolean = false;

  players: Player[] = [];
  currentPlayerIndex: number = 0;
  assignmentsDone: boolean = false;

  shotCount: number = 0;
  message: string = '';
  messageTimer: number = 0;

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

  onUIUpdate: (() => void) | null = null;

  constructor(ballManager: BallManager, physics: PhysicsEngine, cueStick: CueStick, audio: AudioManager) {
    this.ballManager = ballManager;
    this.physics = physics;
    this.cueStick = cueStick;
    this.audio = audio;

    this.loadStats();
    this.initTrickShots();
  }

  showTitle(): void {
    this.state = 'title';
    this.cueStick.hide();
  }

  showModeSelect(): void {
    this.state = 'mode_select';
  }

  startGame(mode: GameMode): void {
    this.mode = mode;
    this.state = 'aiming';
    this.isPaused = false;
    this.shotCount = 0;
    this.assignmentsDone = false;
    this.currentStreak = 0;

    // Initialize players
    this.players = [
      { name: 'Player 1', assignment: 'none', score: 0, ballsPocketed: [], fouls: 0 },
      { name: mode === 'freeplay' ? 'Free Play' : 'Player 2', assignment: 'none', score: 0, ballsPocketed: [], fouls: 0 },
    ];
    this.currentPlayerIndex = 0;

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
    this.cueStick.setAimAngle(Math.PI); // Aim toward rack

    this.audio.playGameStart();
    this.showMessage('BREAK!', 2.0);
  }

  onShot(): void {
    this.state = 'shooting';
    this.shotCount++;
    this.physics.resetShotTracking();

    // Brief delay before transitioning to watching
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
      // Must hit own group first
      const targetGroup = currentPlayer.assignment === 'solids'
        ? [1, 2, 3, 4, 5, 6, 7]
        : [9, 10, 11, 12, 13, 14, 15];

      // If all own balls pocketed, must hit 8 first
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
      // Must hit lowest numbered ball first
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
      if (cueScratch) {
        this.handleBallInHand();
      } else {
        this.switchPlayer();
        this.state = 'aiming';
        this.cueStick.show();
      }
      return;
    }

    // Process pocketed balls
    const objectBallsPocketed = pocketed.filter(id => id !== CUE_BALL_ID);

    if (this.mode === '8ball') {
      // Handle assignment on first pocket after break
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

      // Check 8-ball pocketed
      if (objectBallsPocketed.includes(8)) {
        // Check if player was supposed to pocket 8
        if (this.assignmentsDone) {
          const targetGroup = currentPlayer.assignment === 'solids'
            ? [1, 2, 3, 4, 5, 6, 7]
            : [9, 10, 11, 12, 13, 14, 15];
          const ownRemaining = this.ballManager.balls.filter(
            b => targetGroup.includes(b.id) && !b.pocketed
          );
          if (ownRemaining.length === 0) {
            // Win!
            this.showMessage(`${currentPlayer.name} WINS!`, 3.0);
            this.audio.playWin();
            this.endGame(this.currentPlayerIndex);
            return;
          }
        }
        // Early 8-ball pocket = loss
        this.showMessage(`${currentPlayer.name} LOSES (early 8-ball)`, 3.0);
        this.audio.playLose();
        this.endGame(1 - this.currentPlayerIndex);
        return;
      }

      // Track pocketed balls
      for (const id of objectBallsPocketed) {
        currentPlayer.ballsPocketed.push(id);
      }
    }

    if (this.mode === '9ball') {
      // Pocket 9-ball to win (if legal)
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

    // Continue or switch player
    if (objectBallsPocketed.length > 0 && !foul) {
      // Player continues
      this.currentStreak++;
      this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
      this.showMessage('NICE SHOT!', 1.0);
    } else {
      this.currentStreak = 0;
      this.switchPlayer();
    }

    this.state = 'aiming';
    this.cueStick.show();
    this.cueStick.setAimAngle(this.cueStick.aimAngle);
  }

  handleBallInHand(): void {
    this.state = 'ball_in_hand';
    // Restore cue ball to center of head area
    const cueBall = this.ballManager.getCueBall();
    if (cueBall) {
      cueBall.pocketed = false;
      cueBall.position.set(0, TABLE_HEIGHT + 0.028, TABLE_LENGTH / 4);
      cueBall.velocity.set(0, 0, 0);
    }
    this.switchPlayer();
    this.showMessage('BALL IN HAND - Click to place', 3.0);
  }

  placeCueBall(): void {
    if (this.state !== 'ball_in_hand') return;
    this.state = 'aiming';
    this.cueStick.show();
    this.showMessage('YOUR SHOT', 1.0);
  }

  switchPlayer(): void {
    if (this.mode === 'freeplay') return;
    this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    this.currentStreak = 0;
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
  }

  endGame(winnerIndex: number): void {
    this.state = 'game_over';
    this.totalGames++;
    this.cueStick.hide();

    // Save to leaderboard
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

  private initTrickShots(): void {
    const HL = TABLE_LENGTH / 2;
    const HW = TABLE_WIDTH / 2;

    this.trickShots = [
      {
        name: 'Straight Shot',
        description: 'Pocket the 1-ball in the corner',
        setupFn: (bm) => {
          bm.createBalls();
          // Only cue ball and 1-ball
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

    const targetPocketed = pocketed.filter(id => trick.targetPockets.includes(id));
    const allPocketed = trick.targetPockets.every(
      id => this.ballManager.getBall(id)?.pocketed
    );

    if (allPocketed) {
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
