import { describe, expect, it } from 'vitest';
import { createAudioRecorder, listSupportedRecorderOptions } from '../src/recorder-utils.js';

describe('listSupportedRecorderOptions', () => {
  it('returns only mime types supported by MediaRecorder', () => {
    const FakeMediaRecorder = {
      isTypeSupported: (mimeType) => mimeType === 'audio/webm',
    };

    const options = listSupportedRecorderOptions(FakeMediaRecorder);
    expect(options).toEqual([{ mimeType: 'audio/webm' }, undefined]);
  });
});

describe('createAudioRecorder', () => {
  it('records from audio-only stream extracted from display stream', () => {
    const audioTrack = { kind: 'audio' };
    const displayStream = {
      getAudioTracks: () => [audioTrack],
    };

    class FakeMediaRecorder {
      constructor(stream, options) {
        this.stream = stream;
        this.options = options;
      }

      static isTypeSupported() {
        return true;
      }
    }

    const streamFactory = (tracks) => ({ tracks });

    const { recorder, audioStream } = createAudioRecorder(
      displayStream,
      FakeMediaRecorder,
      streamFactory,
    );

    expect(audioStream).toEqual({ tracks: [audioTrack] });
    expect(recorder.stream).toEqual({ tracks: [audioTrack] });
    expect(recorder.options).toEqual({ mimeType: 'audio/webm;codecs=opus' });
  });

  it('falls back to default recorder options when preferred mime types fail', () => {
    const displayStream = {
      getAudioTracks: () => [{ kind: 'audio' }],
    };

    const triedOptions = [];

    class FakeMediaRecorder {
      constructor(_stream, options) {
        triedOptions.push(options);

        if (options && options.mimeType) {
          throw new Error('unsupported for this stream');
        }
      }

      static isTypeSupported() {
        return true;
      }
    }

    const streamFactory = (tracks) => ({ tracks });

    const { recorder } = createAudioRecorder(displayStream, FakeMediaRecorder, streamFactory);
    expect(recorder).toBeDefined();
    expect(triedOptions).toEqual([
      { mimeType: 'audio/webm;codecs=opus' },
      { mimeType: 'audio/webm' },
      undefined,
    ]);
  });

  it('throws a clear error when there are no audio tracks', () => {
    const displayStream = {
      getAudioTracks: () => [],
    };

    class FakeMediaRecorder {
      static isTypeSupported() {
        return false;
      }
    }

    expect(() => {
      createAudioRecorder(displayStream, FakeMediaRecorder, () => ({}));
    }).toThrow('音声トラックが取得できませんでした');
  });
});
