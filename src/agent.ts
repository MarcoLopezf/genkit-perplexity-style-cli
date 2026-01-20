import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { openAI } from "genkitx-openai";
import { tavily, TavilyClient } from "@tavily/core";
import dotenv from "dotenv";
import { searchWeb } from "./search.js";

dotenv.config();

// Model types
export type ModelProvider = "gemini" | "openai";

export interface ModelConfig {
    provider: ModelProvider;
    modelName: string;
    displayName: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    { provider: "gemini", modelName: "googleai/gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
    { provider: "gemini", modelName: "googleai/gemini-1.5-flash", displayName: "Gemini 1.5 Flash" },
    { provider: "openai", modelName: "openai/gpt-4o-mini", displayName: "GPT-4o Mini" },
    { provider: "openai", modelName: "openai/gpt-4o", displayName: "GPT-4o" },
];

// Validate environment variables
const tavilyApiKey = process.env.TAVILY_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!tavilyApiKey) {
    throw new Error("TAVILY_API_KEY environment variable is not set");
}

// Initialize Tavily client
const tavilyClient: TavilyClient = tavily({ apiKey: tavilyApiKey });

// Build plugins array based on available API keys
const plugins = [];
if (geminiApiKey) {
    plugins.push(googleAI({ apiKey: geminiApiKey }));
}
if (openaiApiKey) {
    plugins.push(openAI({ apiKey: openaiApiKey }));
}

if (plugins.length === 0) {
    throw new Error("At least one of GEMINI_API_KEY or OPENAI_API_KEY must be set");
}

// Initialize Genkit with available plugins
const ai = genkit({
    plugins,
});

// Define output schema for structured responses
const SourceSchema = z.object({
    title: z.string().describe("The title of the source"),
    url: z.string().describe("The URL of the source"),
});

const AnswerSchema = z.object({
    answer: z.string().describe("The complete answer in Markdown format"),
    sources: z.array(SourceSchema).describe("List of sources used in the answer"),
});

// Define input schema for the flow
const FlowInputSchema = z.object({
    question: z.string().describe("The user's question"),
    history: z.array(z.any()).optional().describe("Conversation history"),
    model: z.string().optional().describe("Model to use for generation"),
});

// Define the search tool
const searchTool = ai.defineTool(
    {
        name: "searchWeb",
        description: "Search the internet for information. Use this tool to find current and accurate information about any topic.",
        inputSchema: z.object({
            query: z.string().describe("The search query"),
        }),
        outputSchema: z.object({
            results: z.array(z.object({
                title: z.string(),
                url: z.string(),
                content: z.string(),
            })),
        }),
    },
    async (input) => {
        const searchResult = await searchWeb(tavilyClient, input.query, 5);
        const results = searchResult?.results?.map((result) => ({
            title: result.title,
            url: result.url,
            content: result.content,
        })) ?? [];
        return { results };
    }
);

// Custom error class for rate limiting
export class RateLimitError extends Error {
    retryAfterSeconds: number;

    constructor(message: string, retryAfterSeconds: number = 30) {
        super(message);
        this.name = "RateLimitError";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

// Define the research flow
export const researchFlow = ai.defineFlow(
    {
        name: "researchFlow",
        inputSchema: FlowInputSchema,
        outputSchema: AnswerSchema,
    },
    async (input) => {
        const modelToUse = input.model || "googleai/gemini-2.0-flash";

        const systemPrompt = `You are an advanced research assistant. 
IMPORTANT: You MUST ALWAYS use the searchWeb tool to answer ANY question, no matter how simple. 
Never answer from your own knowledge - always search first to provide accurate, up-to-date information.
Even for questions about dates, weather, or simple facts, you MUST use the searchWeb tool.

After searching, synthesize the information into a comprehensive answer following these steps:
1. Analyze the user's intent and identify key points needed
2. Use the search tool to find accurate, up-to-date information
3. Never invent data - if information is not available, state it clearly
4. Organize findings logically and coherently
5. Format your response in clear Markdown with headers and lists
6. Track all sources used for your answer`;

        try {
            const response = await ai.generate({
                model: modelToUse,
                system: systemPrompt,
                prompt: `Question: ${input.question}

Provide a comprehensive answer based on web search results. Your response MUST be a valid JSON object with this exact structure:
{
  "answer": "Your complete markdown-formatted answer here",
  "sources": [{"title": "Source Title", "url": "https://..."}, ...]
}`,
                tools: [searchTool],
                output: {
                    schema: AnswerSchema,
                },
                messages: input.history ?? [],
            });

            const output = response.output;

            if (!output) {
                return {
                    answer: response.text ?? "No se pudo generar una respuesta.",
                    sources: [],
                };
            }

            return output;
        } catch (error: unknown) {
            // Handle rate limit errors
            if (error instanceof Error) {
                const errorMessage = error.message || "";
                if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("rate") || errorMessage.includes("quota")) {
                    // Extract retry time if available
                    const retryMatch = errorMessage.match(/retry in (\d+(?:\.\d+)?)/i);
                    const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;

                    throw new RateLimitError(
                        `Rate limit exceeded. Please wait ${retrySeconds} seconds or try a different model.`,
                        retrySeconds
                    );
                }
            }
            throw error;
        }
    }
);

// Helper to get available models based on API keys
export function getAvailableModels(): ModelConfig[] {
    return AVAILABLE_MODELS.filter((model) => {
        if (model.provider === "gemini") return !!geminiApiKey;
        if (model.provider === "openai") return !!openaiApiKey;
        return false;
    });
}

// Export types for use in index.ts
export type FlowInput = z.infer<typeof FlowInputSchema>;
export type FlowOutput = z.infer<typeof AnswerSchema>;