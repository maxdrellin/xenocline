// NEW: Termination type extending Transition
/**
 * Represents a termination point in the process flow, consuming a phase's output.
 */

import { clean } from '../util/general';
import { Context } from '../context';
import { Output } from '../output';
import { createTransition, isTransition, Transition, validateTransition } from './transition';

export type TerminateFunction<O extends Output = Output, C extends Context = Context> = (output: O, context: C) => Promise<Output>;

export interface Termination<
    O extends Output = Output,
    C extends Context = Context,
> extends Transition {
    type: 'termination';
    // Currently, Termination is a marker type.
    // Future properties could include:
    // reason?: string; // To describe why termination occurred
    terminate: TerminateFunction<O, C>; // A function to execute upon termination
}

export interface TerminationOptions<O extends Output = Output, C extends Context = Context> {
    terminate: TerminateFunction<O, C>;
}

export const createTermination = <O extends Output = Output, C extends Context = Context>(
    id: string,
    options?: Partial<TerminationOptions<O, C>>
): Readonly<Termination<O, C>> => {

    const defaultOptions: TerminationOptions<O, C> = {
        terminate: async (output) => {
            return output;
        }
    };

    let terminationOptions: TerminationOptions<O, C> = { ...defaultOptions };
    if (options) {
        terminationOptions = { ...terminationOptions, ...clean(options) };
    }

    return {
        ...createTransition('termination', id),
        terminate: terminationOptions.terminate,
    } as Termination<O, C>;
};

export const isTermination = <O extends Output = Output, C extends Context = Context>(item: any): item is Termination<O, C> => {
    return isTransition(item) &&
        item.type === 'termination' &&
        ((item as Termination<O, C>).terminate === undefined || typeof (item as Termination<O, C>).terminate === 'function');
};

export const validateTermination = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'Termination'];

    errors.push(...validateTransition(item, currentCoordinates));

    if (errors.length === 0) {
        currentCoordinates.push(`Termination: ${item.id}`);

        if (item.terminate !== undefined && typeof item.terminate !== 'function') {
            errors.push({ coordinates: [...currentCoordinates], error: 'terminate is not a function.' });
        }
    }

    return errors;
};
