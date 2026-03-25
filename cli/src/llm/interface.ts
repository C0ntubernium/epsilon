import { execa } from 'execa';
import which from 'which';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

export interface LLMConfig {
  model: string;
  modelPath?: string;
  temperature?: number;
  maxTokens?: number;
  contextWindow?: number;
  threads?: number;
  gpuLayers?: number;
}

export interface CompletionRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResponse {
  text: string;
  done: boolean;
  context?: number;
}

export abstract class LLMInterface {
  protected config: LLMConfig;
  protected loaded = false;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract load(): Promise<void>;
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
  abstract unload(): Promise<void>;
  abstract isLoaded(): boolean;

  getModelName(): string {
    return this.config.model;
  }
}

export class LlamaCpp extends LLMInterface {
  private process: any = null;

  async load(): Promise<void> {
    const modelPath = this.resolveModelPath();
    if (!existsSync(modelPath)) {
      throw new Error(`Model not found: ${modelPath}`);
    }

    const llamaBin = this.findLlamaBinary();
    const args = this.buildArgs(llamaBin, modelPath);

    this.process = execa(llamaBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cleanup: true,
    });

    this.loaded = true;
  }

  private resolveModelPath(): string {
    if (this.config.modelPath) return this.config.modelPath;
    
    const searchPaths = [
      join(homedir(), '.localscript', 'models', this.config.model + '.gguf'),
      join(homedir(), '.localscript', 'models', this.config.model),
      join(homedir(), '.cache', 'llama.cpp', 'models', this.config.model + '.gguf'),
      this.config.model,
    ];

    for (const p of searchPaths) {
      if (existsSync(p)) return p;
    }

    return this.config.model;
  }

  private findLlamaBinary(): string {
    const binaries = ['llama-cli', 'llama', 'llama-cli', 'llama.cpp'];
    
    for (const bin of binaries) {
      try {
        return which.sync(bin);
      } catch {
        continue;
      }
    }

    throw new Error('llama.cpp not found. Install from https://github.com/ggerganov/llama.cpp');
  }

  private buildArgs(_llamaBin: string, modelPath: string): string[] {
    const args = [
      '-m', modelPath,
      '--verbose', 'false',
      '-c', String(this.config.contextWindow || 8192),
      '--temp', String(this.config.temperature || 0.7),
      '-n', String(this.config.maxTokens || 1024),
      '--no-mmap',
    ];

    if (this.config.threads) {
      args.push('-t', String(this.config.threads));
    }

    if (this.config.gpuLayers) {
      args.push('--gpu-layers', String(this.config.gpuLayers));
    }

    return args;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.loaded) {
      await this.load();
    }

    const prompt = this.buildPrompt(request);
    
    // Send prompt via stdin (simplified for now)
    this.process!.stdin.write(prompt + '\n');

    // Read from stdout - this is simplified
    // In reality, you'd use the --mmap flag and interact via chat template
    
    return {
      text: 'Generated code placeholder',
      done: true,
    };
  }

  private buildPrompt(request: CompletionRequest): string {
    let prompt = '';
    
    if (request.system) {
      prompt += `System: ${request.system}\n`;
    }
    
    prompt += `User: ${request.prompt}\nAssistant:`;
    
    return prompt;
  }

  async unload(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.loaded = false;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export class Ollama extends LLMInterface {
  private baseUrl = 'http://localhost:11434';

  async load(): Promise<void> {
    const ollamaPath = which.sync('ollama');
    await execa(ollamaPath, ['serve']);
    this.loaded = true;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: request.prompt,
        system: request.system,
        temperature: request.temperature ?? this.config.temperature,
        max_tokens: request.maxTokens ?? this.config.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return {
      text: data.response,
      done: true,
    };
  }

  async unload(): Promise<void> {
    this.loaded = false;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  static async listModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json() as any;
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }
}

export function createLLM(config: LLMConfig, backend: 'llama.cpp' | 'ollama' = 'ollama'): LLMInterface {
  if (backend === 'llama.cpp') {
    return new LlamaCpp(config);
  }
  return new Ollama(config);
}