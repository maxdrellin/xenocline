//import * as ClassifyPhase from './phases/classify';
// import * as TranscribePhase from './phases/transcribe';
// import * as ComposePhase from './phases/compose';
// import * as CompletePhase from './phases/complete';
import { AggregatorNode } from './node/aggregatornode';
import { validateNode } from './node/node';
import { PhaseNode } from './node/phasenode';
import { Connection, isConnection } from './transition/connection';
import { clean } from './util/general';
// Removed: import { Phase } from './phase';
// Removed: import { Event, EventHandler, EventState, createEventState } from './event';

export interface ProcessOptions {
    phases: Record<string, PhaseNode | AggregatorNode>;
    // Removed: eventHandlers?: ReadonlyArray<EventHandler<Event, C>>;
}

export interface Process {
    name: string;
    phases: Record<string, PhaseNode | AggregatorNode>;
    // Removed: readonly eventState: Readonly<EventState<C>>;
}

export const createProcess = (
    name: string,
    options: Partial<ProcessOptions>
): Readonly<Process> => {
    const defaultOptions: ProcessOptions = {
        phases: {},
        // Removed: eventHandlers: [],
    };

    const processOptions: ProcessOptions = { ...defaultOptions, ...clean(options) };

    // Removed: const eventState = createEventState<C>(processOptions.eventHandlers);

    return {
        name,
        phases: processOptions.phases,
        // Removed: eventState
    };
}

export const isProcess = (obj: any): obj is Process => {
    return obj !== undefined && obj !== null && typeof obj === 'object' && typeof obj.name === 'string' && typeof obj.phases === 'object';
}

export const validateProcess = (
    item: any,
    coordinates?: string[]
): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'Process'];

    if (item === undefined || item === null) {
        errors.push({ coordinates: [...currentCoordinates], error: 'Process is undefined or null.' });
        return errors;
    }

    if (item.name === undefined || typeof item.name !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Process name is undefined or not a string.' });
    }

    const processNameForPath = typeof item.name === 'string' ? item.name : 'UnnamedProcess';
    const basePath = [...currentCoordinates, `name:${processNameForPath}`];

    if (item.phases === undefined || typeof item.phases !== 'object') {
        errors.push({ coordinates: [...basePath, 'phases'], error: 'Process phases is undefined or not an object.' });
    } else {
        for (const phaseId in item.phases) {
            const node = item.phases[phaseId];
            if (Object.prototype.hasOwnProperty.call(item.phases, phaseId)) {
                errors.push(...validateNode(node, [...basePath, 'phases', phaseId]));
            }
        }

        for (const phaseId in item.phases) {
            if (Object.prototype.hasOwnProperty.call(item.phases, phaseId)) {
                const node = item.phases[phaseId];
                if (node && typeof node === 'object' && node.next) {
                    if (Array.isArray(node.next)) {
                        const transitions = node.next as any[];
                        if (transitions.length > 0 && transitions.every(t => isConnection(t))) {
                            (transitions as Connection[]).forEach((connection, index) => {
                                if (connection && typeof connection.targetNodeId === 'string') {
                                    if (!(connection.targetNodeId in item.phases)) {
                                        errors.push({
                                            coordinates: [...basePath, 'phases', phaseId, 'next', connection.id || `connection-at-index-${index}`],
                                            error: `Node "${phaseId}" has a connection to non-existent targetNodeId "${connection.targetNodeId}".`
                                        });
                                    }
                                } else if (!connection || connection.targetNodeId === undefined) {
                                    // This case should ideally be caught by validateConnection within validateNode's call to validateNext
                                    // but adding a fallback or note if connection structure itself is broken at this stage.
                                    // errors.push({
                                    //     coordinates: [...basePath, 'phases', phaseId, 'next', `connection-at-index-${index}`],
                                    //     error: `Connection at index ${index} for node "${phaseId}" is malformed or missing targetNodeId.`
                                    // });
                                }
                            });
                        }
                    }
                }
            }
        }
    }

    return errors;
}