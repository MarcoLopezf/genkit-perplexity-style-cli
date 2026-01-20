import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { openAI } from "genkitx-openai";
import { devLocalVectorstore } from "@genkit-ai/dev-local-vectorstore";
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
    { provider: "openai", modelName: "openai/gpt-4o-mini", displayName: "GPT-4o Mini" },
    { provider: "openai", modelName: "openai/gpt-4o", displayName: "GPT-4o" },
    { provider: "gemini", modelName: "googleai/gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
    { provider: "gemini", modelName: "googleai/gemini-1.5-flash", displayName: "Gemini 1.5 Flash" },
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
const plugins: any[] = [];
if (geminiApiKey) {
    plugins.push(googleAI({ apiKey: geminiApiKey }));
}
if (openaiApiKey) {
    plugins.push(openAI({ apiKey: openaiApiKey }));
}

// Add local vector store for codebase RAG (requires Gemini for embeddings)
if (geminiApiKey) {
    plugins.push(
        devLocalVectorstore([
            {
                indexName: "codebase",
                embedder: "googleai/text-embedding-004",
            },
        ])
    );
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

// Define the readCodebase tool for local RAG
ai.defineTool(
    {
        name: "readCodebase",
        description: "Search the local codebase to find information about this project's implementation, code structure, or specific functions. Use this tool when the user asks about how this project is built, specific files, or implementation details.",
        inputSchema: z.object({
            query: z.string().describe("The search query about the codebase"),
        }),
        outputSchema: z.object({
            snippets: z.array(z.object({
                filepath: z.string(),
                content: z.string(),
            })),
        }),
    },
    async (input) => {
        try {
            const results = await ai.retrieve({
                retriever: "devLocalVectorstore/codebase",
                query: input.query,
                options: { k: 5 },
            });

            const snippets = results.map((doc) => ({
                filepath: (doc.metadata?.filepath as string) || "unknown",
                content: doc.content.map((c) => ("text" in c ? c.text : "")).join("\n"),
            }));

            return { snippets };
        } catch (error) {
            // If vector store not indexed yet, return helpful message
            return {
                snippets: [{
                    filepath: "info",
                    content: "Codebase not indexed yet. Run 'npm run index' to index the codebase first.",
                }],
            };
        }
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
    })).optional().default([]),
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

// Custom error class for insufficient balance
export class InsufficientBalanceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InsufficientBalanceError";
    }
}

// Get default model based on available API keys
export function getDefaultModel(): string {
    if (openaiApiKey) return "openai/gpt-4o-mini";
    if (geminiApiKey) return "googleai/gemini-2.0-flash";
    throw new Error("No API keys configured");
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

            // Use provided model or get default
            const modelToUse = input.model || getDefaultModel();

            // Execute the prompt with input and options
            const result = await researchPrompt(
                {
                    question: input.question,
                },
                {
                    model: modelToUse,
                    messages: input.history ?? [],
                }
            );

            const output = result.output;

            if (!output) {
                return {
                    answer: result.text ?? "Could not generate a response.",
                    sources: [],
                };
            }

            return output;
        } catch (error: unknown) {
            // Handle API errors
            if (error instanceof Error) {
                const errorMessage = error.message || "";

                // Handle insufficient balance (402)
                if (errorMessage.includes("402") || errorMessage.includes("Insufficient Balance") || errorMessage.includes("insufficient_quota")) {
                    throw new InsufficientBalanceError(
                        "Insufficient balance in your API account. Please add credits or try a different model."
                    );
                }

                // Handle rate limit errors (429)
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

// Export the ai instance for use in evaluator
export { ai };

// Export types for use in index.ts
export type FlowInput = z.infer<typeof FlowInputSchema>;
export type FlowOutput = z.infer<typeof AnswerSchema>;