import { Input } from '../input';
import { Context } from '../context';
import { Output } from '../output';
import { createTransition, isTransition, Transition, validateTransition } from './transition';
import { clean } from '../util/general';

export type TransformFunction<O extends Output = Output, C extends Context = Context> = (output: O, context: C) => Promise<[Input, C]>;

// MODIFIED: Connection to extend Transition
export interface Connection<
    O extends Output = Output,
    C extends Context = Context,
> extends Transition {
    type: 'connection';
    targetNodeId: string; // ID of the target PhaseNode in the process's phases collection
    // Optional function to transform the output of the current phase
    // to the input of the target phase.
    // If not provided, the output is assumed to be compatible directly.
    transform: TransformFunction<O, C>;
}

export interface ConnectionOptions<O extends Output = Output, C extends Context = Context> {
    transform: TransformFunction<O, C>;
}

export const DEFAULT_CONNECTION_OPTIONS: ConnectionOptions = {
    transform: async (output, context) => {
        return [output as Input, context];
    }
};

export const createConnection = <O extends Output = Output, C extends Context = Context>(
    id: string,
    targetNodeId: string,
    options?: Partial<ConnectionOptions<O, C>>
): Readonly<Connection<O, C>> => {

    let connectionOptions: ConnectionOptions<O, C> = { ...DEFAULT_CONNECTION_OPTIONS } as unknown as ConnectionOptions<O, C>;

    if (options) {
        connectionOptions = { ...connectionOptions, ...clean(options) };
    }

    return {
        ...createTransition('connection', id),
        targetNodeId,
        transform: connectionOptions.transform,
    } as Connection<O, C>;
};

export const isConnection = <O extends Output = Output, C extends Context = Context>(item: any): item is Connection<O, C> => {
    return isTransition(item) && item.type === 'connection' && (item as Connection<O, C>).targetNodeId !== undefined;
};

export const validateConnection = (
    item: any,
    coordinates?: string[]
): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const connectionBaseCoordinates = [...(coordinates || []), 'Connection'];

    errors.push(...validateTransition(item, coordinates));

    if (errors.length === 0) {
        if (item && typeof item === 'object') {
            const connectionSpecificErrorPath = [...connectionBaseCoordinates, `Connection: ${item.id}`];

            if (item.type === 'connection') {
                if (typeof item.targetNodeId !== 'string') {
                    errors.push({ coordinates: connectionSpecificErrorPath, error: 'Property "targetNodeId" must be a string when type is "connection".' });
                }
                // transform is optional, but if present, must be a function.
                if (item.transform !== undefined && typeof item.transform !== 'function') {
                    errors.push({ coordinates: connectionSpecificErrorPath, error: 'Optional property "transform" must be a function if present.' });
                }
            } else {
                // If type is not 'connection', but these properties exist and are malformed.
                // This primarily helps catch if a non-connection object has these fields incorrectly defined.
                if (item.targetNodeId !== undefined && typeof item.targetNodeId !== 'string') {
                    errors.push({ coordinates: connectionSpecificErrorPath, error: 'Property "targetNodeId" is present but is not a string.' });
                }
                if (item.transform !== undefined && typeof item.transform !== 'function') {
                    errors.push({ coordinates: connectionSpecificErrorPath, error: 'Property "transform" is present but is not a function.' });
                }
            }
        }
    }
    return errors;
};

/**
 * Event emitted specifically for connection transitions.
 */
export interface ConnectionEvent extends TransitionEvent {
    transitionType: 'connection';
}
