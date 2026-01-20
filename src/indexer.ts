import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { devLocalVectorstore } from "@genkit-ai/dev-local-vectorstore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error(chalk.red("❌ GEMINI_API_KEY is required for embeddings"));
    process.exit(1);
}

// Initialize Genkit with Google AI and local vector store
const ai = genkit({
    plugins: [
        googleAI({ apiKey: geminiApiKey }),
        devLocalVectorstore([
            {
                indexName: "codebase",
                embedder: "googleai/text-embedding-004",
            },
        ]),
    ],
});

interface CodeDocument {
    filepath: string;
    content: string;
    filename: string;
    extension: string;
}

async function loadCodeFiles(): Promise<CodeDocument[]> {
    const patterns = [
        "src/**/*.ts",
        "index.ts",
        "prompts/**/*.prompt",
    ];

    const documents: CodeDocument[] = [];

    for (const pattern of patterns) {
        const files = await glob(pattern, { cwd: process.cwd() });

        for (const file of files) {
            const filepath = path.join(process.cwd(), file);
            const content = fs.readFileSync(filepath, "utf-8");
            const filename = path.basename(file);
            const extension = path.extname(file);

            documents.push({
                filepath: file,
                content,
                filename,
                extension,
            });
        }
    }

    return documents;
}

function chunkCode(doc: CodeDocument, maxChunkSize: number = 1500): Array<{ text: string; metadata: Record<string, string> }> {
    const chunks: Array<{ text: string; metadata: Record<string, string> }> = [];
    const lines = doc.content.split("\n");

    let currentChunk = "";
    let chunkIndex = 0;

    for (const line of lines) {
        if ((currentChunk + line + "\n").length > maxChunkSize && currentChunk.length > 0) {
            chunks.push({
                text: `File: ${doc.filepath}\n\n${currentChunk}`,
                metadata: {
                    filepath: doc.filepath,
                    filename: doc.filename,
                    extension: doc.extension,
                    chunkIndex: String(chunkIndex),
                },
            });
            currentChunk = "";
            chunkIndex++;
        }
        currentChunk += line + "\n";
    }

    // Push remaining content
    if (currentChunk.trim().length > 0) {
        chunks.push({
            text: `File: ${doc.filepath}\n\n${currentChunk}`,
            metadata: {
                filepath: doc.filepath,
                filename: doc.filename,
                extension: doc.extension,
                chunkIndex: String(chunkIndex),
            },
        });
    }

    return chunks;
}

async function main() {
    console.log(chalk.cyan.bold("\n╔════════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║       📚 CODEBASE INDEXER                  ║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════════╝\n"));

    console.log(chalk.blue("🔍 Loading code files..."));
    const documents = await loadCodeFiles();
    console.log(chalk.green(`✅ Found ${documents.length} files`));

    // Chunk all documents
    console.log(chalk.blue("📄 Chunking documents..."));
    const allChunks: Array<{ text: string; metadata: Record<string, string> }> = [];

    for (const doc of documents) {
        const chunks = chunkCode(doc);
        allChunks.push(...chunks);
        console.log(chalk.dim(`   ${doc.filepath} → ${chunks.length} chunks`));
    }

    console.log(chalk.green(`✅ Created ${allChunks.length} total chunks`));

    // Index the documents
    console.log(chalk.blue("\n🚀 Indexing documents..."));

    await ai.index({
        indexer: "devLocalVectorstore/codebase",
        documents: allChunks.map(chunk => ({
            content: [{ text: chunk.text }],
            metadata: chunk.metadata,
        })),
    });

    console.log(chalk.green.bold("\n✅ Indexing complete!"));
    console.log(chalk.dim("   Vector store saved to .genkit/"));
    console.log(chalk.dim("   Run 'npm start' to use the agent with codebase knowledge\n"));
}

main().catch((error) => {
    console.error(chalk.red("❌ Error:"), error.message);
    process.exit(1);
});
