import {
  buildCaptureFilename,
  buildRecordingFilename,
  floatTo16BitPCM,
} from './src/audio-utils.js';
import { createAudioRecorder, createDisplayRecorder } from './src/recorder-utils.js';

const modeSelect = document.getElementById('modeSelect');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusNode = document.getElementById('status');

let mediaRecorder = null;
let capturedStream = null;
let recorderStream = null;
let chunks = [];
let currentMode = 'audio';

function setStatus(message) {
  statusNode.textContent = message;
}

function toggleControls(isRecording) {
  startButton.disabled = isRecording;
  stopButton.disabled = !isRecording;
  modeSelect.disabled = isRecording;
}

function releaseStream() {
  if (recorderStream) {
    recorderStream.getTracks().forEach((track) => track.stop());
    recorderStream = null;
  }

  if (capturedStream) {
    capturedStream.getTracks().forEach((track) => track.stop());
    capturedStream = null;
  }

  mediaRecorder = null;
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

async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename,
    saveAs: true,
  });

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function startRecording() {
  try {
    chunks = [];
    currentMode = modeSelect.value;

    capturedStream = await navigator.mediaDevices.getDisplayMedia({
      audio: {
        suppressLocalAudioPlayback: false,
      },
      video: true,
    });

    const recorderBundle = currentMode === 'capture'
      ? createDisplayRecorder(capturedStream)
      : createAudioRecorder(capturedStream);

    mediaRecorder = recorderBundle.recorder;
    recorderStream = recorderBundle.audioStream || recorderBundle.displayStream;

    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener('stop', async () => {
      toggleControls(false);

      try {
        if (currentMode === 'capture') {
          setStatus('WebM保存中...');
          const webmBlob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'video/webm' });
          await downloadBlob(webmBlob, buildCaptureFilename(new Date()));
          setStatus('完了: WebMを保存しました。');
        } else {
          setStatus('MP3に変換中...');
          const webmBlob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
          const mp3Blob = await convertToMp3(webmBlob);
          await downloadBlob(mp3Blob, buildRecordingFilename(new Date()));
          setStatus('完了: MP3を保存しました。');
        }
      } catch (error) {
        setStatus(`失敗: ${error.message}`);
      } finally {
        releaseStream();
      }
    });

    mediaRecorder.start(250);
    toggleControls(true);
    setStatus(currentMode === 'capture'
      ? 'キャプチャ中... 他のタブ/アプリを操作しても継続します。'
      : '録音中... 他のタブ/アプリを操作しても継続します。');
  } catch (error) {
    releaseStream();
    toggleControls(false);
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
