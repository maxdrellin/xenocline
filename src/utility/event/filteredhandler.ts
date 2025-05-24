import type { Event } from '../../event/event';
import type { Context } from '../../context';
import { createEventHandler, EventHandler, HandleMethod } from '../../event/handler';
import type { EventFilter } from './eventfilter';

export interface FilteredHandler<E extends Event = Event, C extends Context = Context> extends EventHandler<E, C> {
    filter: EventFilter<E>;
    handler: EventHandler<E, C>;
}

export const createFilteredHandler = <E extends Event = Event, C extends Context = Context>(
    filter: EventFilter<E>,
    options: { handler: EventHandler<E, C> } | { handle: HandleMethod<E, C> }
): FilteredHandler<E, C> => {
    const handler: EventHandler<E, C> = 'handler' in options ? options.handler : createEventHandler<E, C>(options.handle);

    const handle: HandleMethod<E, C> = async (event, context) => {
        if (filter.filter(event)) {
            await handler.handle(event, context);
        }
    };

    return {
        filter,
        handler,
        handle,
    };
};
