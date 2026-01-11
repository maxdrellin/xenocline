import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEFAULT_LOGGER, wrapLogger, Logger } from '../src/logger';
import { LIBRARY_NAME } from '../src/constants';

const ALL_LEVELS = ['debug', 'info', 'warn', 'error', 'verbose', 'silly'] as const;

describe('DEFAULT_LOGGER', () => {
    let spies: Record<string, ReturnType<typeof vi.spyOn>>;

    beforeEach(() => {
        spies = {
            debug: vi.spyOn(console, 'debug').mockImplementation(() => { }),
            info: vi.spyOn(console, 'info').mockImplementation(() => { }),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { }),
            log: vi.spyOn(console, 'log').mockImplementation(() => { }),
        };
    });

    afterEach(() => {
        Object.values(spies).forEach(spy => spy.mockRestore());
    });

    it('calls the correct console method for each log level', () => {
        DEFAULT_LOGGER.debug('debug message', 1);
        expect(spies.debug).toHaveBeenCalledWith('debug message', 1);
        DEFAULT_LOGGER.info('info message', 2);
        expect(spies.info).toHaveBeenCalledWith('info message', 2);
        DEFAULT_LOGGER.warn('warn message', 3);
        expect(spies.warn).toHaveBeenCalledWith('warn message', 3);
        DEFAULT_LOGGER.error('error message', 4);
        expect(spies.error).toHaveBeenCalledWith('error message', 4);
        DEFAULT_LOGGER.verbose('verbose message', 5);
        expect(spies.log).toHaveBeenCalledWith('verbose message', 5);
        DEFAULT_LOGGER.silly('silly message', 6);
        expect(spies.log).toHaveBeenCalledWith('silly message', 6);
    });
});

describe('wrapLogger', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            name: 'mock',
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            verbose: vi.fn(),
            silly: vi.fn(),
        };
    });

    it('throws if logger is missing required methods', () => {
        const incompleteLogger = { name: 'bad', debug: () => { }, info: () => { }, warn: () => { }, error: () => { }, verbose: () => { } } as any;
        expect(() => wrapLogger(incompleteLogger)).toThrow(/missing required methods/);
    });

    it('calls the correct logger method and formats message with LIBRARY_NAME and no name', () => {
        const wrapped = wrapLogger(mockLogger);
        wrapped.debug('msg1', 1);
        expect(mockLogger.debug).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : msg1`, 1);
        wrapped.info('msg2', 2);
        expect(mockLogger.info).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : msg2`, 2);
        wrapped.warn('msg3', 3);
        expect(mockLogger.warn).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : msg3`, 3);
        wrapped.error('msg4', 4);
        expect(mockLogger.error).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : msg4`, 4);
        wrapped.verbose('msg5', 5);
        expect(mockLogger.verbose).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : msg5`, 5);
        wrapped.silly('msg6', 6);
        expect(mockLogger.silly).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : msg6`, 6);
    });

    it('formats message with LIBRARY_NAME and custom name', () => {
        const wrapped = wrapLogger(mockLogger, 'CustomName');
        wrapped.info('custom message', 'extra');
        expect(mockLogger.info).toHaveBeenCalledWith(`[${LIBRARY_NAME}] [CustomName]: custom message`, 'extra');
    });

    it('returns a logger with name "wrapped"', () => {
        const wrapped = wrapLogger(mockLogger, 'Any');
        expect(wrapped.name).toBe('wrapped');
    });

    it('forwards all arguments to the underlying logger', () => {
        const wrapped = wrapLogger(mockLogger);
        wrapped.error('err', 1, 2, 3);
        expect(mockLogger.error).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : err`, 1, 2, 3);
    });
});
