const openButton = document.getElementById('openRecorderButton');
const statusNode = document.getElementById('status');

function setStatus(message) {
  statusNode.textContent = message;
}

async function openRecorderWindow() {
  setStatus('録音ウィンドウを開いています...');

  const result = await chrome.runtime.sendMessage({ type: 'OPEN_RECORDER_WINDOW' });

  if (!result || !result.ok) {
    const reason = result?.error || 'unknown';
    throw new Error(reason);
  }

  setStatus('録音ウィンドウを開きました。そちらで録音を開始してください。');
}

openButton.addEventListener('click', async () => {
  try {
    await openRecorderWindow();
  } catch (error) {
    setStatus(`失敗: ${error.message}`);
  }
});
