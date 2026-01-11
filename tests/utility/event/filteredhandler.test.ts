import { describe,it,expect,vi } from 'vitest';
import { createEvent } from '../../../src/event/event';
import { createEventHandler } from '../../../src/event/handler';
import { createEventFilter } from '../../../src/utility/event/eventfilter';
import { createFilteredHandler } from '../../../src/utility/event/filteredhandler';

describe('FilteredHandler', () => {
    it('invokes handler when filter matches', async () => {
        const filter = createEventFilter(['type'], ['stage']);
        const handle = vi.fn();
        const fh = createFilteredHandler(filter, { handle });
        const event = createEvent('type', 'src', 'stage');
        await fh.handle(event, {} as any);
        expect(handle).toHaveBeenCalled();
    });

    it('does not invoke handler when filter fails', async () => {
        const filter = createEventFilter(['type'], ['stage']);
        const handle = vi.fn();
        const handler = createEventHandler(handle);
        const fh = createFilteredHandler(filter, { handler });
        const event = createEvent('type', 'src', 'other');
        await fh.handle(event, {} as any);
        expect(handle).not.toHaveBeenCalled();
    });
});
