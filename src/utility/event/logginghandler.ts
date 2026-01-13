import { Logger, LogLevel, wrapLogger } from "../../logger";
import { Event } from "../../event/event";
import { EventHandler } from "../../event/handler";
import { clean } from "../../util/general";
import * as util from "node:util";
import { Context } from "../../context";

export type EventLogFunction<T extends Event, C extends Context> = (event: T, context: C) => [message: string, ...args: any[]];

export type LoggingHandler<T extends Event, C extends Context> = EventHandler<T, C>;

export interface LoggingHandlerOptions {
    level: LogLevel;
    context: string;
    log: EventLogFunction<any, any>;
}

const DEFAULT_LOG_LEVEL: LogLevel = 'info';

const DEFAULT_LOG_FUNCTION: EventLogFunction<Event, Context> = (event: Event) => {
    const message = util.format('Event: %s/%s, Date: %s, Source: %s', event.type, event.stage, event.date.toISOString(), event.sourceId);

    return [message];
}

const DEFAULT_LOGGING_HANDLER_OPTIONS: Partial<LoggingHandlerOptions> = {
    level: DEFAULT_LOG_LEVEL,
    log: DEFAULT_LOG_FUNCTION,
}

export const createLoggingHandler = <T extends Event, C extends Context>(logger: Logger, options: Partial<LoggingHandlerOptions>): LoggingHandler<T, C> => {

    const loggingOptions = { ...DEFAULT_LOGGING_HANDLER_OPTIONS, ...clean(options) };
    let handlerLogger = logger;
    if (loggingOptions.context) {
        handlerLogger = wrapLogger(handlerLogger, loggingOptions.context);
    }

    const level = loggingOptions.level!;

    return {
        handle: async (event: T, context: C): Promise<void> => {
            const [message, ...args] = loggingOptions.log!(event, context);
            handlerLogger[level](message, ...args);
        }
    }
}
