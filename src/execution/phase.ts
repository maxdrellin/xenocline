import { createPhaseEvent } from '../event/phase';
import { Input } from '../input';
import { PhaseNode } from '../node/phasenode';
import { Output } from '../output';
import { dispatchEvent } from './event';
import { ExecutionState } from './process';

export async function executePhase(nodeId: string, node: PhaseNode, input: Input, state: ExecutionState): Promise<Output> {
    dispatchEvent(state.eventState, createPhaseEvent(nodeId, 'start', node.phase, { input }), state.context);

    if (node.phase.verify) {
        const verifyResponse = await node.phase.verify(input);
        if (!verifyResponse.verified) {
            throw new Error(verifyResponse.messages.join('\n'));
        }
    }

    const output: Output = await node.phase.execute(input);

    dispatchEvent(state.eventState, createPhaseEvent(nodeId, 'execute', node.phase, { input, output }), state.context);
    return output;
}