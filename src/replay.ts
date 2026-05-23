// Shot Replay System - Record and replay the last shot with cinematic camera
import { Vector3 } from '@iwsdk/core';

interface BallFrame {
  id: number;
  x: number;
  y: number;
  z: number;
  pocketed: boolean;
}

interface ReplayFrame {
  time: number;
  balls: BallFrame[];
}

export class ReplaySystem {
  private frames: ReplayFrame[] = [];
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private playbackTime: number = 0;
  private playbackSpeed: number = 0.7; // Slow-mo replay
  private currentFrameIndex: number = 0;
  private maxFrames: number = 600; // ~10 seconds at 60fps
  private recordTimer: number = 0;

  // Replay camera
  private replayCamActive: boolean = false;
  private replayCamAngle: number = 0;
  private replayCamRadius: number = 2.5;
  private replayCamHeight: number = 1.8;
  private replayCamTarget: Vector3 = new Vector3();

  onReplayStart: (() => void) | null = null;
  onReplayEnd: (() => void) | null = null;
  onBallPositions: ((balls: BallFrame[]) => void) | null = null;

  get recording(): boolean { return this.isRecording; }
  get playing(): boolean { return this.isPlaying; }
  get hasReplay(): boolean { return this.frames.length > 10; }
  get progress(): number {
    if (this.frames.length === 0) return 0;
    return this.currentFrameIndex / (this.frames.length - 1);
  }

  startRecording(): void {
    this.frames = [];
    this.isRecording = true;
    this.recordTimer = 0;
  }

  recordFrame(balls: { id: number; position: Vector3; pocketed: boolean }[]): void {
    if (!this.isRecording) return;
    if (this.frames.length >= this.maxFrames) return;

    this.recordTimer++;
    // Record every other frame for efficiency
    if (this.recordTimer % 2 !== 0) return;

    const frame: ReplayFrame = {
      time: this.recordTimer / 60,
      balls: balls.map(b => ({
        id: b.id,
        x: b.position.x,
        y: b.position.y,
        z: b.position.z,
        pocketed: b.pocketed,
      })),
    };
    this.frames.push(frame);
  }

  stopRecording(): void {
    this.isRecording = false;
  }

  startReplay(): boolean {
    if (this.frames.length < 5) return false;
    this.isPlaying = true;
    this.playbackTime = 0;
    this.currentFrameIndex = 0;
    this.replayCamAngle = 0;
    this.replayCamActive = true;

    // Calculate center of action for camera target
    if (this.frames.length > 0) {
      const first = this.frames[0];
      let cx = 0, cz = 0, count = 0;
      for (const b of first.balls) {
        if (!b.pocketed) {
          cx += b.x;
          cz += b.z;
          count++;
        }
      }
      if (count > 0) {
        this.replayCamTarget.set(cx / count, 0.85, cz / count);
      }
    }

    if (this.onReplayStart) this.onReplayStart();
    return true;
  }

  stopReplay(): void {
    this.isPlaying = false;
    this.replayCamActive = false;
    if (this.onReplayEnd) this.onReplayEnd();
  }

  update(dt: number): ReplayFrame | null {
    if (!this.isPlaying || this.frames.length === 0) return null;

    this.playbackTime += dt * this.playbackSpeed;

    // Advance frame
    while (this.currentFrameIndex < this.frames.length - 1) {
      const nextFrame = this.frames[this.currentFrameIndex + 1];
      if (nextFrame.time <= this.playbackTime * 30) { // adjust for recording rate
        this.currentFrameIndex++;
      } else {
        break;
      }
    }

    // Slowly orbit camera
    this.replayCamAngle += dt * 0.3;

    // Check if replay is done
    if (this.currentFrameIndex >= this.frames.length - 1) {
      // Hold for a moment, then stop
      this.playbackTime += dt;
      if (this.playbackTime > this.frames[this.frames.length - 1].time / 30 + 2) {
        this.stopReplay();
        return null;
      }
    }

    const frame = this.frames[this.currentFrameIndex];
    if (this.onBallPositions) this.onBallPositions(frame.balls);
    return frame;
  }

  getReplayCamera(): { x: number; y: number; z: number; lookAtX: number; lookAtY: number; lookAtZ: number } | null {
    if (!this.replayCamActive) return null;

    // Orbit around the action
    const progress = this.progress;
    const angle = this.replayCamAngle;
    const radius = this.replayCamRadius - progress * 0.8; // Zoom in over time
    const height = this.replayCamHeight + progress * 0.3;

    return {
      x: this.replayCamTarget.x + Math.sin(angle) * radius,
      y: height,
      z: this.replayCamTarget.z + Math.cos(angle) * radius,
      lookAtX: this.replayCamTarget.x,
      lookAtY: 0.85,
      lookAtZ: this.replayCamTarget.z,
    };
  }
}
