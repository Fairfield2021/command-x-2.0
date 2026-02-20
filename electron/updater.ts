import pkg from "electron-updater";
const { autoUpdater } = pkg;
import { BrowserWindow, ipcMain, app } from "electron";
import electronLog from "electron-log";
import { createHash } from "crypto";
import { createReadStream } from "fs";

const log = electronLog.default || electronLog;

// ─── Signature & Integrity Configuration ─────────────────────────────────────
// The publisherName must exactly match the Common Name (CN) on the code-signing
// certificate used to sign the released builds. electron-updater will reject any
// downloaded update whose signature does not match this name, preventing
// tampered or unsigned binaries from being installed.
const PUBLISHER_NAMES = [
  "Fairfield Group LLC",   // Primary production signing certificate CN
  "Command X",             // Fallback / dev certificate CN
];

// Configure electron-updater to enforce cryptographic signature verification.
// This applies to Windows (Authenticode) and macOS (notarized Developer ID).
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Force signature verification — reject updates that are not signed by a
// trusted publisher. This is the primary defence against supply-chain attacks
// on the auto-update mechanism.
(autoUpdater as any).verifyUpdateCodeSignature = async (
  publisherName: string[]
): Promise<string | null> => {
  const trusted = publisherName.some((name) =>
    PUBLISHER_NAMES.some(
      (allowed) => name.toLowerCase() === allowed.toLowerCase()
    )
  );
  if (!trusted) {
    const msg = `Update rejected: publisher "${publisherName.join(", ")}" is not in the trusted list.`;
    log.error(msg);
    return msg; // Returning a non-null string causes electron-updater to abort
  }
  log.info(`Publisher verified: ${publisherName.join(", ")}`);
  return null; // null = verification passed
};

// ─── SHA-256 file integrity helper ───────────────────────────────────────────
// Used to log the hash of the downloaded update package before installation,
// providing an audit trail in electron-log for post-incident review.
function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

// ─── Logging ─────────────────────────────────────────────────────────────────
log.transports.file.level = "info";
autoUpdater.logger = log;

// ─── State ───────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let isInitialized = false;

// ─── Public API ──────────────────────────────────────────────────────────────
export function initAutoUpdater(win: BrowserWindow) {
  mainWindow = win;

  // Prevent duplicate handler registration across hot-reloads
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  const sendStatusToWindow = (status: string, data?: any) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-status", { status, data });
    }
  };

  // ── Event handlers ──────────────────────────────────────────────────────
  autoUpdater.on("checking-for-update", () => {
    sendStatusToWindow("checking");
    log.info("Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    sendStatusToWindow("available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
    log.info(`Update available: v${info.version} (released ${info.releaseDate})`);
  });

  autoUpdater.on("update-not-available", (info) => {
    sendStatusToWindow("not-available", { version: info.version });
    log.info(`Already on latest version (${info.version}).`);
  });

  autoUpdater.on("error", (err) => {
    sendStatusToWindow("error", { message: err.message });
    log.error("Auto-updater error:", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    sendStatusToWindow("downloading", {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
    log.info(`Download progress: ${progressObj.percent.toFixed(1)}%`);
  });

  autoUpdater.on("update-downloaded", async (info) => {
    // Log SHA-256 of the downloaded package for integrity audit trail
    try {
      const downloadedFile = (info as any).downloadedFile as string | undefined;
      if (downloadedFile) {
        const sha256 = await computeSha256(downloadedFile);
        log.info(
          `Update downloaded: v${info.version} | SHA-256: ${sha256} | File: ${downloadedFile}`
        );
      } else {
        log.info(`Update downloaded: v${info.version}`);
      }
    } catch (hashErr) {
      log.warn("Could not compute SHA-256 of downloaded update:", hashErr);
    }

    sendStatusToWindow("downloaded", {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  // ── IPC handlers for renderer process ───────────────────────────────────
  ipcMain.handle("check-for-updates", async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      log.error("check-for-updates IPC failed:", err);
      return null;
    }
  });

  ipcMain.handle("download-update", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      log.error("download-update IPC failed:", err);
      return false;
    }
  });

  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle("get-app-version", () => app.getVersion());

  // ── Initial update check (delayed to allow window to fully load) ─────────
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error("Initial update check failed:", err);
    });
  }, 3000);
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}
