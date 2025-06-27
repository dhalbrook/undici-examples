## Fetching faster with Undici

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

## Making your [Node.js](http://Node.js) GraphQL calls more resilient

These days, making server-side GraphQL calls from a web application is a common practice.  The popularity of GraphQL as a language has increased, and its richness of expression in a single call has led it to be a natural fit for fetching entire domain object graphs in one go.  As long as you keep the query size and complexity under control, it can be a great solution for rendering your UI views.

When this is done in a [Node.](http://Node.JS)js application (either directly or via a Node-based framework like Next.js), the GraphQL client generally delegates its request to the native fetch client to execute.  In modern versions of [Node.js](http://Node.js) this native fetch client is called Undici (https://github.com/nodejs/undici).

**The problem with GraphQL calls**

By default, Undici assumes only GET and HEAD requests are idempotent (see https://undici.nodejs.org/\#/docs/api/Dispatcher?id=parameter-dispatchoptions). This makes sense for REST APIs.  In this context of Undici, idempotency refers to the ability to safely retry the request if it fails.  Having idempotent calls improves resilience overall, and especially so if you’re using pipelining, where multiple requests are sent over the same connection concurrently.

Often enough GraphQL requests, be they queries or mutations, are made using POST.  This is because GraphQL operation bodies are prone to being too large to safely serialize into the URL, especially if multiple fragments are included.  However, because they don’t actually mutate anything, semantically these queries are equivalent to a GET, and thus are safe to mark as idempotent.  In other words, even though they use POST, they won’t cause any side effects if they are retried.

**OK, that’s nice, but how do we make this happen?**

The first step is to implement your own custom Undici agent.  The [previous article](#fetching-faster-with-undici) has examples, and it can be just a few lines of code.

Once your GraphQL client is using a custom Agent, there is a simple approach to telling Undici that you’re executing a GraphQL query: use a marker header.  This header can be anything you want, but in the case of my examples, I’m using: “x-graphql-query” with a value of “true”.  You can provide a simple overload of “useQuery” for Apollo Client, or other strategies for including this header.  The important thing is that it’s only included for queries, not for mutations.

Here is a very simple example using the “graphql-request” library:

```typescript
const response = await graphQLClient.request(query, {},
 {
   // pass this through as a marker that this is a query and not a mutation
   "x-graphql-query": "true",
 },
);

```

When it gets to the Undici layer, you can pick it up and correlate it in the interceptor, like so:

```typescript
const graphqlQueryHeader = "x-graphql-query";

/**
* This is an example interceptor to mark graphql requests as idempotent.
*/
function graphQLQueryInterceptor(): Dispatcher.DispatcherComposeInterceptor {
 return (dispatch) => {
   return function InterceptedDispatch(options, handler) {
     const { headers } = options;
     // look for the marker header that indicates this is a GraphQL query
     if (
       headers &&
       graphqlQueryHeader in headers &&
       headers[graphqlQueryHeader] === "true"
     ) {
       //clean up the marker header
       delete headers[graphqlQueryHeader];
       // mark graphql queries as idempotent so they can be retried and pipelined
       options.idempotent = true;
     }
     return dispatch(options, handler);
   };
 };
}
```

The final step is to make sure your Undici dispatcher is using the interceptor, like so:

```typescript
import { Agent, Dispatcher, interceptors } from "undici";

function createGraphQLDispatcher(): Dispatcher {
 return new Agent()
   .compose([graphQLQueryInterceptor(), interceptors.retry()])
}
```

And there you have it!  From this point on, your GraphQL requests will be able to be pipelined, as well as automatically be retried in the case of network errors.

Happy coding!