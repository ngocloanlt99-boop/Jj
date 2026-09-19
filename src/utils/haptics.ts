/**
 * Android Vibration API wrapper for authentic mobile tactile feedback
 */

export function vibrateFlap(enabled: boolean = true) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(15);
  } catch {
    // Graceful fallback if unsupported
  }
}

export function vibrateScore(enabled: boolean = true) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate([20, 30, 25]);
  } catch {
    // Graceful fallback
  }
}

export function vibrateHit(enabled: boolean = true) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate([60, 40, 80]);
  } catch {
    // Graceful fallback
  }
}

export function vibrateClick(enabled: boolean = true) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(10);
  } catch {
    // Graceful fallback
  }
}
