export class RecorderWindowManager {
  constructor(windowsApi, recorderUrl) {
    this.windowsApi = windowsApi;
    this.recorderUrl = recorderUrl;
    this.windowId = null;
  }

  getWindowId() {
    return this.windowId;
  }

  setWindowId(windowId) {
    this.windowId = windowId;
  }

  handleRemoved(windowId) {
    if (this.windowId === windowId) {
      this.windowId = null;
    }
  }

  async openOrFocus() {
    if (this.windowId !== null) {
      try {
        await this.windowsApi.update(this.windowId, { focused: true });
        return this.windowId;
      } catch (_error) {
        this.windowId = null;
      }
    }

    const created = await this.windowsApi.create({
      url: this.recorderUrl,
      type: 'popup',
      focused: true,
      width: 420,
      height: 640,
    });

    this.windowId = created.id;
    return this.windowId;
  }
}
