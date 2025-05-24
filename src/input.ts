export interface Input {
    [key: string]: unknown;
}

export const EMPTY_INPUT: Input = {};

export const isInput = (input: unknown): input is Input => {
    return typeof input === 'object' && input !== null && !Array.isArray(input);
};

export const validateInput = (input: unknown): input is Input => {
    if (!isInput(input)) {
        throw new Error('Input must be an object');
    }
    return true;
};
