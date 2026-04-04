import { buildRecordingFilename, floatTo16BitPCM } from './src/audio-utils.js';

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusNode = document.getElementById('status');

let mediaRecorder = null;
let capturedStream = null;
let chunks = [];

function setStatus(message) {
  statusNode.textContent = message;
}

function getRecorderOptions() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { mimeType };
    }
  }

  return undefined;
}

async function convertToMp3(webmBlob) {
  const audioBuffer = await decodeAudioBlob(webmBlob);
  const sampleRate = audioBuffer.sampleRate;
  const channels = Math.min(audioBuffer.numberOfChannels, 2);

  const left = floatTo16BitPCM(audioBuffer.getChannelData(0));
  const right = channels === 2
    ? floatTo16BitPCM(audioBuffer.getChannelData(1))
    : null;

  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
  const blockSize = 1152;
  const frames = [];

  for (let index = 0; index < left.length; index += blockSize) {
    const leftChunk = left.subarray(index, index + blockSize);

    const buffer = right
      ? encoder.encodeBuffer(leftChunk, right.subarray(index, index + blockSize))
      : encoder.encodeBuffer(leftChunk);

    if (buffer.length > 0) {
      frames.push(new Int8Array(buffer));
    }
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) {
    frames.push(new Int8Array(flushed));
  }

  return new Blob(frames, { type: 'audio/mpeg' });
}

async function decodeAudioBlob(blob) {
  const buffer = await blob.arrayBuffer();
  const context = new AudioContext();

  try {
    return await context.decodeAudioData(buffer.slice(0));
  } finally {
    await context.close();
  }
}

async function downloadMp3(mp3Blob) {
  const url = URL.createObjectURL(mp3Blob);
  const filename = buildRecordingFilename(new Date());

  await chrome.downloads.download({
    url,
    filename,
    saveAs: true,
  });

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function toggleButtons(isRecording) {
  startButton.disabled = isRecording;
  stopButton.disabled = !isRecording;
}

function releaseStream() {
  if (capturedStream) {
    capturedStream.getTracks().forEach((track) => track.stop());
    capturedStream = null;
  }
}

async function startRecording() {
  try {
    chunks = [];
    capturedStream = await navigator.mediaDevices.getDisplayMedia({
      audio: {
        suppressLocalAudioPlayback: false,
      },
      video: true,
    });

    const audioTracks = capturedStream.getAudioTracks();
    if (audioTracks.length === 0) {
      releaseStream();
      throw new Error('音声トラックが取得できませんでした。画面共有ダイアログで音声共有をONにしてください。');
    }

    mediaRecorder = new MediaRecorder(capturedStream, getRecorderOptions());

    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener('stop', async () => {
      toggleButtons(false);

      try {
        setStatus('MP3に変換中...');
        const webmBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const mp3Blob = await convertToMp3(webmBlob);

        setStatus('ダウンロード準備中...');
        await downloadMp3(mp3Blob);
        setStatus('完了: MP3を保存しました。');
      } catch (error) {
        setStatus(`失敗: ${error.message}`);
      } finally {
        releaseStream();
      }
    });

    mediaRecorder.start(250);
    toggleButtons(true);
    setStatus('録音中... 停止を押すまで記録します。');
  } catch (error) {
    releaseStream();
    toggleButtons(false);
    setStatus(`開始失敗: ${error.message}`);
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    return;
  }

  setStatus('停止中...');
  mediaRecorder.stop();
}

startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
