import { Termination } from '../xenocline';
import { Context } from '../context';
import { Output } from '../output';
import { Connection } from './connection';
import { createTransition, isTransition, Transition, validateTransition } from './transition';

export type DecideFunction<O extends Output = Output, C extends Context = Context> = (output: O, context: C) => Promise<Termination<O, C> | Connection<O, C>[]>;

/**
 * Represents a decision point in the process flow, taking a phase's output and context
 * to determine the next step.
 */
export interface Decision<
    O extends Output = Output,
    C extends Context = Context,
> extends Transition {
    type: 'decision';
    decide: DecideFunction<O, C>;
}


export const createDecision = <O extends Output = Output, C extends Context = Context>(
    id: string,
    decide: DecideFunction<O, C>
): Readonly<Decision<O, C>> => {

    return {
        ...createTransition('decision', id),
        decide,
    } as Decision<O, C>;
};

export const isDecision = <O extends Output = Output, C extends Context = Context>(item: any): item is Decision<O, C> => {
    return isTransition(item) && item.type === 'decision' && typeof (item as Decision<O, C>).decide === 'function';
};

export const validateDecision = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const decisionBaseCoordinates = [...(coordinates || []), 'Decision'];

    errors.push(...validateTransition(item, coordinates));

    if (errors.length === 0) {
        if (item && typeof item === 'object') {
            const decisionSpecificErrorPath = [...decisionBaseCoordinates, `Decision: ${item.id}`];

            if (item.type === 'decision') {
                if (typeof item.decide !== 'function') {
                    errors.push({ coordinates: decisionSpecificErrorPath, error: 'Property "decide" must be a function when type is "decision".' });
                }
            } else {
                // If type is not 'decision', but 'decide' property exists and is malformed.
                if (item.decide !== undefined && typeof item.decide !== 'function') {
                    errors.push({ coordinates: decisionSpecificErrorPath, error: 'Property "decide" is present but is not a function.' });
                }
            }
        }
    }
    return errors;
};