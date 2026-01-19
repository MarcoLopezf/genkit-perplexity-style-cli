import type { GenkitBeta } from "genkit/beta";
import type { TavilyClient } from "@tavily/core";
import z from "zod";
import { searchWeb } from "./search.js";

const createSearchTool = (ai: GenkitBeta, client: TavilyClient) => {
    return ai.defineTool(
        {
            name: "searchWeb",
            description: 'Use this tool to search for info in the internet',
            inputSchema: z.object({
                query: z.string().describe('The user query')
            }),
            outputSchema: z.object({
                results: z.array(z.string())
            }),
        },
        async (input) => {
            const searchResult = await searchWeb(
                client,
                input.query,
                5,
            )
            const formatedResults = searchResult?.results
                .map((result: { title: string; url: string; content: string }, index: number) => {
                    return `[${index + 1}] ${result.title} \nURL: ${result.url} \n CONTENT: ${result.content}`
                })
            return { results: formatedResults ?? [] };
        }
    )
}

export function createChatAgent(ai: GenkitBeta, client: TavilyClient) {
    const searchTool = createSearchTool(ai, client)

    const searchPrompt = ai.definePrompt({
        name: "search",
        input: {
            schema: z.object({
                query: z.string(),
            }),
        },
        system: `You are an advanced research assistant. 
IMPORTANT: You MUST ALWAYS use the searchWeb tool to answer ANY question, no matter how simple. 
Never answer from your own knowledge - always search first to provide accurate, up-to-date information.
Even for questions about dates, weather, or simple facts, you MUST use the searchWeb tool.`,
        tools: [searchTool],
        prompt: `
        User Query: {{query}}

        Act as an advanced research assistant in the style of Perplexity. Strictly follow this 6-step process to process the query:

        1. **Intent Analysis**: Identify key points and subtopics needed to answer accurately.
        2. **Information Search**: Use search tools to obtain truthful and up-to-date data in real-time.
        3. **Validation and Grounding**: Do not invent any data; if information is not available, state it clearly to avoid hallucinations.
        4. **Structured Synthesis**: Organize findings logically, hierarchically, and coherently.
        5. **Source Attribution**: Include a "Sources" section at the end, citing links and names of the sites consulted.
        6. **Markdown Format**: Generate the final response using clear markdown formatting with headers, lists, and emphasis where appropriate.

        Answer:`,
    });
    return ai.chat(searchPrompt);
}