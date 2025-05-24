import { Context } from '../context';
import { Event } from '../event'; // Assuming src/event.ts will export the base Event type
import { EventHandler } from '../event'; // Assuming src/event.ts will export EventHandler

/**
 * Represents the state for managing event handlers.
 * Event handlers are expected to handle the base `Event` type and perform
 * specific event checking internally if needed (e.g., using type guards).
 */
export interface EventState<C extends Context> {
    /** Readonly array of registered event handlers. */
    readonly handlers: ReadonlyArray<EventHandler<Event, C>>;
}

/**
 * Creates an instance of EventState.
 * @param handlers An optional array of event handlers to initialize the state with.
 *                 These handlers should be of type `EventHandler<Event, C>`, meaning they
 *                 are prepared to receive any event and filter internally if necessary.
 * @returns A new, readonly EventState object.
 */
export const createEventState = <C extends Context>(
    handlers?: ReadonlyArray<EventHandler<Event, C>>
): Readonly<EventState<C>> => {
    // Store a copy of the handlers array to ensure immutability of the provided array.
    return { handlers: handlers ? [...handlers] : [] };
};

/**
 * Dispatches an event to all registered handlers.
 * @param eventState The current event state containing the handlers.
 * @param event The event to dispatch. This can be any specific event type that extends `Event`.
 * @param context The current context to pass to the handlers.
 */
export const dispatchEvent = async <E extends Event, C extends Context>(
    eventState: Readonly<EventState<C>>,
    event: E,
    context: C
): Promise<void> => {
    for (const handler of eventState.handlers) {
        // Each handler is EventHandler<Event, C>, so its `handle` method expects an `Event`.
        // Since `E` extends `Event`, passing `event` (of type `E`) is type-safe.
        await handler.handle(event, context);
    }
};
