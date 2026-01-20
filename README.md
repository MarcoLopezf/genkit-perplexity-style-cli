# 🔍 genkit-perplexitystyle-cli

> A web search AI agent for the terminal, Perplexity-style, built with Google Genkit and Tavily.

**genkit-perplexitystyle-cli** is a CLI that combines the power of language models (Gemini/ChatGPT) with real-time web search using Tavily. Ask questions in natural language and get grounded answers with real internet sources.

## ✨ Features

- 🌐 **Real-time web search** - Uses Tavily to get up-to-date information from the internet
- 🤖 **Multi-model support** - Choose between Gemini (Google) or GPT (OpenAI)
- 🛠️ **Tool Calling** - The agent decides when to search using the tools pattern
- 📝 **Structured Output** - JSON structured responses with Zod schemas
- 📄 **Dotprompt** - Separation of Prompt Engineering from code
- 💬 **Conversation history** - Maintains context during the session
- ⚠️ **Rate limit handling** - User-friendly messages and hot model switching
- 🧪 **Built-in Evaluator** - TDD-style testing with custom judge
- 🎨 **Friendly interface** - Spinners, colors and visual feedback

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Perplexity CLI                         │
├─────────────────────────────────────────────────────────┤
│  index.ts          → Terminal UI + model selection      │
├─────────────────────────────────────────────────────────┤
│  prompts/          → Prompt Engineering (Dotprompt)     │
│   ├── research.prompt  (main agent)                     │
│   └── judge.prompt     (evaluator)                      │
├─────────────────────────────────────────────────────────┤
│  src/agent.ts      → Flow + Tools + Structured Output   │
│  src/search.ts     → Tavily search wrapper              │
│  src/evaluator.ts  → Agent testing system               │
├─────────────────────────────────────────────────────────┤
│       Genkit              Gemini / OpenAI               │
│   (Orchestration)        (LLM Providers)                │
└─────────────────────────────────────────────────────────┘
```

### How it works

1. **User selects a model** (Gemini or ChatGPT)
2. **Asks a question** in natural language
3. **Agent executes the Flow** loading the prompt from `.prompt`
4. **The `searchWeb` tool** queries Tavily
5. **Model synthesizes** results into a structured JSON
6. **Response and sources** are displayed separately

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- [Tavily](https://tavily.com/) API Key
- [Google AI Studio](https://aistudio.google.com/apikey) and/or [OpenAI](https://platform.openai.com/api-keys) API Key

### Steps

```bash
# Clone the repository
git clone git@github.com:MarcoLopezf/genkit-perplexity-style-cli.git
cd genkit-perplexity-style-cli

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit `.env` with your API keys:

```env
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxx  # Optional
```

## 📖 Usage

```bash
# Run the CLI
npx tsx index.ts

# Or with the development script (includes Genkit UI)
npm run dev
```

### Example usage

```
╔════════════════════════════════════════════╗
║         🔍 PERPLEXITY CLI                  ║
╚════════════════════════════════════════════╝

🤖 Select the model to use:

  1. GPT-4o Mini
  2. GPT-4o
  3. Gemini 2.0 Flash
  4. Gemini 1.5 Flash

Choose a number: 1

✅ Model selected: GPT-4o Mini

Ask anything: What are the latest AI news?

⠋ Searching with GPT-4o Mini...
✔ Response ready!

## Latest AI News

1. **Google launches Gemini 2.0** - The new model promises...

📚 Sources:
  1. [TechCrunch](https://techcrunch.com/...)
  2. [The Verge](https://theverge.com/...)
```

### Available commands

| Command | Description |
|---------|-------------|
| `model` | Switch AI model |
| `exit` | Exit the CLI |

## 🧪 Evaluation System

Run automated tests to evaluate agent quality:

```bash
npm run eval
```

The evaluator:
- Loads test cases from `data/test_set.json`
- Runs the agent for each question
- Uses a judge prompt to score responses (0-10)
- Displays summary with pass rate

```
╔════════════════════════════════════════════╗
║       🧪 GENKIT AGENT EVALUATOR            ║
╚════════════════════════════════════════════╝

TEST 1/3: bitcoin-price
⭐ Score: 8/10

📊 EVALUATION SUMMARY
🎯 TOTAL AVERAGE: 7.5/10
   Pass rate (score ≥ 6): 100%
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Google Genkit](https://firebase.google.com/docs/genkit) | AI orchestration framework |
| [Dotprompt](https://firebase.google.com/docs/genkit/dotprompt) | Declarative prompt files |
| [Gemini](https://ai.google.dev/) | Google's language model |
| [OpenAI GPT](https://openai.com/) | OpenAI's language model |
| [Tavily](https://tavily.com/) | Web search API for AI |
| [TypeScript](https://www.typescriptlang.org/) | Static typing |
| [Zod](https://zod.dev/) | Schema validation |

## 📁 Project Structure

```
genkit-perplexity-style-cli/
├── prompts/
│   ├── research.prompt    # Main agent prompt
│   └── judge.prompt       # Evaluator judge prompt
├── data/
│   └── test_set.json      # Test cases for evaluation
├── src/
│   ├── agent.ts           # Flow, Tools, Structured Output
│   ├── search.ts          # Tavily API wrapper
│   └── evaluator.ts       # Agent testing system
├── index.ts               # CLI and model selection
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 Available Scripts

```bash
npm start        # Run the CLI
npm run dev      # Run with Genkit Developer UI
npm run eval     # Run agent evaluations
npm run typecheck # TypeScript validation
npm test         # Run typecheck + eval
```

## 📄 License

ISC

---

<p align="center">
  Built with ❤️ using <a href="https://firebase.google.com/docs/genkit">Google Genkit</a>
</p>
