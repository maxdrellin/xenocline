import { executeNode } from './node';
import { Context } from '../context';
import {
    AggregatorState,
    createAggregatorState
} from './aggregator';
import { EMPTY_INPUT, Input } from '../input';
import { Output } from '../output';
import { Process, validateProcess } from '../process';
import { Beginning } from '../transition/beginning';
import { clean } from '../util/general';
import { Event, EventHandler, EventState, createBeginningEvent, createEventState, createProcessEvent } from '../event';
import { dispatchEvent } from './event';

export interface PhaseResults {
    [key: string]: Output;
}

export interface ProcessResults {
    [key: string]: Output;
}

interface ProcessExecutionError {
    message: string;
    details?: any;
    nodeId?: string;
}

export interface ProcessExecutionOptions<I extends Input = Input, C extends Context = Context> {
    input: I;
    context: C;
    eventHandlers?: ReadonlyArray<EventHandler<Event, C>>;
}

export const DEFAULT_PROCESS_EXECUTION_OPTIONS: ProcessExecutionOptions<Input, Context> = {
    input: EMPTY_INPUT,
    context: {} as Context,
    eventHandlers: [],
}

export interface ExecutionState<C extends Context = Context> extends AggregatorState {
    process: Readonly<Process>;
    context: C;
    phaseResults: Record<string, Output>;
    results: Record<string, Output>;
    activeExecutions: Map<string, Promise<Output>>;
    errors: ProcessExecutionError[];
    readonly eventState: Readonly<EventState<C>>;
}

export async function executeProcess<I extends Input = Input, O extends Output = Output, C extends Context = Context>(
    processInstance: Readonly<Process>,
    beginning: Beginning<I, C>,
    options?: Partial<ProcessExecutionOptions<I, C>>
): Promise<[Record<string, O>, Record<string, O>, C]> {

    const processExecutionOptions: ProcessExecutionOptions<I, C> = {
        ...(DEFAULT_PROCESS_EXECUTION_OPTIONS as unknown as ProcessExecutionOptions<I, C>),
        ...clean(options || {}),
    };
    if (options && options.input) {
        processExecutionOptions.input = options.input;
    }
    if (options && options.eventHandlers) {
        processExecutionOptions.eventHandlers = options.eventHandlers;
    }

    const validationErrors = validateProcess(processInstance);
    if (validationErrors.length > 0) {
        const errorMessages = validationErrors.map(err => err.error).join('\n');
        throw new Error(`Invalid process definition:\n${errorMessages}`);
    }

    const eventState = createEventState<C>(processExecutionOptions.eventHandlers);

    const state: ExecutionState<C> = {
        process: processInstance,
        context: processExecutionOptions.context as C,
        results: {},
        phaseResults: {},
        activeExecutions: new Map<string, Promise<Output>>(),
        errors: [],
        ...createAggregatorState(),
        eventState: eventState,
    };

    dispatchEvent(
        state.eventState,
        createProcessEvent(processInstance.name, 'start', processInstance, { input: processExecutionOptions.input, context: state.context }),
        state.context
    );

    dispatchEvent(
        state.eventState,
        createBeginningEvent(beginning.id, 'start', beginning as Beginning<I, C>, { input: processExecutionOptions.input }),
        state.context
    );

    const initialInput = await beginning.begin(processExecutionOptions.input, state.context);
    dispatchEvent(
        state.eventState,
        createBeginningEvent(beginning.id, 'begin', beginning as Beginning<I, C>, { input: initialInput }),
        state.context
    );

    const initialNodeId = beginning.targetNodeId;

    if (!state.process.phases[initialNodeId]) {
        throw new Error(`Start phase ID "${initialNodeId}" not found in process phases.`);
    }

    try {
        await executeNode(initialNodeId, initialInput, state as unknown as ExecutionState<Context>);

        const allPromises = Array.from(state.activeExecutions.values());
        if (allPromises.length > 0) {
            await Promise.all(allPromises);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        state.errors.push({ message: "Critical error during process execution", details: errorMessage, nodeId: initialNodeId });
        // eslint-disable-next-line no-console
        console.error("[EXECUTE_PROCESS_CRITICAL_ERROR]", { processName: processInstance.name, error: errorMessage, collectedErrors: state.errors });
    }

    if (state.aggregatorDeferreds && state.aggregatorDeferreds.size > 0) {
        const pendingNodeIds = state.pendingAggregatorIds ? state.pendingAggregatorIds().join(', ') : 'unknown';
        // eslint-disable-next-line no-console
        console.warn(`[EXECUTE_PROCESS_PENDING_AGGREGATORS] Process execution may have pending aggregators: ${pendingNodeIds}.`, { processName: processInstance.name, pendingNodeIds });
    }

    dispatchEvent(
        state.eventState,
        createProcessEvent(processInstance.name, 'end', processInstance, { input: processExecutionOptions.input, context: state.context }),
        state.context
    );

    return [state.results as Record<string, O>, state.phaseResults as Record<string, O>, state.context];
}


