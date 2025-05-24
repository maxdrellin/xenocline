import type { Event } from '../../event/event';

export interface EventFilter<E extends Event = Event> {
    type?: string[];
    stage?: string[];
    filter: (event: E) => boolean;
}

export const createEventFilter = <E extends Event = Event>(
    type?: string[],
    stage?: string[]
): EventFilter<E> => {
    const filterFn = (event: E): boolean => {
        const typeMatch = !type || type.includes(event.type);
        const stageMatch = !stage || stage.includes(event.stage);
        return typeMatch && stageMatch;
    };

    return {
        type,
        stage,
        filter: filterFn,
    };
};
