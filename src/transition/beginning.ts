// NEW: Termination type extending Transition
/**
 * Represents a termination point in the process flow, consuming a phase's output.
 */

import { clean } from '../util/general';
import { Context } from '../context';
import { Input } from '../input';
import { createTransition, isTransition, Transition, validateTransition } from './transition';

export type BeginFunction<I extends Input = Input, C extends Context = Context> = (input: I, context: C) => Promise<Input>;

export interface Beginning<
    I extends Input = Input,
    C extends Context = Context,
> extends Transition {
    type: 'beginning';
    targetNodeId: string;
    // Currently, Termination is a marker type.
    // Future properties could include:
    // reason?: string; // To describe why termination occurred
    begin: BeginFunction<I, C>; // A function to execute upon beginning
}

export interface BeginningOptions<I extends Input = Input, C extends Context = Context> {
    begin: BeginFunction<I, C>;
}

export const DEFAULT_BEGINNING_OPTIONS: BeginningOptions<Input, Context> = {
    begin: async (input) => {
        return input;
    }
};

export const createBeginning = <I extends Input = Input, C extends Context = Context>(
    id: string,
    targetNodeId: string,
    options?: Partial<BeginningOptions<I, C>>
): Readonly<Beginning<I, C>> => {
    let beginningOptions: BeginningOptions<I, C> = { ...DEFAULT_BEGINNING_OPTIONS };
    if (options) {
        beginningOptions = { ...beginningOptions, ...clean(options) };
    }

    return {
        ...createTransition('beginning', id),
        targetNodeId,
        begin: beginningOptions.begin,
    } as Beginning<I, C>;
};

export const isBeginning = <I extends Input = Input, C extends Context = Context>(item: any): item is Beginning<I, C> => {
    return isTransition(item) &&
        item.type === 'beginning' &&
        ((item as Beginning<I, C>).begin === undefined || typeof (item as Beginning<I, C>).begin === 'function');
};

export const validateBeginning = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'Beginning'];

    errors.push(...validateTransition(item, currentCoordinates));

    if (errors.length === 0) {
        currentCoordinates.push(`Beginning: ${item.id}`);

        if (item.begin !== undefined && typeof item.begin !== 'function') {
            errors.push({ coordinates: [...currentCoordinates], error: 'begin is not a function.' });
        }
    }

    return errors;
};
