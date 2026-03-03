const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log('[CX]', ...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn('[CX]', ...args); },
  error: (...args: unknown[]) => { console.error('[CX]', ...args); }, // errors always log
  info: (...args: unknown[]) => { if (isDev) console.info('[CX]', ...args); },
};

export default logger;
