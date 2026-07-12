// Minimum spoken answer length required before calling /api/analyze.
export const MIN_ANALYZE_DURATION_SECONDS = 20;

// Decode blob duration in seconds.
// Returns null when the browser cannot decode the media.
export async function getBlobDurationSeconds(blob: Blob): Promise<number | null> {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      return buffer.duration;
    } finally {
      await ctx.close();
    }
  } catch {
    return null;
  }
}

export function isAnalyzeDurationTooShort(durationSeconds: number | null): boolean {
  if (durationSeconds === null) return false;
  return durationSeconds < MIN_ANALYZE_DURATION_SECONDS;
}
