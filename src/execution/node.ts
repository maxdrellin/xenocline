import { Context } from '../context';
import { createAggregatorNodeEvent, createPhaseNodeEvent } from '../event/node';
import { createDecisionEvent } from '../event/transition';
import { Input } from '../input';
import { AggregatorNode, isAggregatorNode } from '../node/aggregatornode';
import { isPhaseNode, PhaseNode } from '../node/phasenode';
import { Output } from '../output';
import { Connection } from '../transition/connection';
import { Decision, isDecision } from '../transition/decision';
import { Termination } from '../transition/termination';
import {
    executeAggregatorNode
} from './aggregator';
import { dispatchEvent } from './event';
import { handleNextStep } from './next';
import { executePhase } from './phase';
import { ExecutionState } from './process';

export async function executeNode(
    nodeId: string,
    input: Input,
    state: ExecutionState
): Promise<Output> {

    //console.log('[EXECUTE_NODE_RECURSIVE_START]', { nodeId, input, phaseResultsKeys: Object.keys(state.phaseResults), activeExecutionsKeys: Array.from(state.activeExecutions.keys()), aggregatorDeferredsKeys: Array.from(state.aggregatorDeferreds.keys()) });

    // 1. Check if result is already cached in phaseResults (final output, node fully completed)
    if (state.phaseResults[nodeId]) {

        //console.log('[EXECUTE_NODE_RECURSIVE_CACHE_HIT_PHASERESULTS]', { nodeId, result: state.phaseResults[nodeId] });
        return state.phaseResults[nodeId];
    }

    const node = state.process.phases[nodeId] as PhaseNode | AggregatorNode;
    if (!node) {
        const error = new Error(`Node with ID "${nodeId}" not found.`);

        //console.error('[EXECUTE_NODE_RECURSIVE_NODE_NOT_FOUND]', { nodeId, error });
        state.errors.push({ nodeId, message: error.message });
        throw error;
    }

    //console.log('[EXECUTE_NODE_RECURSIVE_NODE_FOUND]', { nodeId, nodeType: node.constructor.name, node });

    // 2. Handle active/pending executions
    // If it's an aggregator that has a deferred promise, it means it's pending.
    // We need to re-evaluate it with the current input. The IIFE below will handle this.
    if (state.activeExecutions.has(nodeId) && !isAggregatorNode(node)) {
        // For non-aggregators, if already active, return the promise.
        // Aggregators will fall through to the IIFE to allow input processing.
        // The IIFE itself handles returning a shared deferred promise if needed.

        //console.log('[EXECUTE_NODE_RECURSIVE_ACTIVE_EXECUTION_HIT_NON_AGGREGATOR]', { nodeId });
        return state.activeExecutions.get(nodeId)!;
    }
    // If it IS an aggregator and state.activeExecutions.has(nodeId),
    // it means its deferred.promise might be in activeExecutions from a previous input that made it pending.
    // The IIFE logic below will correctly retrieve this deferred (if it exists and is still relevant)
    // from state.aggregatorDeferreds.get(nodeId) and use its promise, or process the input.


    //console.log('[EXECUTE_NODE_RECURSIVE_CONTINUING_TO_EXECUTION_LOGIC]', { nodeId, isActive: state.activeExecutions.has(nodeId), isAggregator: isAggregatorNode(node), hasDeferred: state.aggregatorDeferreds.has(nodeId) });
    // If it's an aggregator and it's pending (has a deferred), we fall through to re-execute its logic within the IIFE.
    // If it's the first call to any node, we fall through.

    // 3. Mark as active and execute (or re-evaluate pending aggregator)
    const executionPromise = (async (): Promise<Output> => {

        //console.log('[EXECUTE_NODE_RECURSIVE_IIFE_START]', { nodeId, input });
        try {
            let output: Output;

            if (isAggregatorNode(node)) {

                dispatchEvent(
                    state.eventState,
                    createAggregatorNodeEvent(nodeId, 'start', node, { input }),
                    state.context
                );

                output = await executeAggregatorNode(nodeId, node, input, state);
            } else if (isPhaseNode(node)) {

                dispatchEvent(state.eventState, createPhaseNodeEvent(nodeId, 'start', node, { input }), state.context);

                output = await executePhase(nodeId, node, input, state);

                if (node.process) {
                    const [processedOutput, processedContext] = await node.process(output, state.context);
                    output = processedOutput;
                    state.context = processedContext;
                }

                //console.log('[EXECUTE_NODE_RECURSIVE_PHASE_NODE_EXECUTE_END]', { nodeId, output });
            } else {
                const error = new Error(`Unknown or invalid node type for ID "${nodeId}". Expected PhaseNode or AggregatorNode.`);

                //console.error('[EXECUTE_NODE_RECURSIVE_UNKNOWN_NODE_TYPE]', { nodeId, node, error });
                throw error;
            }

            state.phaseResults[nodeId] = output; // Set final output once ready/executed

            //console.log('[EXECUTE_NODE_RECURSIVE_PHASE_RESULT_CACHED]', { nodeId, output });

            // 4. Handle next step
            if (node.next) {

                //console.log('[EXECUTE_NODE_RECURSIVE_HANDLING_NEXT_STEP]', { nodeId, nextType: node.next.constructor.name, next: node.next });
                if (Array.isArray(node.next) && node.next.length > 0 && node.next.every(isDecision)) {

                    //console.log('[EXECUTE_NODE_RECURSIVE_DECISIONS_FOUND]', { nodeId, count: node.next.length, decisions: node.next });
                    const decisions = node.next as Decision<Output, Context>[];
                    const decisionExecutionPromises: Promise<void>[] = [];
                    for (const decision of decisions) {

                        dispatchEvent(state.eventState, createDecisionEvent(nodeId, 'start', decision, { output }), state.context);

                        const decisionPromise = (async () => {

                            //console.log('[EXECUTE_NODE_RECURSIVE_DECISION_EXECUTE_START]', { nodeId, decisionId: decision.id, output });
                            try {
                                const decisionOutcome = await decision.decide(output, state.context);
                                dispatchEvent(state.eventState, createDecisionEvent(nodeId, 'decide', decision, { output, result: decisionOutcome }), state.context);

                                //console.log('[EXECUTE_NODE_RECURSIVE_DECISION_OUTCOME]', { nodeId, decisionId: decision.id, decisionOutcome });
                                await handleNextStep(output, decision.id, decisionOutcome, state);
                                dispatchEvent(state.eventState, createDecisionEvent(nodeId, 'end', decision), state.context);
                            } catch (decisionError: any) {
                                // eslint-disable-next-line no-console
                                console.error(`[_HANDLE_NEXT_STEP_DECISION_ERROR] Error in decision ${decision.id} for node ${nodeId}:`, { decisionError, nodeId, decisionId: decision.id });
                                state.errors.push({ nodeId: decision.id, message: decisionError.message });
                            }
                        })();
                        decisionExecutionPromises.push(decisionPromise);
                    }

                    //console.log('[EXECUTE_NODE_RECURSIVE_WAITING_FOR_DECISIONS]', { nodeId, count: decisionExecutionPromises.length });
                    await Promise.all(decisionExecutionPromises);

                    //console.log('[EXECUTE_NODE_RECURSIVE_DECISIONS_COMPLETE]', { nodeId });
                } else {

                    //console.log('[EXECUTE_NODE_RECURSIVE_CALLING_HANDLE_NEXT_STEP_FOR_NON_DECISION]', { nodeId, next: node.next });
                    await handleNextStep(output, nodeId, node.next as Termination<Output, Context> | Connection<Output, Context>[] | Decision<Output, Context>[], state);
                }
            } else {

                //console.log('[EXECUTE_NODE_RECURSIVE_NO_NEXT_NODE_IMPLICIT_TERMINATION]', { nodeId, output });
                const result: Output = output;
                state.results[nodeId] = result;
            }

            if (isPhaseNode(node)) {
                dispatchEvent(state.eventState, createPhaseNodeEvent(nodeId, 'end', node, { input, output }), state.context);
            } else {
                dispatchEvent(state.eventState, createAggregatorNodeEvent(nodeId, 'end', node, { input, output }), state.context);
            }

            //console.log('[EXECUTE_NODE_RECURSIVE_IIFE_RETURNING_OUTPUT]', { nodeId, output });
            return output;
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error(`[EXECUTE_NODE_RECURSIVE_IIFE_ERROR] Error executing node ${nodeId}:`, { error, nodeId });
            state.errors.push({ nodeId, message: error.message });
            throw error;
        } finally {

            //console.log('[EXECUTE_NODE_RECURSIVE_IIFE_FINALLY]', { nodeId, hasAggregatorDeferred: state.aggregatorDeferreds.has(nodeId) });
            // If a node completed (not pending via deferred mechanism) or an error occurred.
            // An aggregator that is still pending (has a deferred) should keep its promise in activeExecutions.
            if (!state.aggregatorDeferreds.has(nodeId)) {

                //console.log('[EXECUTE_NODE_RECURSIVE_IIFE_FINALLY_DELETING_ACTIVE_EXECUTION]', { nodeId });
                state.activeExecutions.delete(nodeId);
            }
        }
    })();

    // Store the promise from the IIFE.
    // If it's an aggregator that went pending, executionPromise IS deferred.promise.
    // If it's an aggregator that became ready, executionPromise is a promise resolving to its output.
    // If it's a phase node, executionPromise is a promise resolving to its output.

    //console.log('[EXECUTE_NODE_RECURSIVE_SETTING_ACTIVE_EXECUTION]', { nodeId });
    state.activeExecutions.set(nodeId, executionPromise);

    //console.log('[EXECUTE_NODE_RECURSIVE_END_RETURNING_PROMISE]', { nodeId });
    return executionPromise;

}

