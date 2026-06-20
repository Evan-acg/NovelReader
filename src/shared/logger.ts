const DEBUG_KEY = 'novelReaderDebug';

let debugEnabled = false;

export const logger = {
  info(...args: unknown[]): void {
    console.log('[NovelReader]', ...args);
  },

  debug(...args: unknown[]): void {
    if (debugEnabled) {
      console.log('[NovelReader DEBUG]', ...args);
    }
  },

  warn(...args: unknown[]): void {
    console.warn('[NovelReader]', ...args);
  },

  error(...args: unknown[]): void {
    console.error('[NovelReader]', ...args);
  },

  setDebug(enabled: boolean): void {
    debugEnabled = enabled;
  },
};
