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

// UIKit element type helper - elements use signals for reactive text
type UIKitElement = { text: { value: string }; addEventListener: (event: string, cb: () => void) => void } | null;

function setText(el: any, value: string): void {
  if (el?.text) el.text.value = value;
}

interface UIEntities {
  titleEntity: any;
  modeEntity: any;
  hudEntity: any;
  pauseEntity: any;
  gameOverEntity: any;
  settingsEntity: any;
  leaderboardEntity: any;
  messageEntity: any;
}

export interface UISystem {
  update: (game: GameManager, ballManager: BallManager, cue: CueStick) => void;
  updatePause: (isPaused: boolean) => void;
}

export function setupUI(world: World, game: GameManager, audio: AudioManager): UISystem {
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

  // ---- HUD (head-following) ----
  const hudEntity = world.createTransformEntity(undefined, { persistent: true });
  hudEntity.addComponent(PanelUI, {
    config: '/ui/hud.json',
    maxWidth: 0.35,
    maxHeight: 0.12,
  });
  hudEntity.addComponent(Follower, {
    target: world.player.head,
    offsetPosition: [0.22, -0.12, -0.5],
    behavior: FollowBehavior.PivotY,
    speed: 5,
    tolerance: 0.3,
  });
  entities.hudEntity = hudEntity;

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
    maxHeight: 0.6,
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

  // Wire up button events after a small delay for panel initialization
  setTimeout(() => wireEvents(entities, game, audio), 500);

  let lastState: GameState | null = null;

  function update(game: GameManager, ballManager: BallManager, cue: CueStick) {
    const state = game.state;

    // Visibility
    setVisible(entities.titleEntity, state === 'title');
    setVisible(entities.modeEntity, state === 'mode_select');
    setVisible(entities.hudEntity, state === 'aiming' || state === 'shooting' || state === 'watching' || state === 'ball_in_hand');
    setVisible(entities.pauseEntity, game.isPaused);
    setVisible(entities.gameOverEntity, state === 'game_over');
    setVisible(entities.settingsEntity, state === 'settings');
    setVisible(entities.leaderboardEntity, state === 'leaderboard');
    setVisible(entities.messageEntity, game.message !== '');

    // Update HUD values
    if (state === 'aiming' || state === 'shooting' || state === 'watching' || state === 'ball_in_hand') {
      updateHUD(entities.hudEntity, game, ballManager, cue);
    }

    // Update message
    if (game.message) {
      updateMessage(entities.messageEntity, game.message);
    }

    // Update game over screen
    if (state === 'game_over' && lastState !== 'game_over') {
      updateGameOver(entities.gameOverEntity, game);
    }

    // Update leaderboard
    if (state === 'leaderboard') {
      updateLeaderboard(entities.leaderboardEntity, game);
    }

    lastState = state;
  }

  function updatePause(isPaused: boolean) {
    setVisible(entities.pauseEntity, isPaused);
  }

  return { update, updatePause };
}

function setVisible(entity: any, visible: boolean) {
  if (entity?.object3D) {
    entity.object3D.visible = visible;
  }
}

function getDoc(entity: any): UIKitDocument | undefined {
  return entity?.getValue?.(PanelDocument, 'document') as UIKitDocument | undefined;
}

function wireEvents(entities: UIEntities, game: GameManager, audio: AudioManager) {
  // Title buttons
  const titleDoc = getDoc(entities.titleEntity);
  if (titleDoc) {
    titleDoc.getElementById('play-btn')?.addEventListener('click', () => game.showModeSelect());
    titleDoc.getElementById('settings-btn')?.addEventListener('click', () => { game.state = 'settings'; });
    titleDoc.getElementById('leaderboard-btn')?.addEventListener('click', () => { game.state = 'leaderboard'; });
  }

  // Mode select buttons
  const modeDoc = getDoc(entities.modeEntity);
  if (modeDoc) {
    modeDoc.getElementById('mode-8ball')?.addEventListener('click', () => game.startGame('8ball'));
    modeDoc.getElementById('mode-9ball')?.addEventListener('click', () => game.startGame('9ball'));
    modeDoc.getElementById('mode-freeplay')?.addEventListener('click', () => game.startGame('freeplay'));
    modeDoc.getElementById('mode-trickshot')?.addEventListener('click', () => game.startGame('trickshot'));
    modeDoc.getElementById('back-btn')?.addEventListener('click', () => game.showTitle());
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
    gameOverDoc.getElementById('replay-btn')?.addEventListener('click', () => game.startGame(game.mode));
    gameOverDoc.getElementById('menu-btn')?.addEventListener('click', () => game.showTitle());
  }

  // Settings buttons
  const settingsDoc = getDoc(entities.settingsEntity);
  if (settingsDoc) {
    settingsDoc.getElementById('back-btn')?.addEventListener('click', () => game.showTitle());

    // Volume controls
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
}

function updateHUD(entity: any, game: GameManager, ballManager: BallManager, cue: CueStick) {
  const doc = getDoc(entity);
  if (!doc) return;

  const player = game.players[game.currentPlayerIndex];
  setText(doc.getElementById('player-name'), player?.name || '');
  setText(doc.getElementById('mode-label'), game.mode.toUpperCase());
  setText(doc.getElementById('shots-count'), `Shots: ${game.shotCount}`);

  const assign = player?.assignment || 'none';
  setText(doc.getElementById('assignment'), assign === 'none' ? '' : assign.toUpperCase());

  // Power bar
  const powerEl = doc.getElementById('power-bar');
  if (powerEl && cue.isCharging) {
    const ratio = cue.power / 8.0;
    setText(powerEl, '█'.repeat(Math.floor(ratio * 15)));
  } else if (powerEl) {
    setText(powerEl, '');
  }

  // Ball count
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

  setText(doc.getElementById('stats-text'), `Shots: ${game.shotCount} | Best Streak: ${game.bestStreak}`);
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
