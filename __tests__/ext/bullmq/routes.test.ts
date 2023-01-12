import { Worker } from "bullmq";
import BullMQRouter from "../../../src/ext/bullmq/routes";

jest.mock("bullmq", () => {
    return {
        Worker: jest.fn().mockImplementation(() => {
            return {
                on: jest.fn()
            };
        })
    };
});

class Handler {
    async handle() {
        return true;
    }
}

describe('BullMQRouter', () => {
    it('should return a router object', () => {
        expect(BullMQRouter).toBeDefined();
    });
    
    it('should throw an error when queue name is not provided', () => {
        expect(() => new BullMQRouter('', Handler)).toThrowError('Queue name must be provided');
    });

    it('should return a router object', () => {
        const router = new BullMQRouter('test', Handler);
        expect(router).toBeDefined();
    });
});
