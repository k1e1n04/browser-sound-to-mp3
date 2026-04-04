const AUDIO_RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
];

const VIDEO_RECORDER_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function listSupportedRecorderOptions(MediaRecorderCtor = MediaRecorder) {
  const options = [];

  for (const mimeType of AUDIO_RECORDER_MIME_CANDIDATES) {
    if (MediaRecorderCtor.isTypeSupported(mimeType)) {
      options.push({ mimeType });
    }
  }

  options.push(undefined);
  return options;
}

export function listSupportedVideoRecorderOptions(MediaRecorderCtor = MediaRecorder) {
  const options = [];

  for (const mimeType of VIDEO_RECORDER_MIME_CANDIDATES) {
    if (MediaRecorderCtor.isTypeSupported(mimeType)) {
      options.push({ mimeType });
    }
  }

  options.push(undefined);
  return options;
}

export function createAudioRecorder(
  displayStream,
  MediaRecorderCtor = MediaRecorder,
  streamFactory = (tracks) => new MediaStream(tracks),
) {
  const audioTracks = displayStream.getAudioTracks();
  if (audioTracks.length === 0) {
    throw new Error('音声トラックが取得できませんでした。画面共有ダイアログで音声共有をONにしてください。');
  }

  const audioStream = streamFactory(audioTracks);
  let lastError = null;

  for (const options of listSupportedRecorderOptions(MediaRecorderCtor)) {
    try {
      const recorder = options
        ? new MediaRecorderCtor(audioStream, options)
        : new MediaRecorderCtor(audioStream);
      return { recorder, audioStream };
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'unknown';
  throw new Error(`MediaRecorder初期化に失敗しました: ${message}`);
}

export function createDisplayRecorder(displayStream, MediaRecorderCtor = MediaRecorder) {
  let lastError = null;

  for (const options of listSupportedVideoRecorderOptions(MediaRecorderCtor)) {
    try {
      const recorder = options
        ? new MediaRecorderCtor(displayStream, options)
        : new MediaRecorderCtor(displayStream);
      return { recorder, displayStream };
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'unknown';
  throw new Error(`MediaRecorder初期化に失敗しました: ${message}`);
}
