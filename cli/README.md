# LocalScript

Local agent system for Lua code generation using local LLM.

## Installation

### pnpm (Recommended)

```bash
pnpm install -g localscript
```

### npm

```bash
npm install -g localscript
```

### Homebrew

```bash
brew install localscript
```

### cURL

```bash
curl -fsSL https://localscript.dev/install | sh
```

## Quick Start

```bash
# Check system status
localscript status

# Validate a Lua file
localscript validate main.lua

# Run security scan
localscript security code.lua

# Generate code
localscript "write a function to calculate fibonacci"

# Interactive mode
localscript chat
```

## Commands

| Command                | Description                   |
| ---------------------- | ----------------------------- |
| `localscript status`   | Show hardware and tool status |
| `localscript validate` | Validate Lua code             |
| `localscript security` | Run security scan             |
| `localscript generate` | Generate Lua code             |
| `localscript chat`     | Interactive chat mode         |
| `localscript scaffold` | Create new Lua project        |
| `localscript test`     | Generate tests                |

## Configuration

Create `localscript.json` in your project:

```json
{
  "model": "qwen2.5-coder:14b",
  "validation": {
    "syntax": true,
    "luacheck": true,
    "security": true
  }
}
```

## Requirements

- Node.js 20+
- pnpm 8+ (or npm)
- [ollama](https://ollama.ai) or [llama.cpp](https://github.com/ggerganov/llama.cpp)

## License

MIT
