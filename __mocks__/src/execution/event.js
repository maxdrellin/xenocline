// Manual mock for src/execution/event
import { jest } from '@jest/globals';

const dispatchEvent = jest.fn();

module.exports = {
    dispatchEvent
}; 