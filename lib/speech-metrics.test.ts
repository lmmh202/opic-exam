import { describe, expect, it } from "vitest";
import { computeSpeechMetricsFromChannel } from "./speech-metrics";

function tone(sampleRate: number, seconds: number, amplitude: number): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = amplitude * Math.sin((2 * Math.PI * 220 * i) / sampleRate);
  }
  return out;
}

function silence(sampleRate: number, seconds: number): Float32Array {
  return new Float32Array(Math.floor(sampleRate * seconds));
}

function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

describe("computeSpeechMetricsFromChannel", () => {
  const sampleRate = 16000;

  it("treats near-silent audio as mostly silence", () => {
    const samples = silence(sampleRate, 2);
    const m = computeSpeechMetricsFromChannel(samples, sampleRate);
    expect(m.durationSec).toBeCloseTo(2, 1);
    expect(m.silenceRatio).toBeGreaterThan(0.9);
    expect(m.speechRatio).toBeLessThan(0.1);
  });

  it("detects a long silence gap of 5+ seconds", () => {
    const samples = concat(tone(sampleRate, 1, 0.2), silence(sampleRate, 5.5), tone(sampleRate, 1, 0.2));
    const m = computeSpeechMetricsFromChannel(samples, sampleRate);
    expect(m.longestSilenceSec).toBeGreaterThanOrEqual(5);
  });

  it("reports high speech ratio for continuous tone", () => {
    const samples = tone(sampleRate, 3, 0.25);
    const m = computeSpeechMetricsFromChannel(samples, sampleRate);
    expect(m.speechRatio).toBeGreaterThan(0.8);
    expect(m.longestSilenceSec).toBeLessThan(0.5);
  });
});
