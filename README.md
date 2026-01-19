# 🔍 genkit-perplexitystyle-cli

> Un agente de búsqueda web con IA para terminal, estilo Perplexity, construido con Google Genkit y Tavily.

**genkit-perplexitystyle-cli** es una CLI que combina el poder de los modelos de lenguaje de Google (Gemini) con búsqueda web en tiempo real usando Tavily. Hace preguntas en lenguaje natural y obtené respuestas fundamentadas con fuentes reales de internet.

## ✨ Características

- 🌐 **Búsqueda web en tiempo real** - Usa Tavily para obtener información actualizada de internet
- 🤖 **Impulsado por Gemini** - Respuestas inteligentes generadas por el modelo Gemini 2.5 Flash
- 🛠️ **Arquitectura con herramientas** - El agente decide cuándo buscar usando el patrón de tool calling
- 💬 **Historial de conversación** - Mantiene el contexto durante toda la sesión
- 📝 **Respuestas en Markdown** - Salida formateada con fuentes y estructura clara
- 🎨 **Interfaz amigable** - Spinners, colores y feedback visual en la terminal

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     TermSearch CLI                       │
├─────────────────────────────────────────────────────────┤
│  index.ts          → Punto de entrada, UI de terminal   │
├─────────────────────────────────────────────────────────┤
│  src/agent.ts      → Agente con prompt y tool calling   │
├─────────────────────────────────────────────────────────┤
│  src/search.ts     → Wrapper de búsqueda Tavily         │
├─────────────────────────────────────────────────────────┤
│       Genkit                    Tavily API              │
│   (Orquestación)            (Búsqueda Web)              │
└─────────────────────────────────────────────────────────┘
```

### ¿Cómo funciona?

1. **El usuario hace una pregunta** en la terminal
2. **El agente analiza la intención** y decide si necesita buscar en internet
3. **La herramienta `searchWeb`** consulta Tavily y obtiene resultados relevantes
4. **El modelo sintetiza** los resultados en una respuesta coherente con fuentes

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- API Key de [Tavily](https://tavily.com/)
- API Key de [Google AI Studio](https://aistudio.google.com/apikey)

### Pasos

```bash
# Clonar el repositorio
git clone <tu-repo-url>
cd genkit-js

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

Editar `.env` con tus API keys:

```env
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxx
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

  💬 Type your question and get AI-powered answers with internet resources
  📜 Chat history is maintained during this session
  🚪 Commands: type 'exit' to quit or press ⌘+C to quit

Pregunta lo que quieras saber : ¿Cuáles son las últimas noticias de tecnología?

⠋ Buscando información sobre: "¿Cuáles son las últimas noticias de tecnología?"...
✔ ¡Respuesta lista!

## Últimas Noticias de Tecnología

1. **Apple anuncia nuevo chip M4** - El nuevo procesador promete...

### Fuentes
- [TechCrunch](https://techcrunch.com/...)
- [The Verge](https://theverge.com/...)
```

## 🛠️ Stack Tecnológico

| Tecnología | Propósito |
|------------|-----------|
| [Google Genkit](https://firebase.google.com/docs/genkit) | Framework de orquestación de IA |
| [Gemini 2.5 Flash](https://ai.google.dev/) | Modelo de lenguaje |
| [Tavily](https://tavily.com/) | API de búsqueda web optimizada para IA |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Zod](https://zod.dev/) | Validación de esquemas |
| [Chalk](https://github.com/chalk/chalk) | Colores en terminal |
| [Ora](https://github.com/sindresorhus/ora) | Spinners elegantes |

## 📁 Estructura del Proyecto

```
genkit-js/
├── index.ts           # Punto de entrada y UI de terminal
├── src/
│   ├── agent.ts       # Definición del agente y prompts
│   └── search.ts      # Wrapper de la API de Tavily
├── package.json
├── tsconfig.json
├── .env.example       # Template de variables de entorno
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
