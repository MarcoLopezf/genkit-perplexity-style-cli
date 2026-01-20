import { z } from "genkit";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import { researchFlow, getAvailableModels, getDefaultModel, ai, InsufficientBalanceError, RateLimitError, type ModelConfig } from "./agent.js";

// Test case type
interface TestCase {
    id: string;
    question: string;
    expected_facts: string[];
}

// Judge output type
interface JudgeResult {
    score: number;
    reasoning: string;
}

// Evaluation result type
interface EvaluationResult {
    id: string;
    question: string;
    answerPreview: string;
    score: number;
    reasoning: string;
    success: boolean;
    error?: string;
}

// Define the judge flow using the shared ai instance
const JudgeOutputSchema = z.object({
    score: z.number(),
    reasoning: z.string(),
});

const judgeFlow = ai.defineFlow(
    {
        name: "judgeFlow",
        inputSchema: z.object({
            question: z.string(),
            answer: z.string(),
            expected_facts: z.array(z.string()),
            model: z.string().optional(),
        }),
        outputSchema: JudgeOutputSchema,
    },
    async (input) => {
        const judgePrompt = ai.prompt("judge");
        const modelToUse = input.model || getDefaultModel();

        const result = await judgePrompt(
            {
                question: input.question,
                answer: input.answer,
                expected_facts: input.expected_facts,
            },
            {
                model: modelToUse,
            }
        );

        const output = result.output as JudgeResult | undefined;

        if (!output) {
            return {
                score: 0,
                reasoning: "Failed to get judge response",
            };
        }

        return output;
    }
);

// Load test cases
function loadTestCases(): TestCase[] {
    const testSetPath = path.join(process.cwd(), "data", "test_set.json");
    const content = fs.readFileSync(testSetPath, "utf-8");
    return JSON.parse(content) as TestCase[];
}

// Truncate text for display
function truncate(text: string, maxLength: number = 150): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
}

// Interactive model selection
async function selectModel(): Promise<ModelConfig> {
    const models = getAvailableModels();

    if (models.length === 0) {
        console.error(chalk.red("❌ No hay modelos disponibles. Configura al menos una API key."));
        process.exit(1);
    }

    if (models.length === 1) {
        console.log(chalk.yellow(`\n📌 Using model: ${models[0].displayName}\n`));
        return models[0];
    }

    console.log(chalk.cyan.bold("\n🤖 Select the model for evaluation:\n"));
    models.forEach((model, index) => {
        console.log(chalk.white(`  ${index + 1}. ${model.displayName}`));
    });
    console.log("");

    // Use readline for selection
    const readline = await import("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        const askForModel = () => {
            rl.question(chalk.green("Choose a number: "), (answer) => {
                const selection = parseInt(answer.trim(), 10);
                if (selection >= 1 && selection <= models.length) {
                    const chosen = models[selection - 1];
                    console.log(chalk.yellow(`\n✅ Model selected: ${chosen.displayName}\n`));
                    rl.close();
                    resolve(chosen);
                } else {
                    console.log(chalk.red("Invalid option. Try again."));
                    askForModel();
                }
            });
        };
        askForModel();
    });
}

// Main evaluation function
async function runEvaluations() {
    console.log(chalk.cyan.bold("\n╔════════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║       🧪 GENKIT AGENT EVALUATOR            ║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════════╝"));

    // Select model interactively
    const selectedModel = await selectModel();

    // Load test cases
    const testCases = loadTestCases();
    console.log(chalk.dim(`📋 Loaded ${testCases.length} test cases\n`));

    const results: EvaluationResult[] = [];

    // Run each test case
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(chalk.cyan(`\n${"═".repeat(60)}`));
        console.log(chalk.cyan.bold(`TEST ${i + 1}/${testCases.length}: ${testCase.id}`));
        console.log(chalk.cyan(`${"═".repeat(60)}`));
        console.log(chalk.white(`\n📝 Pregunta: ${testCase.question}\n`));

        const spinner = ora({
            text: chalk.blue("Ejecutando agente..."),
            spinner: "dots",
        }).start();

        try {
            // Step 1: Run the research agent
            spinner.text = chalk.blue(`Ejecutando researchFlow con ${selectedModel.displayName}...`);
            const agentResponse = await researchFlow({
                question: testCase.question,
                model: selectedModel.modelName,
            });

            spinner.text = chalk.blue("Evaluating response with the judge...");

            // Step 2: Judge the response
            const judgeResult = await judgeFlow({
                question: testCase.question,
                answer: agentResponse.answer,
                expected_facts: testCase.expected_facts,
                model: selectedModel.modelName,
            });

            spinner.succeed(chalk.green("Evaluation completed"));

            // Display results
            console.log(chalk.white(`\n📄 Response (preview): ${truncate(agentResponse.answer)}`));

            // Score with color based on value
            const scoreColor = judgeResult.score >= 7 ? chalk.green : judgeResult.score >= 5 ? chalk.yellow : chalk.red;
            console.log(scoreColor(`\n⭐ Score: ${judgeResult.score}/10`));

            console.log(chalk.dim(`\n💭 Razonamiento del juez:`));
            console.log(chalk.white(`   ${judgeResult.reasoning}\n`));

            results.push({
                id: testCase.id,
                question: testCase.question,
                answerPreview: truncate(agentResponse.answer),
                score: judgeResult.score,
                reasoning: judgeResult.reasoning,
                success: true,
            });

        } catch (error) {
            spinner.fail(chalk.red("Error in evaluation"));
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`   ${errorMessage}`));

            results.push({
                id: testCase.id,
                question: testCase.question,
                answerPreview: "N/A",
                score: 0,
                reasoning: `Error: ${errorMessage}`,
                success: false,
                error: errorMessage,
            });
        }

        // Small delay between tests to avoid rate limits
        if (i < testCases.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Final summary
    console.log(chalk.cyan(`\n${"═".repeat(60)}`));
    console.log(chalk.cyan.bold("📊 EVALUATION SUMMARY"));
    console.log(chalk.cyan(`${"═".repeat(60)}\n`));

    const successfulResults = results.filter(r => r.success);
    const totalScore = successfulResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore = successfulResults.length > 0 ? totalScore / successfulResults.length : 0;

    // Results table
    console.log(chalk.white("┌────────────────────┬───────┬─────────┐"));
    console.log(chalk.white("│ Test ID            │ Score │ Status  │"));
    console.log(chalk.white("├────────────────────┼───────┼─────────┤"));

    for (const result of results) {
        const id = result.id.padEnd(18);
        const score = result.score.toFixed(1).padStart(5);
        const status = result.success ? chalk.green("✓ OK") : chalk.red("✗ ERR");
        console.log(chalk.white(`│ ${id} │ ${score} │ ${status}   │`));
    }

    console.log(chalk.white("└────────────────────┴───────┴─────────┘"));

    // Average score with color
    const avgColor = averageScore >= 7 ? chalk.green : averageScore >= 5 ? chalk.yellow : chalk.red;
    console.log(avgColor.bold(`\n🎯 TOTAL AVERAGE: ${averageScore.toFixed(2)}/10`));

    const passRate = (successfulResults.filter(r => r.score >= 6).length / results.length * 100).toFixed(0);
    console.log(chalk.dim(`   Pass rate (score ≥ 6): ${passRate}%`));
    console.log(chalk.dim(`   Successful tests: ${successfulResults.length}/${results.length}`));
    console.log(chalk.dim(`   Model used: ${selectedModel.displayName}\n`));
}

// Run the evaluator
runEvaluations().catch((error) => {
    console.error(chalk.red("\n❌ Error fatal:"), error.message);
    process.exit(1);
});
