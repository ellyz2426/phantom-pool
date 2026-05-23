// Achievement System — Track and display player accomplishments
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;  // Emoji icon
  unlocked: boolean;
  unlockedDate?: string;
}

export type AchievementCallback = (achievement: Achievement) => void;

export class AchievementManager {
  achievements: Achievement[] = [];
  onUnlock: AchievementCallback | null = null;

  // Track stats for achievement progress
  stats = {
    totalGames: 0,
    gamesWon: 0,
    totalPocketed: 0,
    tricksCompleted: 0,
    perfectGames: 0,  // Won without a foul
    comboShots: 0,     // Multiple balls in one shot
    bankShots: 0,
    currentStreak: 0,
    longestStreak: 0,
    easyWins: 0,
    mediumWins: 0,
    hardWins: 0,
    matchesWon: 0,
    nineBallWins: 0,
    eightBallWins: 0,
    curveShotsLanded: 0, // Shots with side spin that pocket a ball
    backspinUsed: 0,
    topspinUsed: 0,
    firstBreakPocket: 0, // Times pocketed on the break
  };

  constructor() {
    this.initAchievements();
    this.loadProgress();
  }

  private initAchievements(): void {
    this.achievements = [
      {
        id: 'first_game',
        name: 'Rack \'Em Up',
        description: 'Complete your first game',
        icon: '🎱',
        unlocked: false,
      },
      {
        id: 'first_win',
        name: 'Winner',
        description: 'Win your first game',
        icon: '🏆',
        unlocked: false,
      },
      {
        id: 'break_master',
        name: 'Break Master',
        description: 'Pocket a ball on the break 3 times',
        icon: '💥',
        unlocked: false,
      },
      {
        id: 'combo_king',
        name: 'Combo King',
        description: 'Pocket 2+ balls in a single shot',
        icon: '👑',
        unlocked: false,
      },
      {
        id: 'streak_3',
        name: 'Hot Hand',
        description: 'Pocket 3 consecutive shots',
        icon: '🔥',
        unlocked: false,
      },
      {
        id: 'streak_5',
        name: 'On Fire',
        description: 'Pocket 5 consecutive shots',
        icon: '🔥🔥',
        unlocked: false,
      },
      {
        id: 'clean_sweep',
        name: 'Clean Sweep',
        description: 'Win without committing a foul',
        icon: '✨',
        unlocked: false,
      },
      {
        id: 'easy_conqueror',
        name: 'Getting Started',
        description: 'Beat the CPU on Easy difficulty',
        icon: '🤖',
        unlocked: false,
      },
      {
        id: 'medium_conqueror',
        name: 'Competitor',
        description: 'Beat the CPU on Medium difficulty',
        icon: '⚔️',
        unlocked: false,
      },
      {
        id: 'hard_conqueror',
        name: 'Pool Shark',
        description: 'Beat the CPU on Hard difficulty',
        icon: '🦈',
        unlocked: false,
      },
      {
        id: 'trickster',
        name: 'Trickster',
        description: 'Complete all 8 trick shots',
        icon: '🎯',
        unlocked: false,
      },
      {
        id: 'nine_ball_win',
        name: 'Nine Lives',
        description: 'Win a 9-Ball game',
        icon: '9️⃣',
        unlocked: false,
      },
      {
        id: 'spin_doctor',
        name: 'Spin Doctor',
        description: 'Use backspin, topspin, and english in a session',
        icon: '🌀',
        unlocked: false,
      },
      {
        id: 'match_champion',
        name: 'Match Champion',
        description: 'Win a best-of series match',
        icon: '🏅',
        unlocked: false,
      },
      {
        id: 'century',
        name: 'Century',
        description: 'Pocket 100 balls total',
        icon: '💯',
        unlocked: false,
      },
    ];
  }

  // Check and trigger achievements based on current state
  checkAchievements(context: {
    gameCompleted?: boolean;
    gameWon?: boolean;
    noFouls?: boolean;
    ballsPocketed?: number;
    consecutivePockets?: number;
    multiPocket?: boolean;
    breakPocket?: boolean;
    trickShotsCleared?: number;
    difficulty?: string;
    mode?: string;
    matchWon?: boolean;
    spinUsed?: { back: boolean; top: boolean; english: boolean };
  }): void {
    if (context.gameCompleted) {
      this.stats.totalGames++;
      this.tryUnlock('first_game');
    }

    if (context.gameWon) {
      this.stats.gamesWon++;
      this.tryUnlock('first_win');

      if (context.noFouls) {
        this.stats.perfectGames++;
        this.tryUnlock('clean_sweep');
      }

      if (context.difficulty === 'easy') {
        this.stats.easyWins++;
        this.tryUnlock('easy_conqueror');
      }
      if (context.difficulty === 'medium') {
        this.stats.mediumWins++;
        this.tryUnlock('medium_conqueror');
      }
      if (context.difficulty === 'hard') {
        this.stats.hardWins++;
        this.tryUnlock('hard_conqueror');
      }

      if (context.mode === '9ball') {
        this.stats.nineBallWins++;
        this.tryUnlock('nine_ball_win');
      }
    }

    if (context.ballsPocketed) {
      this.stats.totalPocketed += context.ballsPocketed;
      if (this.stats.totalPocketed >= 100) {
        this.tryUnlock('century');
      }
    }

    if (context.multiPocket) {
      this.stats.comboShots++;
      this.tryUnlock('combo_king');
    }

    if (context.breakPocket) {
      this.stats.firstBreakPocket++;
      if (this.stats.firstBreakPocket >= 3) {
        this.tryUnlock('break_master');
      }
    }

    if (context.consecutivePockets !== undefined) {
      this.stats.currentStreak = context.consecutivePockets;
      this.stats.longestStreak = Math.max(this.stats.longestStreak, context.consecutivePockets);
      if (context.consecutivePockets >= 3) this.tryUnlock('streak_3');
      if (context.consecutivePockets >= 5) this.tryUnlock('streak_5');
    }

    if (context.trickShotsCleared !== undefined && context.trickShotsCleared >= 8) {
      this.stats.tricksCompleted = context.trickShotsCleared;
      this.tryUnlock('trickster');
    }

    if (context.matchWon) {
      this.stats.matchesWon++;
      this.tryUnlock('match_champion');
    }

    if (context.spinUsed) {
      if (context.spinUsed.back) this.stats.backspinUsed++;
      if (context.spinUsed.top) this.stats.topspinUsed++;
      if (context.spinUsed.english) this.stats.curveShotsLanded++;
      if (this.stats.backspinUsed > 0 && this.stats.topspinUsed > 0 && this.stats.curveShotsLanded > 0) {
        this.tryUnlock('spin_doctor');
      }
    }

    this.saveProgress();
  }

  private tryUnlock(id: string): void {
    const achievement = this.achievements.find(a => a.id === id);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedDate = new Date().toISOString().slice(0, 10);
      if (this.onUnlock) {
        this.onUnlock(achievement);
      }
    }
  }

  getUnlockedCount(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }

  getTotalCount(): number {
    return this.achievements.length;
  }

  loadProgress(): void {
    try {
      const data = localStorage.getItem('phantom-pool-achievements');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.achievements) {
          for (const saved of parsed.achievements) {
            const ach = this.achievements.find(a => a.id === saved.id);
            if (ach) {
              ach.unlocked = saved.unlocked;
              ach.unlockedDate = saved.unlockedDate;
            }
          }
        }
        if (parsed.stats) {
          Object.assign(this.stats, parsed.stats);
        }
      }
    } catch (e) { /* ignore */ }
  }

  saveProgress(): void {
    try {
      localStorage.setItem('phantom-pool-achievements', JSON.stringify({
        achievements: this.achievements.map(a => ({
          id: a.id,
          unlocked: a.unlocked,
          unlockedDate: a.unlockedDate,
        })),
        stats: this.stats,
      }));
    } catch (e) { /* ignore */ }
  }
}
