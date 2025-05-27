import { createLoggingHandler, LoggingHandlerOptions } from '../../../src/utility/event/logginghandler';
import { Logger, LogLevel, wrapLogger } from '../../../src/logger';
import { Event } from '../../../src/event/event';
import { Context } from '../../../src/context';

jest.mock('../../../src/logger', () => {
    const actual = jest.requireActual('../../../src/logger');
    return {
        ...actual,
        wrapLogger: jest.fn((logger, name) => ({
            ...logger,
            name: name || 'wrapped',
        })),
    };
});

const makeMockLogger = (): jest.Mocked<Logger> => ({
    name: 'mock',
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
});

describe('createLoggingHandler', () => {
    let logger: jest.Mocked<Logger>;
    let event: Event;
    let context: Context;

    beforeEach(() => {
        logger = makeMockLogger();
        event = {
            date: new Date('2024-01-01T00:00:00Z'),
            type: 'testType',
            stage: 'testStage',
            sourceId: 'testSource',
        };
        context = { user: 'testUser' };
        jest.clearAllMocks();
    });

    it('logs with default log level and log function', async () => {
        const handler = createLoggingHandler(logger, {});
        await handler.handle(event, context);
        expect(logger.info).toHaveBeenCalledWith(
            'Event: testType/testStage, Date: 2024-01-01T00:00:00.000Z, Source: testSource'
        );
    });

    it('logs with custom log level', async () => {
        const handler = createLoggingHandler(logger, { level: 'error' });
        await handler.handle(event, context);
        expect(logger.error).toHaveBeenCalledWith(
            'Event: testType/testStage, Date: 2024-01-01T00:00:00.000Z, Source: testSource'
        );
    });

    it('logs with custom log function', async () => {
        const customLog: LoggingHandlerOptions['log'] = (e, c) => [
            `Custom: ${e.type} by ${c.user}`,
            42,
        ];
        const handler = createLoggingHandler(logger, { log: customLog });
        await handler.handle(event, context);
        expect(logger.info).toHaveBeenCalledWith('Custom: testType by testUser', 42);
    });

    it('wraps logger with context if context option is provided', async () => {
        const handler = createLoggingHandler(logger, { context: 'MyContext', level: 'debug' });
        await handler.handle(event, context);
        // Should use wrapped logger
        expect(wrapLogger).toHaveBeenCalledWith(logger, 'MyContext');
        // The wrapped logger will have the same mock methods, so debug should be called
        expect(logger.debug).toHaveBeenCalledWith(
            'Event: testType/testStage, Date: 2024-01-01T00:00:00.000Z, Source: testSource'
        );
    });

    it('passes additional arguments from log function to logger', async () => {
        const customLog: LoggingHandlerOptions['log'] = () => [
            'msg', 1, 2, 3
        ];
        const handler = createLoggingHandler(logger, { log: customLog, level: 'warn' });
        await handler.handle(event, context);
        expect(logger.warn).toHaveBeenCalledWith('msg', 1, 2, 3);
    });
});
