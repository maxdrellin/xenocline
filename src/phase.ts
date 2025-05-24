import { clean } from "./util/general";
import { Input } from "./input";
import { Output } from "./output";

export type ExecuteMethod<T extends Input = Input, U extends Output = Output> = (input: T) => Promise<U>;

export interface Phase<T extends Input = Input, U extends Output = Output> {
    name: string;
    execute: (input: T) => Promise<U>;
}

export interface PhaseOptions<T extends Input = Input, U extends Output = Output> {
    execute: ExecuteMethod<T, U>;
}


export const createPhase = <T extends Input = Input, U extends Output = Output>(
    name: string,
    options: Partial<PhaseOptions<T, U>>
): Readonly<Phase<T, U>> => {

    const defaultOptions: PhaseOptions<T, U> = {
        execute: async (input: T) => {
            return input as unknown as U;
        }
    };

    const phaseOptions: PhaseOptions<T, U> = { ...defaultOptions, ...clean(options) };

    return {
        name,
        execute: phaseOptions.execute
    };
}

export const isPhase = <T extends Input = Input, U extends Output = Output>(obj: any): obj is Phase<T, U> => {
    return obj !== undefined && obj !== null && typeof obj === 'object' && typeof obj.name === 'string' && typeof obj.execute === 'function';
}

export const validatePhase = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'Phase'];

    if (item === undefined || item === null) {
        errors.push({ coordinates: [...currentCoordinates], error: 'Phase is undefined or null.' });
        return errors;
    }

    if (item.name === undefined || typeof item.name !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Phase name is undefined or not a string.' });
    }

    currentCoordinates.push(`Phase: ${item.name}`);

    if (item.execute === undefined || typeof item.execute !== 'function') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Phase execute is undefined or not a function.' });
    }

    return errors;
}