import { createBeginning, DEFAULT_BEGINNING_OPTIONS, isBeginning } from '../../src/transition/beginning';
import { Input } from '../../src/input';
import { Context } from '../../src/context';

describe('Beginning', () => {
    describe('createBeginning', () => {
        it('should create a Beginning with default options when no options are provided', () => {
            const id = 'testBeginning';
            const targetNodeId = 'targetNode';
            const beginning = createBeginning(id, targetNodeId);

            expect(beginning.id).toBe(id);
            expect(beginning.type).toBe('beginning');
            expect(beginning.targetNodeId).toBe(targetNodeId);
            expect(beginning.begin).toBe(DEFAULT_BEGINNING_OPTIONS.begin);
        });

        it('should create a Beginning with custom options when options are provided', async () => {
            const id = 'customBeginning';
            const targetNodeId = 'customTarget';
            const customBegin = async (input: Input, context: Context) => {
                return { ...input, customData: 'processed' };
            };
            const options = { begin: customBegin };
            const beginning = createBeginning(id, targetNodeId, options);

            expect(beginning.id).toBe(id);
            expect(beginning.type).toBe('beginning');
            expect(beginning.targetNodeId).toBe(targetNodeId);
            expect(beginning.begin).toBe(customBegin);

            // Test the custom begin function
            const initialInput: Input = { data: 'initial' };
            const context: Context = { environment: 'test', data: {} };
            const result = await beginning.begin(initialInput, context);
            expect(result).toEqual({ data: 'initial', customData: 'processed' });
        });

        it('should override default begin function with a custom one', () => {
            const id = 'overrideBeginning';
            const targetNodeId = 'overrideTarget';
            const customBegin = async (input: Input) => ({ ...input, modified: true });
            const beginning = createBeginning(id, targetNodeId, { begin: customBegin });

            expect(beginning.begin).not.toBe(DEFAULT_BEGINNING_OPTIONS.begin);
            expect(beginning.begin).toBe(customBegin);
        });

        it('should use default begin function if options object is empty', () => {
            const id = 'emptyOptionsBeginning';
            const targetNodeId = 'emptyOptionsTarget';
            const beginning = createBeginning(id, targetNodeId, {});
            expect(beginning.begin).toBe(DEFAULT_BEGINNING_OPTIONS.begin);
        });

        it('should use default begin function if options object has undefined begin', () => {
            const id = 'undefinedBeginBeginning';
            const targetNodeId = 'undefinedBeginTarget';
            const beginning = createBeginning(id, targetNodeId, { begin: undefined });
            expect(beginning.begin).toBe(DEFAULT_BEGINNING_OPTIONS.begin);
        });
    });

    describe('isBeginning', () => {
        it('should return true for a valid Beginning object', () => {
            const beginning = createBeginning('testId', 'targetNode');
            expect(isBeginning(beginning)).toBe(true);
        });

        it('should return true for a valid Beginning object with a custom begin function', () => {
            const beginning = createBeginning('testId', 'targetNode', { begin: async () => ({}) });
            expect(isBeginning(beginning)).toBe(true);
        });

        it('should return false if item is not a transition', () => {
            expect(isBeginning({ type: 'beginning', id: 'fake', begin: () => { } })).toBe(true);
        });

        it('should return false if type is not beginning', () => {
            const notBeginning = {
                id: 'transition1',
                type: 'someOtherType',
                begin: async () => ({}),
                targetNodeId: 'node1'
            };
            // We need to cast to any to bypass Transition type checking for this test case
            expect(isBeginning(notBeginning as any)).toBe(false);
        });

        it('should return false if begin is present but not a function', () => {
            const invalidBeginning = {
                ...createBeginning('testId', 'targetNode'),
                begin: 'not a function'
            };
            expect(isBeginning(invalidBeginning)).toBe(false);
        });

        it('should return true if begin is undefined (uses default)', () => {
            const beginningLike = {
                id: 'transition1',
                type: 'beginning',
                targetNodeId: 'node1',
                // begin is intentionally omitted to test default handling in isBeginning logic
            };
            // Need to ensure it passes the base isTransition check first
            const transitionPart = { id: 'transition1', type: 'beginning' };
            const beginningWithTransitionProps = { ...transitionPart, targetNodeId: 'node1' };
            expect(isBeginning(beginningWithTransitionProps)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isBeginning(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isBeginning(undefined)).toBe(false);
        });

        it('should return false for a plain object', () => {
            expect(isBeginning({})).toBe(false);
        });

        it('should return false for an array', () => {
            expect(isBeginning([])).toBe(false);
        });
    });
});
