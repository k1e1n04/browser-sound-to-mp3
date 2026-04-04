import { describe, expect, it } from 'vitest';
import {
  buildCaptureFilename,
  buildRecordingFilename,
  floatTo16BitPCM,
} from '../src/audio-utils.js';

describe('floatTo16BitPCM', () => {
  it('clamps float samples and converts to signed 16-bit PCM', () => {
    const input = new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]);
    const pcm = floatTo16BitPCM(input);

    expect(Array.from(pcm)).toEqual([
      -32768,
      -32768,
      -16384,
      0,
      16383,
      32767,
      32767,
    ]);
  });
});

describe('buildRecordingFilename', () => {
  it('creates deterministic mp3 filename from date', () => {
    const dt = new Date('2026-04-04T12:34:56Z');
    const filename = buildRecordingFilename(dt);

    expect(filename).toBe('recording-2026-04-04-12-34-56.mp3');
  });
});

describe('buildCaptureFilename', () => {
  it('creates deterministic webm filename from date', () => {
    const dt = new Date('2026-04-05T12:34:56Z');
    const filename = buildCaptureFilename(dt);

    expect(filename).toBe('capture-2026-04-05-12-34-56.webm');
  });
});
