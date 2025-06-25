import { Agent, Dispatcher, interceptors } from "undici";

const graphqlQueryHeader = "x-graphql-query";

export { graphqlQueryHeader };
//import * as diagnostics_channel from "node:diagnostics_channel";

// Uncomment this to subscribe to the 'undici:request:create' channel
/** diagnostics_channel.channel("undici:request:create").subscribe((message) => {
  console.log("Undici Request Created:", message);
});*/

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

function createGraphQLDispatcher(): Dispatcher {
  return new Agent({
    // pipeline up to 10 requests at a time
    pipelining: 10,
    // enable HTTP/2 support
    allowH2: true,
  })
    .compose([graphQLQueryInterceptor(), interceptors.retry()])
    .on("connect", (socket) => {
      console.log("Connected to", socket.origin);
    });
}

// To test the different options, move the "as" statement to the desired function
export { createGraphQLDispatcher };
