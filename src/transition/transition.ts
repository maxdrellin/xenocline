export type TransitionType = 'connection' | 'decision' | 'termination' | 'beginning';

/**
 * Base interface for transitions between nodes in a process.
 * It is primarily a marker interface that allows Connection,
 * Decision and Termination to share common generics.
 */
export interface Transition {
    id: string;
    type: TransitionType;
}

export const createTransition = (type: TransitionType, id: string): Readonly<Transition> => {
    return {
        id,
        type,
    };
};

export const isTransition = (item: any): item is Transition => {
    return item !== null && typeof item === 'object' && typeof item.id === 'string' && (item.type === 'connection' || item.type === 'decision' || item.type === 'termination' || item.type === 'beginning');
};

export const validateTransition = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'Transition'];

    if (item === undefined || item === null) {
        errors.push({ coordinates: [...currentCoordinates], error: 'Transition is undefined or null.' });
        return errors;
    }

    if (typeof item !== 'object') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Transition is not an object.' });
        return errors;
    }

    if (item.id === undefined || typeof item.id !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Transition id is undefined or not a string.' });
    }

    if (item.type === undefined || typeof item.type !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Transition type is undefined or not a string.' });
    }

    if (item.type !== 'connection' && item.type !== 'decision' && item.type !== 'termination' && item.type !== 'beginning') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Transition type is not a valid type.' });
    }

    // We have an id, push to current coordinates
    currentCoordinates.push(`Transition: ${item.id}`);

    if (item.type === undefined || typeof item.type !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Transition type is undefined or not a string.' });
    }

    return errors;
};