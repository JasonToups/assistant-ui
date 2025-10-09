# Assistant UI Docs - Ollama Local Development Support

This project now supports optional Ollama integration for local development, allowing developers to use local LLM services instead of external APIs during development.

## Features

- **Optional Ollama Support**: Use local Ollama instances for LLM requests
- **Graceful Fallback**: Automatically falls back to OpenAI when Ollama is unavailable
- **Configurable Timeouts**: Adjust timeout settings for different hardware capabilities
- **Model Selection**: Choose specific Ollama models via environment variables
- **Provider Pattern**: Follows existing AI SDK provider architecture

## Quick Start

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### 2. Start Ollama and Pull a Model

```bash
# Start Ollama daemon
ollama serve

# In another terminal, pull a model
ollama pull llama2
# or
ollama pull codellama
```

### 3. Configure Environment Variables

Create or update `.env.local` in the `apps/docs/` directory:

```env
# Optional: Ollama configuration
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2
OLLAMA_TIMEOUT=10000

# Required: OpenAI fallback
OPENAI_API_KEY=sk-your-openai-key-here
```

### 4. Start Development Server

```bash
cd apps/docs
pnpm dev
```

## Configuration Options

| Environment Variable | Default                  | Description                 |
| -------------------- | ------------------------ | --------------------------- |
| `OLLAMA_API_URL`     | `http://localhost:11434` | Ollama API endpoint         |
| `OLLAMA_MODEL`       | `llama2`                 | Default model to use        |
| `OLLAMA_TIMEOUT`     | `5000`                   | Timeout in milliseconds     |
| `OPENAI_API_KEY`     | Required                 | OpenAI API key for fallback |

## Usage

### Automatic Provider Selection (Default)

The system automatically:

1. Tries Ollama if configured and available
2. Falls back to OpenAI if Ollama fails
3. Provides clear error messages for debugging

### Manual Provider Selection

You can force a specific provider by modifying the API request:

```javascript
// Force Ollama usage
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }],
    provider: "ollama", // Force Ollama
  }),
});

// Force OpenAI usage
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }],
    provider: "openai", // Force OpenAI
  }),
});
```

## Troubleshooting

### Ollama Not Responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama if needed
ollama serve
```

### Model Not Found

```bash
# List available models
ollama list

# Pull a specific model
ollama pull llama2
```

### Connection Timeout

- Check `OLLAMA_API_URL` is correct
- Ensure Ollama is running on specified port
- Verify firewall settings allow local connections
- Increase `OLLAMA_TIMEOUT` for slower machines (try 10000-30000ms)

## Performance Tips

- Use smaller models for faster responses: `ollama pull llama2:7b`
- Enable Ollama GPU acceleration if available
- Monitor Ollama logs: `ollama logs`
- Adjust timeout settings for your hardware: `OLLAMA_TIMEOUT=15000`
- For older machines, consider increasing timeout to 20-30 seconds

## Architecture

The Ollama integration follows the existing AI SDK provider pattern:

```
apps/docs/lib/providers/
├── types.ts          # TypeScript interfaces
├── config.ts         # Environment validation & config
├── interfaces.ts     # Common provider interface
├── errors.ts         # Error handling
├── health.ts         # Health check system
├── ollama.ts         # Ollama provider implementation
├── openai.ts         # OpenAI provider abstraction
└── index.ts          # Provider factory
```

## Development

### Running Tests

```bash
# Run unit tests
pnpm test

# Run integration tests
pnpm test:integration
```

### Code Quality

The project uses:

- TypeScript with strict mode
- ESLint for code linting
- Prettier for code formatting
- Comprehensive error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
