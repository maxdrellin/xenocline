import { executeNode } from './node';
import { ExecutionState } from './process';
import { Context } from '../context';
import { Input } from '../input';
import { Output } from '../output';
import { Connection, isConnection } from '../transition/connection';
import { Decision, isDecision } from '../transition/decision';
import { isTermination, Termination } from '../transition/termination';
import { dispatchEvent } from './event';
import { createConnectionEvent, createDecisionEvent, createTerminationEvent } from '../event';

// Helper function to handle the next step in the process
export async function handleNextStep(
    nodeOutput: Output,
    nodeId: string,
    next: Termination | Connection[] | Decision[], // Can be Termination, Connection[], or Decision[] - will be narrowed down
    state: ExecutionState
): Promise<void> {

    //console.log('[_HANDLE_NEXT_STEP_START]', { nodeId, nodeOutput, nextType: next && next.constructor ? next.constructor.name : typeof next, next });

    if (Array.isArray(next) && next.length > 0 && next.every(isDecision)) {
        const decisions = next as Decision<Output, Context>[];
        // console.log('[_HANDLE_NEXT_STEP_DECISIONS]', { nodeId, count: decisions.length, decisions });

        for (const decision of decisions) {
            // console.log('[_HANDLE_NEXT_STEP_DECISION_PROCESSING]', { nodeId, decisionId: decision.id, decision });
            await dispatchEvent(
                state.eventState,
                createDecisionEvent(nodeId, 'start', decision, { output: nodeOutput }),
                state.context
            );
            try {
                const decisionOutcome = await decision.decide(nodeOutput, state.context);
                await dispatchEvent(
                    state.eventState,
                    createDecisionEvent(nodeId, 'decide', decision, { output: nodeOutput, result: decisionOutcome }),
                    state.context
                );
                // console.log('[_HANDLE_NEXT_STEP_DECISION_OUTCOME]', { nodeId, decisionId: decision.id, decisionOutcome });
                await handleNextStep(nodeOutput, decision.id, decisionOutcome, state); // outcome processed, decision.id is context for next step if it's an error source. The original nodeId is implicitly the source of this decision.
                await dispatchEvent(
                    state.eventState,
                    createDecisionEvent(nodeId, 'end', decision), // Fire 'end' event after successful processing
                    state.context
                );
            } catch (decisionError: any) {
                // eslint-disable-next-line no-console
                console.error(`[_HANDLE_NEXT_STEP_DECISION_ERROR] Error in decision ${decision.id} from node ${nodeId}:`, { decisionError, nodeId, decisionId: decision.id });
                state.errors.push({ nodeId: decision.id, message: decisionError.message });
                // Note: 'end' event for this decision path is skipped due to error.
            }
        }
    } else if (Array.isArray(next) && next.length > 0 && next.every(isConnection)) {

        //console.log('[_HANDLE_NEXT_STEP_CONNECTIONS]', { nodeId, count: next.length, connections: next });
        const connections = next as Connection<Output, Context>[];
        const nextPhasePromises: Promise<Output>[] = [];
        for (const connection of connections) {

            let nextInput = nodeOutput as Input;
            let nextContext = state.context;

            await dispatchEvent(
                state.eventState,
                createConnectionEvent(nodeId, 'start', connection, { input: nextInput }),
                state.context
            );

            if (connection.transform) {

                //console.log('[_HANDLE_NEXT_STEP_CONNECTION_TRANSFORM_START]', { nodeId, targetNodeId: connection.targetNodeId });
                try {
                    const context = state.context;
                    [nextInput, nextContext] = await connection.transform(nodeOutput, context);
                    await dispatchEvent(
                        state.eventState,
                        createConnectionEvent(nodeId, 'transform', connection, { input: nextInput, output: nodeOutput, context: nextContext }),
                        state.context
                    );
                    state.context = nextContext;

                    //console.log('[_HANDLE_NEXT_STEP_CONNECTION_TRANSFORM_SUCCESS]', { nodeId, targetNodeId: connection.targetNodeId, nextInput, nextContext });
                } catch (transformError: any) {
                    // eslint-disable-next-line no-console
                    console.error(`[_HANDLE_NEXT_STEP_CONNECTION_TRANSFORM_ERROR] Error in transform for connection from ${nodeId} to ${connection.targetNodeId}:`, { transformError, nodeId, targetNodeId: connection.targetNodeId });
                    state.errors.push({ nodeId: connection.targetNodeId, message: transformError.message });
                    // Note: 'end' event for this connection path is skipped due to error in transform
                    continue;
                }
            }

            //console.log('[_HANDLE_NEXT_STEP_CONNECTION_EXECUTE_TARGET]', { nodeId, targetNodeId: connection.targetNodeId, nextInput });
            nextPhasePromises.push(executeNode(connection.targetNodeId, nextInput, state));
            await dispatchEvent(
                state.eventState,
                createConnectionEvent(nodeId, 'end', connection), // Fire 'end' event after initiating next step
                state.context
            );
        }
        // Optional: await Promise.all(nextPhasePromises); // Current design relies on executeProcess waiting on activeExecutions

        //console.log('[_HANDLE_NEXT_STEP_CONNECTIONS_PROMISES_PUSHED]', { nodeId, count: nextPhasePromises.length });
    } else if (isTermination(next)) {

        //console.log('[_HANDLE_NEXT_STEP_TERMINATION]', { nodeId, termination: next });
        const termination = next as Termination<Output, Context>;
        await dispatchEvent(
            state.eventState,
            createTerminationEvent(nodeId, 'start', termination, { output: nodeOutput }),
            state.context
        );
        const result: Output = nodeOutput;
        if (termination.terminate) {

            //console.log('[_HANDLE_NEXT_STEP_TERMINATION_CALLING_TERMINATE_FN]', { nodeId, terminationId: termination.id });
            termination.terminate(nodeOutput, state.context);
            await dispatchEvent(
                state.eventState,
                createTerminationEvent(nodeId, 'terminate', termination, { output: nodeOutput }),
                state.context
            );
        }

        state.results[termination.id] = result;
    } else if (Array.isArray(next) && next.length === 0) {
        // Empty array, potentially from a Decision that leads to no connections or an empty Connection array.
        // This could mean an implicit termination for this path or simply no further action from this branch.
        // If it's considered an end state for the path, store the result.

        const result: Output = nodeOutput;
        state.results[nodeId] = result; // Using nodeId as the key for this implicit termination
    } else {
        // If there is no next (e.g. next is undefined or null after a decision), or it's an unhandled type.
        // Consider this an end state and store the result with the nodeId

        //console.log('[_HANDLE_NEXT_STEP_NO_NEXT_OR_UNHANDLED]', { nodeId, next, nodeOutput });
        const result: Output = nodeOutput;
        state.results[nodeId] = result;
    }

    //console.log('[_HANDLE_NEXT_STEP_END]', { nodeId });
}
