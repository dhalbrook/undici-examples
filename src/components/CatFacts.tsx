import { createDispatcher } from "@/dispatcher/UndiciExamples";

/**
 * This sample React Server component fetches a list of cat facts and displays it.
 * @constructor
 */
const dispatcher = createDispatcher();

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function CatFacts() {
    const page = getRandomInt(1, 10);
    const response = await fetch(`https://catfact.ninja/facts?page=${page}`, {
        dispatcher
    } as RequestInit);
    const { data } = await response.json();
    return (
        <div>
            <h1>Cat Facts!</h1>
            <ul style={{ listStyle: "none" }}>
                {data?.map(({ fact }:{ fact: string }) =>
                    <li style={{ paddingTop: '20px' }} key={fact}>
                        <b>Fact:</b> {fact}
                    </li>)
                }
            </ul>
        </div>
    )
}

export default CatFacts;
