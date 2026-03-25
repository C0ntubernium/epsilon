import chalk from 'chalk';
import { getSystemStatus, printHardwareInfo } from '../utils/hardware.js';
import { logger } from '../utils/logger.js';
import { validateSyntax, formatValidationErrors } from '../validators/syntax.js';
import { runFullStaticAnalysis, formatStaticErrors } from '../validators/static.js';
import { scanSecurity, formatSecurityErrors } from '../validators/security.js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execa } from 'execa';

const COMMANDS = {
  help: 'Show help message',
  version: 'Show version',
  init: 'Initialize localscript in current directory',
  status: 'Show system status and hardware info',
  validate: 'Validate Lua code (syntax + static analysis)',
  security: 'Run security scan on Lua code',
  generate: 'Generate Lua code from prompt',
  chat: 'Start interactive chat mode',
  scaffold: 'Scaffold new Lua project',
  test: 'Generate tests for Lua module',
  setup: 'Setup dependencies and tools',
};

const VERSION = '1.0.0';

export async function run(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await interactiveMode();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log(`localScript v${VERSION}`);
      break;
    case 'status':
    case '--status':
    case '-s':
      await showStatus();
      break;
    case 'validate':
    case '--validate':
    case '--check':
      await handleValidate(args.slice(1));
      break;
    case 'security':
    case '--security':
    case '--scan':
      await handleSecurity(args.slice(1));
      break;
    case 'generate':
    case '--generate':
    case '-g':
      await handleGenerate(args.slice(1));
      break;
    case 'chat':
    case '--chat':
    case '-c':
      await interactiveMode();
      break;
    case 'scaffold':
    case '--scaffold':
      await handleScaffold(args.slice(1));
      break;
    case 'test':
    case '--test':
      await handleTest(args.slice(1));
      break;
    case 'init':
    case '--init':
      await handleInit(args.slice(1));
      break;
    case 'setup':
    case '--setup':
      await handleSetup();
      break;
    default:
      if (args[0].startsWith('-')) {
        logger.error(`Unknown option: ${args[0]}`);
        showHelp();
        process.exit(1);
      }
      await handleGenerate(args);
  }
}

function showHelp(): void {
  console.log(`
${chalk.bold.cyan('localScript')} v${VERSION}
Local agent for Lua code generation

${chalk.bold('Usage:')}
  localscript [command] [options]

${chalk.bold('Commands:')}
${Object.entries(COMMANDS).map(([cmd, desc]) => 
  `  ${chalk.green(cmd.padEnd(12))} ${desc}`
).join('\n')}

${chalk.bold('Options:')}
  -h, --help         Show this help
  -v, --version      Show version
  -s, --status       Show system status

${chalk.bold('Examples:')}
  localscript status
  localscript validate main.lua
  localscript "write a function to calculate fibonacci"
  localscript chat
`.trim());
}

async function showStatus(): Promise<void> {
  logger.section('System Status');
  
  const status = await getSystemStatus();
  
  console.log(chalk.bold('Hardware:'));
  printHardwareInfo(status.hardware);
  console.log();
  
  console.log(chalk.bold('Tools:'));
  console.log(`  Lua:      ${status.hasLua ? '✓' : '✗'}`);
  console.log(`  luac:     ${status.hasLuac ? '✓' : '✗'}`);
  console.log(`  luacheck: ${status.hasLuacheck ? '✓' : '✗'}`);
  console.log(`  llama.cpp:${status.hasLlamaCpp ? '✓' : '✗'}`);
  console.log(`  ollama:   ${status.hasOllama ? '✓' : '✗'}`);
  
  if (status.availableModels.length > 0) {
    console.log(chalk.bold('\nAvailable Models:'));
    for (const model of status.availableModels) {
      console.log(`  - ${model}`);
    }
  }
}

async function handleValidate(args: string[]): Promise<void> {
  let code = '';

  for (const arg of args) {
    if (existsSync(arg)) {
      code = readFileSync(arg, 'utf-8');
    } else if (arg.startsWith('--')) {
      continue;
    } else {
      code = arg;
    }
  }

  if (!code) {
    logger.error('No code or file provided');
    process.exit(1);
  }

  logger.section('Validation Results');

  logger.info('Running syntax check...');
  const syntaxResult = await validateSyntax(code);
  console.log(formatValidationErrors(syntaxResult));
  console.log();

  logger.info('Running static analysis...');
  const staticResult = await runFullStaticAnalysis(code);
  console.log(formatStaticErrors(staticResult));

  const hasErrors = !syntaxResult.valid || !staticResult.valid;
  process.exit(hasErrors ? 1 : 0);
}

async function handleSecurity(args: string[]): Promise<void> {
  let code = '';

  for (const arg of args) {
    if (existsSync(arg)) {
      code = readFileSync(arg, 'utf-8');
    } else if (arg.startsWith('--')) {
      continue;
    } else {
      code = arg;
    }
  }

  if (!code) {
    logger.error('No code provided');
    process.exit(1);
  }

  logger.section('Security Scan');
  const result = scanSecurity(code);
  console.log(formatSecurityErrors(result));

  const hasCritical = result.errors.some(e => e.severity === 'error');
  process.exit(hasCritical ? 1 : 0);
}

async function handleGenerate(args: string[]): Promise<void> {
  const prompt = args.join(' ');
  
  if (!prompt) {
    logger.error('Please provide a prompt');
    process.exit(1);
  }

  logger.info('Generating code... (requires ollama or llama.cpp)');
  logger.info(`Prompt: ${prompt}`);
  
  try {
    const { Ollama } = await import('../llm/interface.js');
    const models = await Ollama.listModels();
    
    if (models.length === 0) {
      logger.error('No models found. Please install ollama and pull a model:');
      console.log('  ollama pull qwen2.5-coder:14b');
      process.exit(1);
    }

    logger.info(`Available models: ${models.join(', ')}`);
    
    const llm = new Ollama({ model: models[0] });
    const response = await llm.complete({
      prompt,
      system: 'You are a Lua expert. Generate clean, idiomatic Lua code.',
    });

    logger.success('Generated code:');
    logger.code(response.text);
  } catch (error: any) {
    logger.error(`Generation failed: ${error.message}`);
    process.exit(1);
  }
}

async function handleScaffold(args: string[]): Promise<void> {
  const projectName = args[0] || 'my-lua-project';
  
  logger.info(`Scaffolding project: ${projectName}`);
  
  const dirs = ['src', 'test', 'spec'];
  const files: Record<string, string> = {
    '.luacheckrc': `codes = { globals = { "describe", "it", "before_each", "after_each" } }\n`,
    '.luarc.json': `{\n  "workspace.library": ["src/"],\n  "runtime.version": "Lua 5.4"\n}\n`,
    'README.md': `# ${projectName}\n\nA Lua project.\n`,
  };

  try {
    mkdirSync(projectName, { recursive: true });
    
    for (const dir of dirs) {
      mkdirSync(join(projectName, dir), { recursive: true });
    }

    for (const [file, content] of Object.entries(files)) {
      writeFileSync(join(projectName, file), content);
    }

    logger.success(`Project scaffolded at ./${projectName}/`);
    console.log(`
Project structure:
  ${projectName}/
  ├── src/
  ├── test/
  ├── spec/
  ├── .luacheckrc
  ├── .luarc.json
  └── README.md
`);
  } catch (error: any) {
    logger.error(`Failed to scaffold: ${error.message}`);
    process.exit(1);
  }
}

async function handleTest(args: string[]): Promise<void> {
  let filePath = '';
  
  for (const arg of args) {
    if (existsSync(arg)) {
      filePath = arg;
    }
  }

  if (!filePath) {
    logger.error('Please provide a Lua file to generate tests for');
    process.exit(1);
  }

  logger.info(`Generating tests for: ${filePath}`);
  
  const code = readFileSync(filePath, 'utf-8');
  const functions = extractFunctions(code);
  
  console.log(`\nFound ${functions.length} function(s):`);
  for (const fn of functions) {
    console.log(`  - ${fn}`);
  }

  logger.info('Generating busted tests...');
  
  const testCode = generateBustedTests(functions);
  const testPath = filePath.replace(/\.lua$/, '_spec.lua');
  
  writeFileSync(testPath, testCode);
  logger.success(`Tests written to: ${testPath}`);
}

function extractFunctions(code: string): string[] {
  const functions: string[] = [];
  const regex = /(?:function\s+(\w+)|(?:local\s+)?(\w+)\s*=\s*function)/g;
  
  let match;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name && !functions.includes(name)) {
      functions.push(name);
    }
  }
  
  return functions;
}

function generateBustedTests(functions: string[]): string {
  const lines = [
    'local describe = require("busted").describe',
    'local it = require("busted").it',
    'local stub = require("busted").stub',
    '',
  ];

  for (const fn of functions) {
    lines.push(`describe("${fn}", function()`);
    lines.push(`  it("should exist", function()()`);
    lines.push(`    assert.is_function(${fn})`);
    lines.push(`  end)`);
    lines.push(`end)`);
    lines.push(``);
  }

  return lines.join('\n');
}

async function handleInit(_args: string[]): Promise<void> {
  const configPath = join(process.cwd(), 'localscript.json');
  
  if (existsSync(configPath)) {
    logger.warn('localscript.json already exists');
    return;
  }

  const config = {
    model: 'qwen2.5-coder:14b',
    validation: {
      syntax: true,
      luacheck: true,
      security: true,
    },
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2));
  logger.success('Initialized localscript.json');
}

async function handleSetup(): Promise<void> {
  logger.section('Setting up LocalScript');
  
  logger.info('Checking dependencies...');
  
  try {
    await execa('which', ['luac']);
    logger.success('luac found');
  } catch {
    logger.warn('luac not found. Install via:');
    console.log('  brew install lua');
  }

  console.log('\nTo complete setup:');
  console.log('1. Install ollama: https://ollama.ai');
  console.log('2. Pull a model: ollama pull qwen2.5-coder:14b');
  console.log('3. Run: localscript status');
}

async function interactiveMode(): Promise<void> {
  console.log(`
${chalk.bold.cyan('╔═══════════════════════════════════════════╗')}
${chalk.bold.cyan('║')}    localScript v${VERSION} - Lua Agent       ${chalk.bold.cyan('║')}
${chalk.bold.cyan('╚═══════════════════════════════════════════╝')}

${chalk.gray('Type "help" for commands, "exit" to quit')}

${chalk.green('localScript')} > ${chalk.gray('(waiting for input...)')}
`);

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('localScript') + chalk.gray(' > '),
  });

  const history: string[] = [];
  let currentModel = 'qwen2.5-coder:14b';

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (!input) {
      rl.prompt();
      return;
    }

    history.push(input);

    if (input === 'exit' || input === 'quit') {
      console.log(chalk.yellow('Goodbye!'));
      process.exit(0);
    }

    if (input === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    if (input === 'status') {
      await showStatus();
      rl.prompt();
      return;
    }

    if (input.startsWith('/model ')) {
      currentModel = input.slice(7);
      console.log(chalk.blue(`Switched to model: ${currentModel}`));
      rl.prompt();
      return;
    }

    if (input.startsWith('/validate ') || input.startsWith('/check ')) {
      const filePath = input.replace(/^\/(?:validate|check)\s+/, '');
      if (existsSync(filePath)) {
        const code = readFileSync(filePath, 'utf-8');
        const result = await validateSyntax(code);
        console.log(formatValidationErrors(result));
      } else {
        logger.error(`File not found: ${filePath}`);
      }
      rl.prompt();
      return;
    }

    if (input.startsWith('/security ') || input.startsWith('/scan ')) {
      const filePath = input.replace(/^\/(?:security|scan)\s+/, '');
      if (existsSync(filePath)) {
        const code = readFileSync(filePath, 'utf-8');
        const result = scanSecurity(code);
        console.log(formatSecurityErrors(result));
      } else {
        logger.error(`File not found: ${filePath}`);
      }
      rl.prompt();
      return;
    }

    console.log(chalk.gray(`Processing: ${input}`));
    
    try {
      const { Ollama } = await import('../llm/interface.js');
      const llm = new Ollama({ model: currentModel });
      const response = await llm.complete({
        prompt: input,
        system: 'You are a Lua expert. Generate clean, idiomatic Lua code.',
      });
      logger.code(response.text);
    } catch (error: any) {
      logger.error(error.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.yellow('\nGoodbye!'));
    process.exit(0);
  });

  rl.prompt();
}