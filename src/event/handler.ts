import { Context } from '../context';
import { Event } from './event';

export type HandleMethod<E extends Event = Event, C extends Context = Context> = (event: E, context: C) => Promise<void>;

export interface EventHandler<E extends Event = Event, C extends Context = Context> {
    handle: HandleMethod<E, C>;
}

export const createEventHandler = <E extends Event = Event, C extends Context = Context>(handle: HandleMethod<E, C>): EventHandler<E, C> => {
    return {
        handle
    };
};