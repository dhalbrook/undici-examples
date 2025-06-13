import { Agent, Dispatcher, Pool } from "undici";

function createSimpleDispatcher(): Dispatcher {
    return new Agent()
}

function createPooledDispatcher(): Dispatcher {
    return new Pool({
        connections: 5
    })
}

function createPooledDispatcheWithH2(): Dispatcher {
    return new Pool({
        connections: 5,
        allowH2: true
    })
}

export { createSimpleDispatcher, createPooledDispatcher, createPooledDispatcheWithH2 }