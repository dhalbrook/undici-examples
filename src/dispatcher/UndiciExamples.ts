import { Agent, Dispatcher, Pool, interceptors } from "undici";
import { setInterval } from "node:timers";

/**
 * Let's start by creating a simple Undici Agent to handle fetch requests
 * with a ten-second connect timeout
 *
 * @see https://github.com/nodejs/undici/blob/main/docs/docs/api/Agent.md
 */
function createSimpleDispatcher(): Dispatcher {
    return new Agent({
        // time out after 10 seconds
        connectTimeout: 10000
    })
}

/**
 * Let's add connection pooling and limit the pool to 5 connections
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/Pool.md
 */
function createPooledDispatcher(): Dispatcher {
    return new Agent({
        // time out after 10 seconds
        connectTimeout: 10000,
        factory(origin: string | URL, opts: Agent.Options): Dispatcher {
            return new Pool(origin, {
                ...opts,
                // use up to 5 connections in the pool
                connections: 5
            })
        }
    });
}

/**
 * Let's add h2 support and cycle the clients every minute to avoid GOAWAY frames
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md
 */
function createPooledDispatcherWithH2(): Dispatcher {
    return new Agent({
        connectTimeout: 10000,
        factory(origin: string | URL, opts: Agent.Options): Dispatcher {
            return new Pool(origin, {
                ...opts,
                // use up to 5 connections in the pool
                connections: 5,
                // allow for H2 connections if the origin supports it
                allowH2: true,
                // gracefully close down the client after 1 minute
                clientTtl: 60 * 1000
            })
        }
    });
}

/**
 * Let's add retry, caching, and dns caching
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/Dispatcher.md#pre-built-interceptors
 */
function createPooledDispatcherWithH2AndRetryAndDnsCaching(): Dispatcher {
    return new Agent({
        connectTimeout: 10000,
        factory(origin: string | URL, opts: Agent.Options): Dispatcher {
            return new Pool(origin, {
                ...opts,
                // use up to 5 connections in the pool
                connections: 5,
                // allow for H2 connections if the origin supports it
                allowH2: true,
                // gracefully close down the client after 10 minutes
                clientTtl: 10 * 60 * 1000
            })
        }
    }).compose(
        // add dns caching
        interceptors.dns({
            affinity: 4
        }),
        // add retry capability
        interceptors.retry({
            maxRetries: 3,
        }),
        // cache responses
        interceptors.cache({})
    );
}

/**
 * Finally, let's log out the connection pool stats every ten seconds
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/PoolStats.md
 */
function createPooledDispatcherWithH2AndRetryAndDnsCachingAndStats(): Dispatcher {
    return new Agent({
        connectTimeout: 10000,
        factory(origin: string | URL, opts: Agent.Options): Dispatcher {
            const pool = new Pool(origin, {
                ...opts,
                // use up to 5 connections in the pool
                connections: 5,
                // allow for H2 connections if the origin supports it
                allowH2: true,
                // gracefully close down the client after 10 minutes
                clientTtl: 10 * 60 * 1000
            });
            setInterval(() => {
                // connect me to your telemetry system!
                console.log(pool.stats)
            }, 10000)
            return pool
        }
    }).compose(
        // add dns caching
        interceptors.dns({
            affinity: 4
        }),
        // add retry capability
        interceptors.retry({
            maxRetries: 3,
        }),
        // cache responses
        interceptors.cache({})
    );
}

// To test the different options, move the "as" statement to the desired function
export {
    createSimpleDispatcher as createDispatcher,
    createPooledDispatcher,
    createPooledDispatcherWithH2,
    createPooledDispatcherWithH2AndRetryAndDnsCaching,
    createPooledDispatcherWithH2AndRetryAndDnsCachingAndStats
}