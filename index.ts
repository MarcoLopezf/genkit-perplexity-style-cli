//cargar variables de entorno de tavily y gemini
import { googleAI } from "@genkit-ai/google-genai";
import { tavily } from "@tavily/core";
import chalk from "chalk";
import dotenv from "dotenv";
import { genkit } from "genkit/beta";
import ora from "ora";
import readline from "readline";
import { createChatAgent } from "./src/agent.js";

dotenv.config();


try {
    const tavilyApiKey = process.env.TAVILY_API_KEY;

    if (!tavilyApiKey) {
        throw new Error("No se encontró la variable de entorno TAVILY_API_KEY");
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        throw new Error("No se encontró la variable de entorno GEMINI_API_KEY");
    }

    const client = tavily({ apiKey: tavilyApiKey })

    const ai = genkit({
        plugins: [googleAI({ apiKey: geminiApiKey })],
        model: 'googleai/gemini-2.5-flash'

    })

    const chat = createChatAgent(ai, client);


    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.green("Pregunta lo que quieras saber : "),
        terminal: true
    })

    // Welcome Banner
    console.log(chalk.cyan.bold("\n╔════════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║         🔍 PERPLEXITY CLI                  ║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════════╝\n"));

    // Instructions
    console.log(chalk.dim("  💬 Type your question and get AI-powered answers with internet resources"));
    console.log(chalk.dim("  📜 Chat history is maintained during this session"));
    console.log(chalk.dim("  🚪 Commands: type 'exit' to quit or press ⌘+C to quit\n"));

    // Start the prompt
    rl.prompt();

    // Line event listener
    rl.on('line', async (line) => {
        const input = line.trim();

        // Handle exit command
        if (input.toLowerCase() === 'exit') {
            console.log(chalk.yellow("\n👋 ¡Hasta luego! Gracias por usar Perplexity CLI.\n"));
            rl.close();
            process.exit(0);
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
            text: chalk.blue(`Buscando información sobre: "${input}"...`),
            spinner: 'dots'
        }).start();

        try {
            const { text } = await chat.send(input);

            spinner.succeed(chalk.green('¡Respuesta lista!'));

            // Show AI response
            console.log(chalk.white(`\n${text}\n`));

        } catch (error) {
            spinner.fail(chalk.red('Error al procesar la pregunta'));
            console.error(error);
        }

        // Resume readline and show prompt again
        rl.resume();
        rl.prompt();
    });

    // Handle close event
    rl.on('close', () => {
        console.log(chalk.yellow("\n👋 ¡Hasta luego!\n"));
        process.exit(0);
    });

} catch (error: any) {
    console.error(chalk.red("Error al cargar las variables de entorno"), error.message)
    if (error.message.includes("TAVILY_API_KEY")) {
        console.error(chalk.yellow("TAVILY_API_KEY no está configurada."));
    }
    if (error.message.includes("GEMINI_API_KEY")) {
        console.error(chalk.yellow("GEMINI_API_KEY no está configurada."));
    }

}