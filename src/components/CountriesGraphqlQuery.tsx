import {
  createGraphQLDispatcher,
  graphqlQueryHeader,
} from "@/dispatcher/UndiciGraphqlExamples";
import { gql, GraphQLClient } from "graphql-request";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { RequestConfig } from "graphql-request/build/legacy/helpers/types";

/**
 * This sample React Server component makes a graphql query and displays it.
 * @constructor
 */

/**
 * This is a simple graphql client that uses the undici dispatcher.
 */
const graphQLClient = new GraphQLClient("https://countries.trevorblades.com", {
  dispatcher: createGraphQLDispatcher(),
} as RequestConfig);

interface CountriesResponse {
  countries: Country[];
}

interface Country {
  code: string;
  name: string;
  emoji: string;
}

async function CountriesGraphqlQuery() {
  const query = gql`
    {
      countries {
        code
        name
        emoji
      }
    }
  `;

  const response = await graphQLClient.request<CountriesResponse>(
    query,
    {},
    {
      // pass this through as a marker that this is a query and not a mutation
      [graphqlQueryHeader]: "true",
    },
  );

  return (
    <div>
      <h1 style={{ paddingBottom: "20px" }}>Countries!</h1>
      <ul style={{ listStyle: "none" }}>
        {response.countries.map(({ code, name, emoji }) => (
          <li key={code}>
            <b>
              {emoji} {name} ({code})
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CountriesGraphqlQuery;
