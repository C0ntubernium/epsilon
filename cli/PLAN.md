# LocalScript - Local Agent System for Lua Code Generation

## Project Overview

**Project Name:** LocalScript  
**Type:** CLI Tool / Local LLM Agent  
**Core Functionality:** Autonomous agent system using local (lightweight) language model (LLM) to generate and validate Lua code without sending data to external services.  
**Target Audience:** AI Engineers, Backend Developers, MLOps, DevOps Engineers

---

## Architecture

```
localscript/
├── bin/                    # CLI entry point
├── src/
│   ├── cli/               # CLI commands & interface
│   ├── agent/             # Core agent logic
│   ├── llm/               # LLM interface (llama.cpp, ollama)
│   ├── validators/        # Code validation tools
│   ├── tools/             # External tool integrations
│   ├── utils/             # Utilities (hardware detection, etc.)
│   └── plugins/           # Plugin system
├── package.json
├── tsconfig.json
└── README.md
```

---

## Core Features

### 1. Hardware Detection & Resource Management

- **GPU Detection:** NVIDIA CUDA, AMD ROCm
- **Apple Silicon:** Neural Engine detection via Metal
- **CPU Fallback:** Automatic detection when GPU unavailable
- **Resource Monitoring:** Real-time GPU/CPU memory usage display

### 2. Model Management

- **Model Caching:** Persist loaded models across sessions (mmap to disk)
- **Model Switching:** Hot-swap models without restart via `/model` command
- **Supported Backends:** llama.cpp, ollama, lm-studio
- **Default Model:** qwen coder 2.5 14b (fine-tuned)

### 3. Context Window Management

- **Large Codebase Handling:** Automatic truncation with priority weighting
- **Summarization:** Smart context compression for huge files
- **File Selection:** Intelligent file picking based on relevance

---

## Validation & Code Quality

### 4. Syntax Validation

- **luac Integration:** Compile check with detailed error reporting
- **Error Parsing:** Translate luac errors to user-friendly messages
- **Batch Validation:** Multiple files validation

### 5. Static Analysis

- **luacheck:** Code smells, unused variables, style issues
- **selene:** Fast Lua linter with custom rules
- **Severity Levels:** Error, Warning, Info with filtering

### 6. Type Checking

- **LuaLS (lua-language-server):** Type annotation validation
- **Type Inference:** Detect and suggest missing type annotations
- **.luarc.json Support:** Project-specific type configs

### 7. Lua Version Compatibility

- **Version Detection:** Lua 5.1, 5.2, 5.3, 5.4, LuaJIT
- **Feature Flags:** Detect version-specific incompatible features
- **Migration Hints:** Suggest code changes for version upgrades

### 8. Memory Leak Detection

- **Pattern Detection:** Unclosed resources, global leaks, upvalue issues
- **GC Analysis:** Track table growth patterns
- **Common Patterns:** table.insert without limit, callback leaks

### 9. Automated Fixing

- **Auto-correct:** Common errors (syntax, style, unused vars)
- **User Approval:** Confirmation before applying fixes
- **Batch Fixes:** Apply fixes to multiple files

### 10. Security Scanning

- **Dangerous Patterns Detection:**
  - `os.execute`, `os.rename`, `os.remove`, `os.exit`
  - `io.popen`, `io.write`, `io.read` with paths
  - `debug` library usage
  - `loadstring`, `load`, `loadfile` with dynamic code
  - `require` with path traversal
- **Risk Levels:** Critical, High, Medium, Low
- **Remediation Suggestions:** Safe alternatives provided

---

## Development Workflow Integration

### 11. Git Integration

- **Staged Changes Analysis:** Parse git diff for Lua files
- **Commit Message Generation:** Contextual, conventional commits
- **PR Description:** Auto-generate pull request descriptions
- **Branch Analysis:** Detect feature branches, hotfixes

### 12. Pre-commit Hooks

- **Git Hook Integration:** `.git/hooks/pre-commit` setup
- **Lua Validation:** Syntax + style checks before commit
- **Blocking:** Prevent commits if critical errors found
- **Skip Option:** `--no-verify` support

### 13. Project Scaffolding

- **Templates:**
  - LuaRocks rockspec
  - Makefile / CMake
  - Standard directory layout (src/, test/, spec/)
  - .luacheckrc, .luarc.json configs
- **Interactive Prompts:** Project name, author, dependencies
- **Git Initialization:** Optional repo init

---

## Testing Support

### 14. Unit Test Generation

- **Supported Frameworks:** busted, luatest, telescope
- **Module Analysis:** Parse exported functions
- **Edge Cases:** nil, wrong types, error conditions
- **Test Coverage Hints:** Based on validation results

### 15. Coverage Analysis

- **luacov Integration:** Coverage measurement
- **HTML Reports:** Visual coverage reports
- **Critical Path:** Highlight uncovered critical functions
- **Thresholds:** Fail if coverage below threshold

---

## Documentation Generation

### 16. LDoc Generation

- **Annotation Parsing:** @param, @return, @see, @class
- **Markdown Output:** GitHub-flavored markdown
- **Index Generation:** Module index, function index

### 17. API Reference

- **Module Documentation:** Auto-generate from code
- **Cross-references:** Link related functions
- **Examples:** Extract and format code examples

---

## Security & Privacy

### 18. Zero Telemetry

- **Network Isolation Mode:** Optional `--offline` flag
- **No External Calls:** Guarantee no external communication
- **Audit Logs:** Local-only operation logging

### 19. File System Sandboxing

- **Whitelist Mode:** Restrict to specified directories
- **Approval System:** Explicit user confirm for file operations
- **Operation Logging:** Track all file modifications

---

## Editor & LSP Integration

### 20. LSP Support

- **Language Server Protocol:** Connect to lua-language-server
- **Diagnostics:** Real-time error reporting
- **Completions:** Context-aware suggestions

### 21. Editor Plugins

- **VSCode Extension:** localscript-vscode
- **Neovim Plugin:** localscript.nvim
- **JetBrains Plugin:** localscript-intellij

---

## Advanced Agentic Workflows

### 22. Self-Improvement Loop

- **Failure Learning:** Store validation failures locally
- **Prompt Refinement:** Adjust generation prompts based on errors
- **Model Fine-tuning Hints:** Export patterns for fine-tuning

### 23. Multi-Step Task Chaining

- **Workflow Engine:** Generate → Validate → Test → Fix
- **Autonomous Mode:** Run without user input
- **Checkpoint System:** Resume interrupted workflows

---

## Plugin Architecture

### 24. Extensible Validation Rules

- **Plugin API:** Define custom rules in Lua
- **Config Format:** `.localscript/rules.lua`
- **Rule Categories:** Security, Style, Performance

### 25. Custom Tool Integration

- **Tool Registry:** Register external validators
- **CLI Wrapper:** Standardize tool output parsing
- **Hot Reload:** Add tools without restart

---

## Audience-Specific Features

### 26. Nginx/Kong Plugin Generation

- **Templates:** nginx.conf, kong plugins
- **Access Phase:** header_filter, body_filter, log
- **Testing:** Mock requests for plugins

### 27. Redis Scripting

- **EVAL/ EVALSHA:** Generate Redis Lua scripts
- **Optimization:** Key slot awareness, pipeline hints
- **Type Safety:** Redis type checking

---

## CLI Interface Design

### Visual Style

- **Prompt:** `localScript > ` (with accent color)
- **Messages:** Syntax highlighted code blocks
- **Progress:** Animated spinners for long operations
- **Colors:** Monokai-inspired theme

### Commands

```
localscript                    # Start interactive mode
localscript "prompt"           # Single prompt mode
localscript --file main.lua    # Process file
localscript --chat             # Continue conversation
localscript --model qwen2.5   # Switch model
localscript --validate         # Validate code
localscript --fix              # Auto-fix issues
localscript --scaffold         # New project
localscript --test             # Generate tests
localscript --doc              # Generate docs
localscript --security         # Security scan
localscript --setup            # Initial setup
localscript --status           # Show system status
```

### Interactive Features

- **Tab Completion:** Commands, files, models
- **History:** Arrow key navigation
- **Rich Output:** Markdown, syntax highlighting
- **TUI Mode:** Full terminal UI with panels

---

## Installation

### pnpm (Global)

```bash
pnpm install -g localscript
```

### Homebrew

```bash
brew install localscript
```

### cURL

```bash
curl -fsSL https://localscript.dev/install | sh
```

### Manual

```bash
npm install -g localscript
```

---

## Dependencies

### Runtime

- Node.js 20+
- pnpm 8+
- llama.cpp (bundled/wrapped)
- lua-language-server
- luacheck
- luac
- luacov (for coverage)

### Optional

- ollama (for model management)
- git (for git integration)
- docker (for sandboxing)

---

## Configuration

### `localscript.json` (Project)

```json
{
  "model": "qwen-coder-2.5-14b",
  "validation": {
    "luacheck": true,
    "selene": true,
    "security": true
  },
  "sandbox": {
    "allowedPaths": ["./src", "./test"]
  }
}
```

### `~/.localscript/config.json` (Global)

```json
{
  "modelPath": "~/.localscript/models",
  "defaultModel": "qwen-coder-2.5-14b",
  "offlineMode": false,
  "theme": "monokai"
}
```

---

## File Structure (Detailed)

```
localscript/
├── bin/
│   └── localscript           # CLI entry
├── src/
│   ├── index.ts              # Main export
│   ├── cli/
│   │   ├── index.ts          # CLI parser
│   │   ├── commands/         # All commands
│   │   ├── interactive.ts    # TUI mode
│   │   └── completions.ts    # Tab completion
│   ├── agent/
│   │   ├── engine.ts         # Agent core
│   │   ├── context.ts        # Context management
│   │   └── workflows.ts      # Multi-step workflows
│   ├── llm/
│   │   ├── interface.ts      # LLM abstraction
│   │   ├── llama.cpp.ts      # llama.cpp backend
│   │   └── ollama.ts         # ollama backend
│   ├── validators/
│   │   ├── index.ts          # Validator orchestration
│   │   ├── syntax.ts         # luac wrapper
│   │   ├── static.ts         # luacheck, selene
│   │   ├── types.ts          # LuaLS integration
│   │   ├── security.ts       # Security scanner
│   │   └── memory.ts         # Memory leak detection
│   ├── tools/
│   │   ├── git.ts            # Git operations
│   │   ├── lsp.ts            # Language server
│   │   ├── scaffold.ts       # Project scaffolding
│   │   └── test.ts           # Test generation
│   ├── utils/
│   │   ├── hardware.ts       # HW detection
│   │   ├── cache.ts          # Model caching
│   │   ├── sandbox.ts        # File sandboxing
│   │   └── logger.ts         # Logging
│   └── plugins/
│       ├── manager.ts        # Plugin system
│       └── types.ts          # Plugin interfaces
├── scripts/
│   └── install-deps.sh       # Install Lua tools
├── templates/                # Project templates
├── package.json
├── tsconfig.json
├── localscript.schema.json    # Config schema
└── README.md
```

---

## Roadmap

### Phase 1: MVP (Hackathon)

- [ ] Basic CLI with interactive mode
- [ ] llama.cpp integration
- [ ] Syntax validation (luac)
- [ ] Simple code generation

### Phase 2: Core Features

- [ ] Model switching & caching
- [ ] Static analysis (luacheck)
- [ ] Security scanning
- [ ] Pre-commit hooks

### Phase 3: Advanced

- [ ] Type checking
- [ ] Test generation
- [ ] Documentation
- [ ] Plugin system

### Phase 4: Enterprise

- [ ] LSP integration
- [ ] Editor plugins
- [ ] Self-improvement loop
- [ ] Kubernetes/Docker support

---

## Success Metrics

- **Startup Time:** < 2 seconds (cached model)
- **Validation Speed:** < 500ms per file
- **Code Generation:** < 10 seconds for typical functions
- **Memory Usage:** < 8GB RAM for 14B model
- **Offline Capability:** 100% offline after setup
