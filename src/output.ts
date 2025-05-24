export interface Output {
    [key: string]: unknown;
}

export const EMPTY_OUTPUT: Output = {};

export const isOutput = (output: unknown): output is Output => {
    return typeof output === 'object' && output !== null && !Array.isArray(output);
};

export const validateOutput = (output: unknown): output is Output => {
    if (!isOutput(output)) {
        throw new Error('Output must be an object');
    }
    return true;
};
