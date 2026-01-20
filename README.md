# 🔍 genkit-perplexitystyle-cli

> Un agente de búsqueda web con IA para terminal, estilo Perplexity, construido con Google Genkit y Tavily.

**genkit-perplexitystyle-cli** es una CLI que combina el poder de modelos de lenguaje (Gemini/ChatGPT) con búsqueda web en tiempo real usando Tavily. Hace preguntas en lenguaje natural y obtené respuestas fundamentadas con fuentes reales de internet.

## ✨ Características

- 🌐 **Búsqueda web en tiempo real** - Usa Tavily para obtener información actualizada de internet
- 🤖 **Multi-modelo** - Elegí entre Gemini (Google) o GPT (OpenAI)
- 🛠️ **Tool Calling** - El agente decide cuándo buscar usando el patrón de herramientas
- 📝 **Structured Output** - Respuestas JSON estructuradas con Zod schemas
- 📄 **Dotprompt** - Separación de Prompt Engineering del código
- 💬 **Historial de conversación** - Mantiene el contexto durante la sesión
- ⚠️ **Manejo de Rate Limits** - Mensajes amigables y cambio de modelo en caliente
- 🎨 **Interfaz amigable** - Spinners, colores y feedback visual

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                   Perplexity CLI                         │
├─────────────────────────────────────────────────────────┤
│  index.ts          → UI de terminal + selección modelo  │
├─────────────────────────────────────────────────────────┤
│  prompts/          → Prompt Engineering (Dotprompt)     │
│   └── research.prompt                                   │
├─────────────────────────────────────────────────────────┤
│  src/agent.ts      → Flow + Tools + Structured Output   │
│  src/search.ts     → Wrapper de búsqueda Tavily         │
├─────────────────────────────────────────────────────────┤
│       Genkit              Gemini / OpenAI               │
│   (Orquestación)         (LLM Providers)                │
└─────────────────────────────────────────────────────────┘
```

### ¿Cómo funciona?

1. **El usuario elige un modelo** (Gemini o ChatGPT)
2. **Hace una pregunta** en lenguaje natural
3. **El agente ejecuta el Flow** cargando el prompt desde `.prompt`
4. **La herramienta `searchWeb`** consulta Tavily
5. **El modelo sintetiza** los resultados en un JSON estructurado
6. **Se muestran respuesta y fuentes** por separado

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- API Key de [Tavily](https://tavily.com/)
- API Key de [Google AI Studio](https://aistudio.google.com/apikey) y/o [OpenAI](https://platform.openai.com/api-keys)

### Pasos

```bash
# Clonar el repositorio
git clone git@github.com:MarcoLopezf/genkit-perplexity-style-cli.git
cd genkit-perplexity-style-cli

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

Editar `.env` con tus API keys:

```env
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxx  # Opcional
```

## 📖 Uso

```bash
# Ejecutar la CLI
npx tsx index.ts

# O con el script de desarrollo (incluye Genkit UI)
npm run dev
```

### Ejemplo de uso

```
╔════════════════════════════════════════════╗
║         🔍 PERPLEXITY CLI                  ║
╚════════════════════════════════════════════╝

🤖 Selecciona el modelo a usar:

  1. Gemini 2.0 Flash
  2. Gemini 1.5 Flash
  3. GPT-4o Mini
  4. GPT-4o

Elige un número: 1

✅ Modelo seleccionado: Gemini 2.0 Flash

Pregunta lo que quieras saber : ¿Cuáles son las últimas noticias de IA?

⠋ Buscando información con Gemini 2.0 Flash...
✔ ¡Respuesta lista!

## Últimas Noticias de IA

1. **Google lanza Gemini 2.0** - El nuevo modelo promete...

📚 Fuentes:
  1. [TechCrunch](https://techcrunch.com/...)
  2. [The Verge](https://theverge.com/...)
```

### Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `model` | Cambiar el modelo de IA |
| `exit` | Salir de la CLI |

## 🛠️ Stack Tecnológico

| Tecnología | Propósito |
|------------|-----------|
| [Google Genkit](https://firebase.google.com/docs/genkit) | Framework de orquestación de IA |
| [Dotprompt](https://firebase.google.com/docs/genkit/dotprompt) | Archivos de prompt declarativos |
| [Gemini](https://ai.google.dev/) | Modelo de lenguaje de Google |
| [OpenAI GPT](https://openai.com/) | Modelo de lenguaje de OpenAI |
| [Tavily](https://tavily.com/) | API de búsqueda web para IA |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Zod](https://zod.dev/) | Validación de esquemas |

## 📁 Estructura del Proyecto

```
genkit-perplexity-style-cli/
├── prompts/
│   └── research.prompt    # Prompt Engineering (Dotprompt)
├── src/
│   ├── agent.ts           # Flow, Tools, Structured Output
│   └── search.ts          # Wrapper de Tavily API
├── index.ts               # CLI y selección de modelo
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 Scripts Disponibles

```bash
npm run dev      # Ejecuta con Genkit Developer UI
npm run start    # Ejecuta con ts-node
```

## 📄 Licencia

ISC

---

<p align="center">
  Construido con ❤️ usando <a href="https://firebase.google.com/docs/genkit">Google Genkit</a>
</p>
