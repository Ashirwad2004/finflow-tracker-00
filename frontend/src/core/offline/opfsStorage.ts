/**
 * OPFS (Origin Private File System) Storage Manager
 *
 * Persists application snapshots and sync journals directly to the host machine's
 * hard drive using the W3C File System Access & Origin Private File System APIs.
 * Requests persistent storage permission to prevent browser cache eviction.
 */

export class OPFSStorageManager {
  private static rootHandle: FileSystemDirectoryHandle | null = null;
  private static isPersistenceRequested = false;

  /**
   * Requests eviction protection via navigator.storage.persist()
   * and gets the root handle to the Origin Private File System.
   */
  public static async init(): Promise<FileSystemDirectoryHandle | null> {
    if (this.rootHandle) {
      return this.rootHandle;
    }

    // 1. Request persistent storage if not already requested
    if (!this.isPersistenceRequested && typeof navigator !== 'undefined' && navigator.storage?.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        this.isPersistenceRequested = true;
        console.info(`[OPFS] Persistent storage permission: ${isPersisted ? 'granted' : 'default/denied'}`);
      } catch (err) {
        console.warn('[OPFS] Could not request storage persistence:', err);
      }
    }

    // 2. Check for OPFS support
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      console.warn('[OPFS] Origin Private File System is not supported in this browser/environment.');
      return null;
    }

    try {
      this.rootHandle = await navigator.storage.getDirectory();
      return this.rootHandle;
    } catch (err) {
      console.error('[OPFS] Failed to access OPFS root directory:', err);
      return null;
    }
  }

  /**
   * Atomically writes file content directly to local OPFS disk.
   */
  public static async writeFile(filename: string, content: string | Uint8Array): Promise<boolean> {
    try {
      const root = await this.init();
      if (!root) return false;

      const fileHandle = await root.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable({ keepExistingData: false });

      if (typeof content === 'string') {
        const encoder = new TextEncoder();
        await writable.write(encoder.encode(content));
      } else {
        await writable.write(content as BufferSource);
      }

      await writable.close();
      return true;
    } catch (err) {
      console.error(`[OPFS] Error writing to disk file ${filename}:`, err);
      return false;
    }
  }

  /**
   * Reads raw string content from an OPFS disk file.
   */
  public static async readFile(filename: string): Promise<string | null> {
    try {
      const root = await this.init();
      if (!root) return null;

      const fileHandle = await root.getFileHandle(filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        return null;
      }
      console.warn(`[OPFS] Error reading disk file ${filename}:`, err);
      return null;
    }
  }

  /**
   * Deletes a file from OPFS storage.
   */
  public static async deleteFile(filename: string): Promise<boolean> {
    try {
      const root = await this.init();
      if (!root) return false;

      await root.removeEntry(filename);
      return true;
    } catch (err: any) {
      if (err?.name === 'NotFoundError') return true;
      console.warn(`[OPFS] Error deleting file ${filename}:`, err);
      return false;
    }
  }

  /**
   * Returns storage quota estimate in MB.
   */
  public static async getStorageQuota(): Promise<{ usageMB: number; quotaMB: number; isPersisted: boolean }> {
    let usageMB = 0;
    let quotaMB = 0;
    let isPersisted = false;

    if (typeof navigator !== 'undefined' && navigator.storage) {
      try {
        if (navigator.storage.estimate) {
          const { usage = 0, quota = 0 } = await navigator.storage.estimate();
          usageMB = Math.round(usage / (1024 * 1024));
          quotaMB = Math.round(quota / (1024 * 1024));
        }
        if (navigator.storage.persisted) {
          isPersisted = await navigator.storage.persisted();
        }
      } catch (err) {
        console.warn('[OPFS] Error getting storage quota estimate:', err);
      }
    }

    return { usageMB, quotaMB, isPersisted };
  }
}