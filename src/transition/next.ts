import { Output } from '../output';
import { Context } from '../context';
import { isTermination, Termination, validateTermination } from './termination';
import { Connection, isConnection, validateConnection } from './connection';
import { Decision, isDecision, validateDecision } from './decision';

type NonEmptyArray<T> = [T, ...T[]];

export type Next<O extends Output = Output, C extends Context = Context> = Termination<O, C> | Readonly<NonEmptyArray<Connection<O, C>>> | Readonly<NonEmptyArray<Decision<O, C>>>;

export const isNext = <O extends Output = Output, C extends Context = Context>(item: any): item is Next<O, C> => {
    if (isTermination<O, C>(item)) {
        return true;
    }

    if (!Array.isArray(item)) {
        return false;
    }

    if (item.length === 0) {
        return true;
    }

    const firstElement = item[0];
    if (isConnection<O, C>(firstElement)) {
        return item.every((el: any) => isConnection<O, C>(el));
    }
    if (isDecision<O, C>(firstElement)) {
        return item.every((el: any) => isDecision<O, C>(el));
    }

    return false;
};

const validateDecisionOrConnectionArray = <O extends Output = Output, C extends Context = Context>(item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || [])];

    if (item.length === 0) {
        errors.push({ coordinates: [...currentCoordinates], error: 'Next Array is empty.' });
        return errors;
    }

    const firstElement = item[0];
    if (isConnection<O, C>(firstElement)) {
        for (const element of item) {
            errors.push(...validateConnection(element, currentCoordinates));
        }
    } else if (isDecision<O, C>(firstElement)) {
        for (const element of item) {
            errors.push(...validateDecision(element, currentCoordinates));
        }
    } else {
        errors.push({ coordinates: [...currentCoordinates], error: 'Next Array contains invalid element types. Expected all Connections or all Decisions.' });
    }

    return errors;
}

export const validateNext = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];

    const currentCoordinates = [...(coordinates || []), 'Next'];

    if (item === undefined || item === null) {
        errors.push({ coordinates: [...currentCoordinates], error: 'Next is undefined or null.' });
        return errors;
    }

    if (Array.isArray(item)) {
        errors.push(...validateDecisionOrConnectionArray(item, currentCoordinates));
    } else {
        errors.push(...validateTermination(item, currentCoordinates));
    }

    return errors;
}