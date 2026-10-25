/**
 * PlaybackCutoffGuard
 * Reverse-engineered directly from Echo Music's PlaybackCutoffGuard.kt
 * 
 * Guards against premature audio stream termination on mobile devices when:
 * 1. Android powersaves or throttles background network connections on screen lock
 * 2. Mobile carrier switches cell towers or Wi-Fi sleeps briefly
 * 3. Demuxer/decoder reports EOF before canonical duration has finished
 */

export class PlaybackCutoffGuard {
  constructor(thresholdSeconds = 3.5, maxRetriesPerTrack = 3) {
    this.thresholdSeconds = thresholdSeconds;
    this.maxRetriesPerTrack = maxRetriesPerTrack;
    this.retryCount = 0;
    this.currentTrackId = null;
  }

  /**
   * Resets retry budget when track transition occurs
   */
  onTrackChanged(trackId) {
    this.currentTrackId = trackId;
    this.retryCount = 0;
  }

  /**
   * Evaluates whether an 'ended' or 'stalled' event is genuine or premature.
   * If current position is further than thresholdSeconds away from canonical duration,
   * it returns { allowEnd: false, shouldRecover: true, resumePosition, retryAttempt }.
   */
  verifyTrackCompletion(currentPosition, canonicalDuration, playerDuration = -1) {
    const safePosition = Math.max(0, Number(currentPosition) || 0);
    const safeCanonical = Math.max(0, Number(canonicalDuration) || 0);
    const safePlayerDur = Math.max(0, Number(playerDuration) || 0);

    // If decoder reports duration and current position has reached it within threshold, allow end
    if (safePlayerDur > 0) {
      const playerDiscrepancy = safePlayerDur - safePosition;
      if (playerDiscrepancy <= this.thresholdSeconds) {
        return { allowEnd: true, shouldRecover: false };
      }
    }

    // If canonical duration is missing, accept genuine end
    if (safeCanonical <= 0) {
      return { allowEnd: true, shouldRecover: false };
    }

    const discrepancy = safeCanonical - safePosition;

    if (discrepancy > this.thresholdSeconds && this.retryCount < this.maxRetriesPerTrack) {
      this.retryCount++;
      return {
        allowEnd: false,
        shouldRecover: true,
        resumePosition: safePosition,
        retryAttempt: this.retryCount,
        discrepancy
      };
    }

    return { allowEnd: true, shouldRecover: false };
  }

  getRetryCount() {
    return this.retryCount;
  }
}

export default PlaybackCutoffGuard;
