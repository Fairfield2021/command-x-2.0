import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the logger module with different DEV values.
// Since import.meta.env.DEV is evaluated at module load time,
// we test the built logger behavior.

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports log, warn, error, and info methods', async () => {
    const { logger } = await import('@/utils/logger');
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.info).toBe('function');
  });

  it('error always outputs to console.error with [CX] prefix', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');

    logger.error('test error message');

    expect(spy).toHaveBeenCalledWith('[CX]', 'test error message');
  });

  it('error handles multiple arguments', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');

    logger.error('msg', { detail: 'info' }, 42);

    expect(spy).toHaveBeenCalledWith('[CX]', 'msg', { detail: 'info' }, 42);
  });

  it('has a default export matching the named export', async () => {
    const mod = await import('@/utils/logger');
    expect(mod.default).toBe(mod.logger);
  });

  it('logger object has exactly 4 methods', async () => {
    const { logger } = await import('@/utils/logger');
    const keys = Object.keys(logger);
    expect(keys).toHaveLength(4);
    expect(keys).toEqual(expect.arrayContaining(['log', 'warn', 'error', 'info']));
  });
});
