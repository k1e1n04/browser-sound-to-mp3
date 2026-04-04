import { describe, expect, it } from 'vitest';
import { RecorderWindowManager } from '../src/recorder-window-manager.js';

describe('RecorderWindowManager', () => {
  it('creates recorder window on first open', async () => {
    const calls = [];
    const windowsApi = {
      create: async (options) => {
        calls.push(options);
        return { id: 55 };
      },
      update: async () => {
        throw new Error('should not be called');
      },
    };

    const manager = new RecorderWindowManager(windowsApi, 'chrome-extension://id/recorder.html');
    const id = await manager.openOrFocus();

    expect(id).toBe(55);
    expect(calls).toEqual([
      {
        url: 'chrome-extension://id/recorder.html',
        type: 'popup',
        focused: true,
        width: 420,
        height: 640,
      },
    ]);
  });

  it('focuses existing window if available', async () => {
    const updates = [];
    const windowsApi = {
      create: async () => ({ id: 99 }),
      update: async (id, opts) => {
        updates.push({ id, opts });
        return { id };
      },
    };

    const manager = new RecorderWindowManager(windowsApi, 'u');
    await manager.openOrFocus();
    const id = await manager.openOrFocus();

    expect(id).toBe(99);
    expect(updates).toEqual([{ id: 99, opts: { focused: true } }]);
  });

  it('recreates window when stored id is stale', async () => {
    const windowsApi = {
      create: async () => ({ id: 101 }),
      update: async () => {
        throw new Error('No window with id: 99');
      },
    };

    const manager = new RecorderWindowManager(windowsApi, 'u');
    manager.setWindowId(99);

    const id = await manager.openOrFocus();
    expect(id).toBe(101);
  });

  it('clears tracked id when removed', () => {
    const manager = new RecorderWindowManager({ create: async () => ({ id: 1 }), update: async () => ({ id: 1 }) }, 'u');
    manager.setWindowId(77);

    manager.handleRemoved(55);
    expect(manager.getWindowId()).toBe(77);

    manager.handleRemoved(77);
    expect(manager.getWindowId()).toBe(null);
  });
});
