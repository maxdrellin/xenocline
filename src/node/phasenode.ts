import { Next } from '../transition/next';
import { Context } from '../context';
import { Input } from '../input';
import { Output } from '../output';
import { isPhase, Phase, validatePhase } from '../phase';
import { createNode, isNode, Node, validateNode } from './node';
import { clean } from '../util/general';

export type ProcessMethod<O extends Output = Output, C extends Context = Context> = (output: O, context: C) => Promise<[O, C]>;
export type PrepareMethod<I extends Input = Input, C extends Context = Context> = (input: I, context: C) => Promise<[I, C]>;

export interface PhaseNode<
    I extends Input = Input,        // Input to this phase instance
    O extends Output = Output,      // Output from this phase instance
> extends Node {
    type: 'phase';
    phase: Phase<I, O>; // The actual phase instance

    // The prepare method is called before the phase is executed.
    // The input is the input for the phase, and the context is saved to the process context.
    prepare?: PrepareMethod;

    // The process method is called after the phase is executed, but before the next node is executed.
    // The output is the input for the next node, and the context is saved to the process context.
    process?: ProcessMethod;
}

export interface PhaseNodeOptions<O extends Output = Output, C extends Context = Context> {
    next?: Next<O, C>;
}

export const DEFAULT_PHASE_NODE_OPTIONS: PhaseNodeOptions<Output, Context> = {
}

export const createPhaseNode = <I extends Input = Input, O extends Output = Output, C extends Context = Context>(
    id: string,
    phase: Phase<I, O>,
    options?: Partial<PhaseNodeOptions<O, C>>
): Readonly<PhaseNode<I, O>> => {
    let phaseNodeOptions: PhaseNodeOptions<O, C> = { ...DEFAULT_PHASE_NODE_OPTIONS } as unknown as PhaseNodeOptions<O, C>;
    if (options) {
        phaseNodeOptions = { ...phaseNodeOptions, ...clean(options) };
    }

    return {
        ...createNode('phase', id, { next: phaseNodeOptions.next }),
        phase,
    } as PhaseNode<I, O>;
};

export const isPhaseNode = (obj: any): obj is PhaseNode<any, any> => {
    if (!isNode(obj) || obj.type !== 'phase') {
        return false;
    }
    const potentialPhaseNode = obj as PhaseNode<any, any>;

    if (!(
        potentialPhaseNode.phase && typeof potentialPhaseNode.phase === 'object' && isPhase(potentialPhaseNode.phase)
    )) {
        return false;
    }

    return true;
};

export const validatePhaseNode = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'PhaseNode'];

    errors.push(...validateNode(item, currentCoordinates));

    currentCoordinates.push(`PhaseNode: ${item.id}`);

    if (item.phase === undefined) {
        errors.push({ coordinates: [...currentCoordinates], error: 'phase is undefined.' });
    } else {
        errors.push(...validatePhase(item.phase, currentCoordinates));
    }

    return errors;
};