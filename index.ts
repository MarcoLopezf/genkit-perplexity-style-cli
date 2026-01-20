import chalk from "chalk";
import ora from "ora";
import readline from "readline";
import {
    researchFlow,
    getAvailableModels,
    RateLimitError,
    type FlowOutput,
    type ModelConfig
} from "./src/agent.js";

// Type for conversation history
interface HistoryMessage {
    role: "user" | "model";
    content: Array<{ text: string }>;
}

// Local history management
const conversationHistory: HistoryMessage[] = [];
let selectedModel: ModelConfig;

function addToHistory(role: "user" | "model", text: string) {
    conversationHistory.push({
        role,
        content: [{ text }],
    });
}

function formatSources(sources: FlowOutput["sources"]): string {
    if (!sources || sources.length === 0) {
        return "";
    }

    const sourceLines = sources.map((source, index) =>
        `  ${index + 1}. [${source.title}](${source.url})`
    );

    return `\n${chalk.cyan.bold("📚 Fuentes:")}\n${sourceLines.join("\n")}`;
}

async function selectModel(rl: readline.Interface): Promise<ModelConfig> {
    const availableModels = getAvailableModels();

    if (availableModels.length === 0) {
        console.error(chalk.red("❌ No hay modelos disponibles. Configura GEMINI_API_KEY o OPENAI_API_KEY."));
        process.exit(1);
    }

    if (availableModels.length === 1) {
        console.log(chalk.yellow(`\n📌 Usando modelo: ${availableModels[0].displayName}\n`));
        return availableModels[0];
    }

    console.log(chalk.cyan.bold("\n🤖 Selecciona el modelo a usar:\n"));
    availableModels.forEach((model, index) => {
        console.log(chalk.white(`  ${index + 1}. ${model.displayName}`));
    });
    console.log("");

    return new Promise((resolve) => {
        const askForModel = () => {
            rl.question(chalk.green("Elige un número: "), (answer) => {
                const selection = parseInt(answer.trim(), 10);
                if (selection >= 1 && selection <= availableModels.length) {
                    const chosen = availableModels[selection - 1];
                    console.log(chalk.yellow(`\n✅ Modelo seleccionado: ${chosen.displayName}\n`));
                    resolve(chosen);
                } else {
                    console.log(chalk.red("Opción inválida. Intenta de nuevo."));
                    askForModel();
                }
            });
        };
        askForModel();
    });
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });

    // Welcome Banner
    console.log(chalk.cyan.bold("\n╔════════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║         🔍 PERPLEXITY CLI                  ║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════════╝"));

    // Select model
    selectedModel = await selectModel(rl);

    // Instructions
    console.log(chalk.dim("  💬 Type your question and get AI-powered answers with internet resources"));
    console.log(chalk.dim("  📜 Chat history is maintained during this session"));
    console.log(chalk.dim("  🔄 Type 'model' to change the AI model"));
    console.log(chalk.dim("  🚪 Type 'exit' to quit or press ⌘+C\n"));

    // Set prompt
    rl.setPrompt(chalk.green("Pregunta lo que quieras saber : "));
    rl.prompt();

    // Line event listener
    rl.on("line", async (line) => {
        const input = line.trim();

        // Handle exit command
        if (input.toLowerCase() === "exit") {
            console.log(chalk.yellow("\n👋 ¡Hasta luego! Gracias por usar Perplexity CLI.\n"));
            rl.close();
            process.exit(0);
        }

        // Handle model change command
        if (input.toLowerCase() === "model") {
            selectedModel = await selectModel(rl);
            rl.prompt();
            return;
        }

        // Skip empty input
        if (!input) {
            rl.prompt();
            return;
        }

        // Pause readline while processing
        rl.pause();

        // Start spinner
        const spinner = ora({
            text: chalk.blue(`Buscando información con ${selectedModel.displayName}...`),
            spinner: "dots",
        }).start();

        try {
            // Add user message to history
            addToHistory("user", input);

            // Execute the research flow with structured output
            const response = await researchFlow({
                question: input,
                history: conversationHistory.slice(0, -1),
                model: selectedModel.modelName,
            });

            spinner.succeed(chalk.green("¡Respuesta lista!"));

            // Display the structured response
            console.log(chalk.white(`\n${response.answer}`));

            // Display sources
            const sourcesText = formatSources(response.sources);
            if (sourcesText) {
                console.log(sourcesText);
            }
            console.log("");

            // Add model response to history
            addToHistory("model", response.answer);

        } catch (error) {
            if (error instanceof RateLimitError) {
                spinner.fail(chalk.red("⚠️ Límite de uso excedido"));
                console.log(chalk.yellow(`\n${error.message}`));
                console.log(chalk.dim(`💡 Tip: Escribe 'model' para cambiar a otro modelo.\n`));
            } else {
                spinner.fail(chalk.red("Error al procesar la pregunta"));
                console.error(error);
            }
        }

        // Resume readline and show prompt again
        rl.resume();
        rl.prompt();
    });

    // Handle close event
    rl.on("close", () => {
        console.log(chalk.yellow("\n👋 ¡Hasta luego!\n"));
        process.exit(0);
    });
}

// Run the main function
main().catch((error) => {
    console.error(chalk.red("Error fatal:"), error.message);
    process.exit(1);
});