import { RecorderWindowManager } from './src/recorder-window-manager.js';

const manager = new RecorderWindowManager(
  chrome.windows,
  chrome.runtime.getURL('recorder.html'),
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'OPEN_RECORDER_WINDOW') {
    return false;
  }

  manager.openOrFocus()
    .then((windowId) => sendResponse({ ok: true, windowId }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.windows.onRemoved.addListener((windowId) => {
  manager.handleRemoved(windowId);
});
