import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';
import { isDev } from './config';

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function initAutoUpdater(getWindow: () => BrowserWindow | null): void {
  if (isDev) return; // Skip auto-updates in development

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    const win = getWindow();
    if (!win) return;

    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available and will be downloaded in the background.`,
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const win = getWindow();
    if (!win) return;

    dialog
      .showMessageBox(win, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded. Restart now to apply the update?`,
        buttons: ['Restart', 'Later'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error.message);
  });

  // Check on startup
  autoUpdater.checkForUpdates().catch(() => {});

  // Periodic checks
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, CHECK_INTERVAL_MS);
}

export function checkForUpdates(): void {
  if (isDev) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Development Mode',
      message: 'Auto-updates are disabled in development mode.',
      buttons: ['OK'],
    });
    return;
  }
  autoUpdater.checkForUpdates().catch(() => {});
}
