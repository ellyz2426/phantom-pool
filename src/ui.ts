// UI System - All PanelUI spatial panels, zero HTML DOM
import {
  World,
  PanelUI,
  ScreenSpace,
  Follower,
  FollowBehavior,
  PanelDocument,
  UIKitDocument,
} from '@iwsdk/core';

import { GameManager, GameState } from './game';
import { BallManager } from './balls';
import { CueStick } from './cue';
import { AudioManager } from './audio';
import { CameraController } from './camera';
import type { SpinSystem } from './spin';
import type { AchievementManager, Achievement } from './achievements';

type UIKitElement = { text: { value: string }; addEventListener: (event: string, cb: () => void) => void } | null;

function setText(el: any, value: string): void {
  if (el?.text) el.text.value = value;
}

interface UIEntities {
  titleEntity: any;
  modeEntity: any;
  difficultyEntity: any;
  hudEntity: any;
  pauseEntity: any;
  gameOverEntity: any;
  settingsEntity: any;
  leaderboardEntity: any;
  messageEntity: any;
  cameraEntity: any;
  spinEntity: any;
  achievementToastEntity: any;
  achievementsEntity: any;
}

export interface UISystem {
  update: (game: GameManager, ballManager: BallManager, cue: CueStick) => void;
  updatePause: (isPaused: boolean) => void;
  updateCameraMode: (mode: string) => void;
  updateSpin: (spinLabel: string) => void;
  showAchievement: (achievement: Achievement) => void;
}

export function setupUI(world: World, game: GameManager, audio: AudioManager, cameraCtrl?: CameraController, spinSystem?: SpinSystem): UISystem {
  const entities: UIEntities = {} as any;

  // ---- TITLE SCREEN (world-space, in front of table) ----
  const titleEntity = world.createTransformEntity(undefined, { persistent: true });
  titleEntity.object3D.position.set(0, 1.8, -2.0);
  titleEntity.addComponent(PanelUI, {
    config: '/ui/title.json',
    maxWidth: 1.2,
    maxHeight: 0.9,
  });
  entities.titleEntity = titleEntity;

  // ---- MODE SELECT (world-space) ----
  const modeEntity = world.createTransformEntity(undefined, { persistent: true });
  modeEntity.object3D.position.set(0, 1.6, -1.8);
  modeEntity.addComponent(PanelUI, {
    config: '/ui/modes.json',
    maxWidth: 1.0,
    maxHeight: 0.8,
  });
  entities.modeEntity = modeEntity;

  // ---- DIFFICULTY SELECT (world-space) ----
  const difficultyEntity = world.createTransformEntity(undefined, { persistent: true });
  difficultyEntity.object3D.position.set(0, 1.6, -1.8);
  difficultyEntity.addComponent(PanelUI, {
    config: '/ui/difficulty.json',
    maxWidth: 1.0,
    maxHeight: 1.0,
  });
  entities.difficultyEntity = difficultyEntity;

  // ---- HUD (head-following) ----
  const hudEntity = world.createTransformEntity(undefined, { persistent: true });
  hudEntity.addComponent(PanelUI, {
    config: '/ui/hud.json',
    maxWidth: 0.35,
    maxHeight: 0.14,
  });
  hudEntity.addComponent(Follower, {
    target: world.player.head,
    offsetPosition: [0.22, -0.12, -0.5],
    behavior: FollowBehavior.PivotY,
    speed: 5,
    tolerance: 0.3,
  });
  entities.hudEntity = hudEntity;

  // ---- SPIN INDICATOR HUD (head-following, left side) ----
  const spinEntity = world.createTransformEntity(undefined, { persistent: true });
  spinEntity.addComponent(PanelUI, {
    config: '/ui/spin.json',
    maxWidth: 0.18,
    maxHeight: 0.08,
  });
  spinEntity.addComponent(Follower, {
    target: world.player.head,
    offsetPosition: [-0.22, -0.15, -0.5],
    behavior: FollowBehavior.PivotY,
    speed: 5,
    tolerance: 0.3,
  });
  entities.spinEntity = spinEntity;

  // ---- PAUSE MENU (world-space) ----
  const pauseEntity = world.createTransformEntity(undefined, { persistent: true });
  pauseEntity.object3D.position.set(0, 1.6, -1.5);
  pauseEntity.addComponent(PanelUI, {
    config: '/ui/pause.json',
    maxWidth: 0.6,
    maxHeight: 0.5,
  });
  entities.pauseEntity = pauseEntity;

  // ---- GAME OVER (world-space) ----
  const gameOverEntity = world.createTransformEntity(undefined, { persistent: true });
  gameOverEntity.object3D.position.set(0, 1.6, -1.5);
  gameOverEntity.addComponent(PanelUI, {
    config: '/ui/gameover.json',
    maxWidth: 0.8,
    maxHeight: 0.7,
  });
  entities.gameOverEntity = gameOverEntity;

  // ---- SETTINGS (world-space) ----
  const settingsEntity = world.createTransformEntity(undefined, { persistent: true });
  settingsEntity.object3D.position.set(0, 1.6, -1.8);
  settingsEntity.addComponent(PanelUI, {
    config: '/ui/settings.json',
    maxWidth: 0.8,
    maxHeight: 0.7,
  });
  entities.settingsEntity = settingsEntity;

  // ---- LEADERBOARD (world-space) ----
  const leaderboardEntity = world.createTransformEntity(undefined, { persistent: true });
  leaderboardEntity.object3D.position.set(0, 1.6, -1.8);
  leaderboardEntity.addComponent(PanelUI, {
    config: '/ui/leaderboard.json',
    maxWidth: 0.8,
    maxHeight: 0.7,
  });
  entities.leaderboardEntity = leaderboardEntity;

  // ---- ACHIEVEMENTS PANEL (world-space) ----
  const achievementsEntity = world.createTransformEntity(undefined, { persistent: true });
  achievementsEntity.object3D.position.set(0, 1.6, -1.8);
  achievementsEntity.addComponent(PanelUI, {
    config: '/ui/achievements.json',
    maxWidth: 1.0,
    maxHeight: 1.2,
  });
  entities.achievementsEntity = achievementsEntity;

  // ---- MESSAGE TOAST (head-following, top center) ----
  const messageEntity = world.createTransformEntity(undefined, { persistent: true });
  messageEntity.addComponent(PanelUI, {
    config: '/ui/message.json',
    maxWidth: 0.4,
    maxHeight: 0.08,
  });
  messageEntity.addComponent(Follower, {
    target: world.player.head,
    offsetPosition: [0, 0.1, -0.5],
    behavior: FollowBehavior.PivotY,
    speed: 8,
    tolerance: 0.2,
  });
  entities.messageEntity = messageEntity;

  // ---- ACHIEVEMENT TOAST (head-following, bottom center) ----
  const achievementToastEntity = world.createTransformEntity(undefined, { persistent: true });
  achievementToastEntity.addComponent(PanelUI, {
    config: '/ui/achievement.json',
    maxWidth: 0.45,
    maxHeight: 0.1,
  });
  achievementToastEntity.addComponent(Follower, {
    target: world.player.head,
    offsetPosition: [0, -0.22, -0.5],
    behavior: FollowBehavior.PivotY,
    speed: 6,
    tolerance: 0.2,
  });
  entities.achievementToastEntity = achievementToastEntity;

  // ---- CAMERA MODE INDICATOR (head-following, bottom right) ----
  const cameraEntity = world.createTransformEntity(undefined, { persistent: true });
  cameraEntity.addComponent(PanelUI, {
    config: '/ui/camera.json',
    maxWidth: 0.2,
    maxHeight: 0.05,
  });
  cameraEntity.addComponent(Follower, {
    target: world.player.head,
    offsetPosition: [0.25, -0.2, -0.5],
    behavior: FollowBehavior.PivotY,
    speed: 5,
    tolerance: 0.3,
  });
  entities.cameraEntity = cameraEntity;

  // Wire up button events after panel initialization
  setTimeout(() => wireEvents(entities, game, audio, cameraCtrl), 500);

  let lastState: GameState | null = null;
  let achievementToastTimer = 0;

  function update(game: GameManager, ballManager: BallManager, cue: CueStick) {
    const state = game.state;
    const isPlaying = state === 'aiming' || state === 'shooting' || state === 'watching' || state === 'ball_in_hand';

    // Visibility
    setVisible(entities.titleEntity, state === 'title');
    setVisible(entities.modeEntity, state === 'mode_select');
    setVisible(entities.difficultyEntity, state === 'difficulty_select');
    setVisible(entities.hudEntity, isPlaying);
    setVisible(entities.spinEntity, state === 'aiming');
    setVisible(entities.pauseEntity, game.isPaused);
    setVisible(entities.gameOverEntity, state === 'game_over');
    setVisible(entities.settingsEntity, state === 'settings');
    setVisible(entities.leaderboardEntity, state === 'leaderboard');
    setVisible(entities.achievementsEntity, state === 'achievements' as GameState);
    setVisible(entities.messageEntity, game.message !== '');
    setVisible(entities.cameraEntity, isPlaying);

    // Achievement toast timer
    if (achievementToastTimer > 0) {
      achievementToastTimer -= 1 / 60; // Approximate dt
      setVisible(entities.achievementToastEntity, true);
      if (achievementToastTimer <= 0) {
        setVisible(entities.achievementToastEntity, false);
      }
    } else {
      setVisible(entities.achievementToastEntity, false);
    }

    // Update HUD values
    if (isPlaying) {
      updateHUD(entities.hudEntity, game, ballManager, cue);
    }

    // Update spin indicator
    if (state === 'aiming' && spinSystem) {
      const spinDoc = getDoc(entities.spinEntity);
      if (spinDoc) {
        setText(spinDoc.getElementById('spin-text'), spinSystem.getSpinLabel());
      }
    }

    // Update message
    if (game.message) {
      updateMessage(entities.messageEntity, game.message);
    }

    // Update game over screen
    if (state === 'game_over' && lastState !== 'game_over') {
      updateGameOver(entities.gameOverEntity, game);
    }

    // Update difficulty select mode label
    if (state === 'difficulty_select') {
      const diffDoc = getDoc(entities.difficultyEntity);
      if (diffDoc) {
        setText(diffDoc.getElementById('mode-label'), game.selectedModeForDifficulty.toUpperCase().replace('BALL', '-BALL'));
      }
    }

    // Update leaderboard
    if (state === 'leaderboard') {
      updateLeaderboard(entities.leaderboardEntity, game);
    }

    // Update achievements panel
    if (state === 'achievements' as GameState) {
      updateAchievementsPanel(entities.achievementsEntity, game.achievements);
    }

    lastState = state;
  }

  function updatePause(isPaused: boolean) {
    setVisible(entities.pauseEntity, isPaused);
  }

  function updateCameraMode(modeName: string) {
    const doc = getDoc(entities.cameraEntity);
    if (doc) {
      setText(doc.getElementById('cam-mode-text'), modeName);
    }
  }

  function updateSpin(spinLabel: string) {
    const doc = getDoc(entities.spinEntity);
    if (doc) {
      setText(doc.getElementById('spin-text'), spinLabel);
    }
  }

  function showAchievement(achievement: Achievement) {
    const doc = getDoc(entities.achievementToastEntity);
    if (doc) {
      setText(doc.getElementById('ach-icon'), achievement.icon);
      setText(doc.getElementById('ach-name'), achievement.name);
      setText(doc.getElementById('ach-desc'), achievement.description);
    }
    achievementToastTimer = 4.0; // Show for 4 seconds
  }

  return { update, updatePause, updateCameraMode, updateSpin, showAchievement };
}

function setVisible(entity: any, visible: boolean) {
  if (entity?.object3D) {
    entity.object3D.visible = visible;
  }
}

function getDoc(entity: any): UIKitDocument | undefined {
  return entity?.getValue?.(PanelDocument, 'document') as UIKitDocument | undefined;
}

function wireEvents(entities: UIEntities, game: GameManager, audio: AudioManager, cameraCtrl?: CameraController) {
  // Title buttons
  const titleDoc = getDoc(entities.titleEntity);
  if (titleDoc) {
    titleDoc.getElementById('play-btn')?.addEventListener('click', () => game.showModeSelect());
    titleDoc.getElementById('settings-btn')?.addEventListener('click', () => { game.state = 'settings'; });
    titleDoc.getElementById('leaderboard-btn')?.addEventListener('click', () => { game.state = 'leaderboard'; });
    titleDoc.getElementById('achievements-btn')?.addEventListener('click', () => { game.state = 'achievements' as any; });
  }

  // Mode select buttons
  const modeDoc = getDoc(entities.modeEntity);
  if (modeDoc) {
    modeDoc.getElementById('mode-8ball')?.addEventListener('click', () => game.showDifficultySelect('8ball'));
    modeDoc.getElementById('mode-9ball')?.addEventListener('click', () => game.showDifficultySelect('9ball'));
    modeDoc.getElementById('mode-freeplay')?.addEventListener('click', () => game.startGameLocal('freeplay'));
    modeDoc.getElementById('mode-trickshot')?.addEventListener('click', () => game.startGameLocal('trickshot'));
    modeDoc.getElementById('back-btn')?.addEventListener('click', () => game.showTitle());
  }

  // Difficulty select buttons
  const diffDoc = getDoc(entities.difficultyEntity);
  if (diffDoc) {
    diffDoc.getElementById('diff-easy')?.addEventListener('click', () => game.startGameWithAI(game.selectedModeForDifficulty, 'easy'));
    diffDoc.getElementById('diff-medium')?.addEventListener('click', () => game.startGameWithAI(game.selectedModeForDifficulty, 'medium'));
    diffDoc.getElementById('diff-hard')?.addEventListener('click', () => game.startGameWithAI(game.selectedModeForDifficulty, 'hard'));
    diffDoc.getElementById('local-2p')?.addEventListener('click', () => game.startGameLocal(game.selectedModeForDifficulty));
    diffDoc.getElementById('back-btn')?.addEventListener('click', () => game.showModeSelect());
  }

  // Pause buttons
  const pauseDoc = getDoc(entities.pauseEntity);
  if (pauseDoc) {
    pauseDoc.getElementById('resume-btn')?.addEventListener('click', () => game.togglePause());
    pauseDoc.getElementById('quit-btn')?.addEventListener('click', () => game.showTitle());
  }

  // Game over buttons
  const gameOverDoc = getDoc(entities.gameOverEntity);
  if (gameOverDoc) {
    gameOverDoc.getElementById('replay-btn')?.addEventListener('click', () => {
      if (game.hasMatchPending()) {
        game.continueMatch();
      } else {
        game.startGame(game.mode);
      }
    });
    gameOverDoc.getElementById('menu-btn')?.addEventListener('click', () => game.showTitle());
  }

  // Settings buttons
  const settingsDoc = getDoc(entities.settingsEntity);
  if (settingsDoc) {
    settingsDoc.getElementById('back-btn')?.addEventListener('click', () => game.showTitle());

    const volStep = 0.1;
    settingsDoc.getElementById('master-down')?.addEventListener('click', () => {
      audio.setMasterVolume(Math.max(0, audio.masterVolume - volStep));
      setText(settingsDoc.getElementById('master-vol'), `${Math.round(audio.masterVolume * 100)}%`);
    });
    settingsDoc.getElementById('master-up')?.addEventListener('click', () => {
      audio.setMasterVolume(Math.min(1, audio.masterVolume + volStep));
      setText(settingsDoc.getElementById('master-vol'), `${Math.round(audio.masterVolume * 100)}%`);
    });
    settingsDoc.getElementById('sfx-down')?.addEventListener('click', () => {
      audio.setSfxVolume(Math.max(0, audio.sfxVolume - volStep));
      setText(settingsDoc.getElementById('sfx-vol'), `${Math.round(audio.sfxVolume * 100)}%`);
    });
    settingsDoc.getElementById('sfx-up')?.addEventListener('click', () => {
      audio.setSfxVolume(Math.min(1, audio.sfxVolume + volStep));
      setText(settingsDoc.getElementById('sfx-vol'), `${Math.round(audio.sfxVolume * 100)}%`);
    });
    settingsDoc.getElementById('music-down')?.addEventListener('click', () => {
      audio.setMusicVolume(Math.max(0, audio.musicVolume - volStep));
      setText(settingsDoc.getElementById('music-vol'), `${Math.round(audio.musicVolume * 100)}%`);
    });
    settingsDoc.getElementById('music-up')?.addEventListener('click', () => {
      audio.setMusicVolume(Math.min(1, audio.musicVolume + volStep));
      setText(settingsDoc.getElementById('music-vol'), `${Math.round(audio.musicVolume * 100)}%`);
    });
  }

  // Leaderboard buttons
  const lbDoc = getDoc(entities.leaderboardEntity);
  if (lbDoc) {
    lbDoc.getElementById('back-btn')?.addEventListener('click', () => game.showTitle());
  }

  // Achievements buttons
  const achDoc = getDoc(entities.achievementsEntity);
  if (achDoc) {
    achDoc.getElementById('back-btn')?.addEventListener('click', () => game.showTitle());
  }
}

function updateHUD(entity: any, game: GameManager, ballManager: BallManager, cue: CueStick) {
  const doc = getDoc(entity);
  if (!doc) return;

  const player = game.players[game.currentPlayerIndex];
  const playerLabel = player?.name || '';
  const aiIndicator = player?.isAI ? ' 🤖' : '';
  setText(doc.getElementById('player-name'), playerLabel + aiIndicator);
  setText(doc.getElementById('mode-label'), game.mode.toUpperCase());
  setText(doc.getElementById('shots-count'), `Shots: ${game.shotCount}`);

  const assign = player?.assignment || 'none';
  const matchStatus = game.getMatchStatus();
  setText(doc.getElementById('assignment'), matchStatus || (assign === 'none' ? '' : assign.toUpperCase()));

  // Power bar
  const powerEl = doc.getElementById('power-bar');
  if (powerEl && cue.isCharging) {
    const ratio = cue.power / 8.0;
    setText(powerEl, '█'.repeat(Math.floor(ratio * 15)));
  } else if (powerEl) {
    setText(powerEl, '');
  }

  setText(doc.getElementById('solids-count'), `Solids: ${ballManager.getSolids().length}`);
  setText(doc.getElementById('stripes-count'), `Stripes: ${ballManager.getStripes().length}`);
}

function updateMessage(entity: any, message: string) {
  const doc = getDoc(entity);
  if (!doc) return;
  setText(doc.getElementById('message-text'), message);
}

function updateGameOver(entity: any, game: GameManager) {
  const doc = getDoc(entity);
  if (!doc) return;

  if (game.mode === 'trickshot') {
    setText(doc.getElementById('winner-text'), 'TRICKS COMPLETE!');
  } else {
    setText(doc.getElementById('winner-text'), game.message || 'GAME OVER');
  }

  let statsText = `Shots: ${game.shotCount} | Best Streak: ${game.bestStreak}`;
  if (game.hasMatchPending()) {
    const ms = game.match!;
    statsText += ` | Match: ${ms.p1Wins}-${ms.p2Wins}`;
  }
  setText(doc.getElementById('stats-text'), statsText);
}

function updateLeaderboard(entity: any, game: GameManager) {
  const doc = getDoc(entity);
  if (!doc) return;

  for (let i = 0; i < 10; i++) {
    const entry = game.leaderboard[i];
    if (entry) {
      setText(doc.getElementById(`lb-entry-${i}`), `${i + 1}. ${entry.name} - ${entry.mode} - ${entry.shots} shots - ${entry.date}`);
    } else {
      setText(doc.getElementById(`lb-entry-${i}`), `${i + 1}. ---`);
    }
  }
}

function updateAchievementsPanel(entity: any, achievements: AchievementManager) {
  const doc = getDoc(entity);
  if (!doc) return;

  setText(doc.getElementById('ach-counter'), `${achievements.getUnlockedCount()} / ${achievements.getTotalCount()}`);

  for (let i = 0; i < achievements.achievements.length && i < 15; i++) {
    const ach = achievements.achievements[i];
    if (ach.unlocked) {
      setText(doc.getElementById(`ach-i-${i}`), ach.icon);
      setText(doc.getElementById(`ach-n-${i}`), ach.name);
      setText(doc.getElementById(`ach-d-${i}`), ach.description);
    } else {
      setText(doc.getElementById(`ach-i-${i}`), '🔒');
      setText(doc.getElementById(`ach-n-${i}`), '???');
      setText(doc.getElementById(`ach-d-${i}`), '???');
    }
  }
}
