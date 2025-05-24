import { createEvent } from '../../../src/event/event';
import { createEventFilter } from '../../../src/utility/event/eventfilter';

describe('EventFilter', () => {
    it('matches events based on type and stage', () => {
        const filter = createEventFilter(['test'], ['start']);
        const event = createEvent('test', 'src', 'start');
        expect(filter.filter(event)).toBe(true);
        const failEvent = createEvent('other', 'src', 'start');
        expect(filter.filter(failEvent)).toBe(false);
    });

    it('matches all when criteria undefined', () => {
        const filter = createEventFilter();
        const event = createEvent('anything', 'src', 'stage');
        expect(filter.filter(event)).toBe(true);
    });
});
