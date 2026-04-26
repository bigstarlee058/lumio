import { BrowserWindow, screen, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface WindowState {
  x: number | undefined;
  y: number | undefined;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  x: undefined,
  y: undefined,
  width: 1280,
  height: 800,
  isMaximized: false,
};

function getStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function readState(): WindowState {
  try {
    const data = fs.readFileSync(getStatePath(), 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(state: WindowState): void {
  try {
    fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2));
  } catch {
    // Silently fail — window state is non-critical
  }
}

export function getSavedWindowState(): WindowState {
  const state = readState();

  // Validate that the saved position is still on a visible display
  if (state.x !== undefined && state.y !== undefined) {
    const displays = screen.getAllDisplays();
    const onScreen = displays.some((display) => {
      const { x, y, width, height } = display.bounds;
      return (
        state.x! >= x &&
        state.x! < x + width &&
        state.y! >= y &&
        state.y! < y + height
      );
    });
    if (!onScreen) {
      state.x = undefined;
      state.y = undefined;
    }
  }

  return state;
}

export function trackWindowState(win: BrowserWindow): void {
  let saveTimeout: NodeJS.Timeout | null = null;

  const save = () => {
    if (win.isDestroyed()) return;

    const isMaximized = win.isMaximized();
    if (!isMaximized) {
      const bounds = win.getBounds();
      writeState({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: false,
      });
    } else {
      const current = readState();
      writeState({ ...current, isMaximized: true });
    }
  };

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(save, 500);
  };

  win.on('resize', debouncedSave);
  win.on('move', debouncedSave);
  win.on('close', save);
}
