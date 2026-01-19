import { TavilyClient } from "@tavily/core"

export const searchWeb = async (client: TavilyClient, query: string, numResults = 5) => {
    try {
        const response = await client.search(query,
            {
                searchDepth: 'basic',
                maxResults: numResults,
                includeAnswer: true,
                includeRawContent: false,
                includeImages: false
            }
        )

        return response;
    } catch (error) {
        console.error('[searchWeb] Error searching:', error);
        throw error;
    }
}