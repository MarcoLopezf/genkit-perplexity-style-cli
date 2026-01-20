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

// Initialize Genkit with available plugins and prompts directory
const ai = genkit({
    plugins,
    promptDir: "./prompts",
});

// Define the search tool (referenced by the .prompt file)
ai.defineTool(
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

// Define input schema for the flow
const FlowInputSchema = z.object({
    question: z.string().describe("The user's question"),
    history: z.array(z.any()).optional().describe("Conversation history"),
    model: z.string().optional().describe("Model to use for generation"),
});

// Output schema (matches the .prompt file output)
const AnswerSchema = z.object({
    answer: z.string(),
    sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
    })),
});

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
        try {
            // Load the prompt from prompts/research.prompt
            const researchPrompt = ai.prompt("research");

            // Execute the prompt with input and options
            const result = await researchPrompt(
                {
                    question: input.question,
                },
                {
                    model: input.model || "googleai/gemini-2.0-flash",
                    messages: input.history ?? [],
                }
            );

            const output = result.output;

            if (!output) {
                return {
                    answer: result.text ?? "No se pudo generar una respuesta.",
                    sources: [],
                };
            }

            return output;
        } catch (error: unknown) {
            // Handle rate limit errors
            if (error instanceof Error) {
                const errorMessage = error.message || "";
                if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("rate") || errorMessage.includes("quota")) {
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