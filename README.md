**Fetching faster with Undici**

Way back in 2022, in the before times, Node.js had no native fetch support. It was added in the Node 18 release, and the library underpinning this was called "Undici" (latin for eleven). In the past three years, Node.js has continued to develop and improve, and behind the scenes so has Undici.

Anyone who has written a non-trivial project using fetch on the server, be it in middleware or underpinning isomorphic API calls on the UI layer, knows that often enough data fetching becomes a performance bottleneck. Most often we simply call "fetch" and hope for the best, because it's not readily apparent that other options are available.

The fetch spec, as implemented by Node.js, uses a globally scoped dispatcher backed by Undici, and this dispatcher underpins all fetch calls. It works well and works as expected, which is a testament to sensible defaults. But the Node.js fetch implementation also allows for a custom dispatcher to be passed to a fetch call, like this:
```typescript
const dispatcher = ???

const response = await fetch(`https://catfact.ninja/fact`, {
    dispatcher
} as RequestInit);
````
The dispatcher you provide here can be as powerful as you need it to be, and Undici has plenty of options to tune it to your needs. Alternatively, you can override the global dispatcher if you want to customize the way every fetch call in your app works by doing the following:

```typescript
setGlobalDispatcher(dispatcher);
```

**Pooling**

Were you aware that Undici can pool your fetch connections?  Doing so allows you to gate the total number of connections to your origin host and minimize the overhead of TLS negotiation.  Here’s an example of creating a pooled dispatcher with up to five connections:

```typescript
/**
 * Let's add connection pooling and limit the pool to 5 connections
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/Pool.md
 */
function createDispatcher(): Dispatcher {
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
```    

The example demonstrates just a small subset of the options available to configure the pool.

**HTTP/2**

Does your API host support HTTP/2?  If so, you may be leaving a lot of performance on the table by not enabling this flag.  Undici supports HTTP/2 by enabling the “allowH2” flag.  Here is the previous example with this enabled.  Another new feature called “clientTtl” can gracefully shut down pool members after a specified time.  This makes it easy to minimize HTTP/2 GOAWAY responses:
```typescript
/**
 * Let's add h2 support and cycle the clients every minute to avoid GOAWAY frames
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md
 */
function createDispatcher(): Dispatcher {
    return new Agent({
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
```    

**DNS Caching and Retry**

Undici also has built-in interceptors that can be chained.  The “dns” interceptor caches DNS lookups, while the “retry” interceptor can retry network errors.  The “cache” interceptor caches responses.

```typescript
/**
 * Let's add retry, caching, and dns caching
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/Dispatcher.md#pre-built-interceptors
 */
import { interceptors } from "undici";

function createDispatcher(): Dispatcher {
    return new Agent({
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
```

**Stats**

Finally, Undici can share stats on connection pools at runtime, like so:

```typescript
PoolStats {
    connected: 3,
        free: 2,
        pending: 0,
        queued: 0,
        running: 1,
        size: 1
}

```

Here is an example of printing out the stats every ten seconds.  This allows you to monitor the state of your connection pool in an APM or simply in the logs:

```typescript
/**
 * Finally, let's log out the connection pool stats every ten seconds
 *
 * See https://github.com/nodejs/undici/blob/main/docs/docs/api/PoolStats.md
 */

return new Agent({
   factory(origin: string | URL, opts: Agent.Options): Dispatcher {
        const pool = new Pool(origin, {});
        setInterval(() => {
            // connect me to your telemetry system!
            console.log(pool.stats)
        }, 10000)
        return pool
    }
})
```

**Wrap-up**

I hope this gives you some ideas of the possibilities of tuning Undici so that you and your user base can fetch faster.