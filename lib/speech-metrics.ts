export interface SpeechMetrics {
  durationSec: number;
  speechSec: number;
  silenceSec: number;
  speechRatio: number;
  silenceRatio: number;
  longestSilenceSec: number;
  speechDensity: number;
}

// Frame length for RMS VAD (~20ms at 16kHz; scaled by sampleRate).
const FRAME_MS = 20;
// Absolute RMS below this counts as silence (decoded float PCM is typically [-1, 1]).
const SILENCE_RMS = 0.02;

export function computeSpeechMetricsFromChannel(samples: Float32Array, sampleRate: number): SpeechMetrics {
  const durationSec = samples.length / sampleRate;
  if (samples.length === 0 || sampleRate <= 0) {
    return {
      durationSec: 0,
      speechSec: 0,
      silenceSec: 0,
      speechRatio: 0,
      silenceRatio: 1,
      longestSilenceSec: 0,
      speechDensity: 0,
    };
  }

  const frameSize = Math.max(1, Math.round((sampleRate * FRAME_MS) / 1000));
  let speechFrames = 0;
  let silenceFrames = 0;
  let longestSilenceFrames = 0;
  let currentSilenceFrames = 0;

  for (let i = 0; i < samples.length; i += frameSize) {
    const end = Math.min(i + frameSize, samples.length);
    let sumSq = 0;
    for (let j = i; j < end; j += 1) {
      const v = samples[j] ?? 0;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / (end - i));
    if (rms < SILENCE_RMS) {
      silenceFrames += 1;
      currentSilenceFrames += 1;
      if (currentSilenceFrames > longestSilenceFrames) {
        longestSilenceFrames = currentSilenceFrames;
      }
    } else {
      speechFrames += 1;
      currentSilenceFrames = 0;
    }
  }

  const totalFrames = Math.max(1, speechFrames + silenceFrames);
  const frameSec = frameSize / sampleRate;
  const speechSec = speechFrames * frameSec;
  const silenceSec = silenceFrames * frameSec;
  const speechRatio = speechFrames / totalFrames;
  const silenceRatio = silenceFrames / totalFrames;
  const longestSilenceSec = longestSilenceFrames * frameSec;
  // Speech per second of wall time — proxy for density without word count.
  const speechDensity = durationSec > 0 ? speechSec / durationSec : 0;

  return {
    durationSec,
    speechSec,
    silenceSec,
    speechRatio,
    silenceRatio,
    longestSilenceSec,
    speechDensity,
  };
}

// Decode a recording blob and compute VAD metrics in the browser.
// Returns null when the browser cannot decode the media.
export async function getBlobSpeechMetrics(blob: Blob): Promise<SpeechMetrics | null> {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      const channel = buffer.getChannelData(0);
      return computeSpeechMetricsFromChannel(channel, buffer.sampleRate);
    } finally {
      await ctx.close();
    }
  } catch {
    return null;
  }
}

export function isSpeechMetrics(value: unknown): value is SpeechMetrics {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.durationSec === "number" &&
    typeof m.speechSec === "number" &&
    typeof m.silenceSec === "number" &&
    typeof m.speechRatio === "number" &&
    typeof m.silenceRatio === "number" &&
    typeof m.longestSilenceSec === "number" &&
    typeof m.speechDensity === "number"
  );
}
