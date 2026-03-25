import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ValidationError, ValidationResult } from '../validators/syntax.js';

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  rules?: PluginRule[];
  tools?: PluginTool[];
  hooks?: PluginHooks;
}

export interface PluginRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  pattern?: RegExp;
  check?: (code: string) => Promise<ValidationError[]>;
}

export interface PluginTool {
  name: string;
  command: string;
  args?: string[];
  parseOutput?: (output: string) => ValidationResult;
}

export interface PluginHooks {
  beforeValidate?: (code: string) => Promise<string>;
  afterValidate?: (result: ValidationResult) => Promise<ValidationResult>;
  beforeGenerate?: (prompt: string) => Promise<string>;
  afterGenerate?: (code: string) => Promise<string>;
}

export interface PluginManagerOptions {
  pluginDirs?: string[];
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private pluginDirs: string[];

  constructor(options: PluginManagerOptions = {}) {
    this.pluginDirs = options.pluginDirs || [
      join(process.cwd(), '.localscript', 'plugins'),
      join(process.env.HOME || '', '.localscript', 'plugins'),
    ];
  }

  async loadPlugins(): Promise<void> {
    for (const dir of this.pluginDirs) {
      if (!existsSync(dir)) continue;

      const files = readdirSync(dir);
      
      for (const file of files) {
        if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
        
        const pluginPath = join(dir, file);
        
        try {
          const plugin = await import(pluginPath);
          const instance: Plugin = plugin.default || plugin;
          
          if (instance.name) {
            this.plugins.set(instance.name, instance);
          }
        } catch (error) {
          console.warn(`Failed to load plugin ${file}:`, error);
        }
      }
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getRules(): PluginRule[] {
    const rules: PluginRule[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.rules) {
        rules.push(...plugin.rules);
      }
    }
    
    return rules;
  }

  async runHook(hookName: string, code: string): Promise<string> {
    let result = code;

    for (const plugin of this.plugins.values()) {
      if (plugin.hooks) {
        const hook = (plugin.hooks as Record<string, ((arg: string) => Promise<string>) | undefined>)[hookName];
        if (hook) {
          result = await hook(result);
        }
      }
    }

    return result;
  }
}

export function createPlugin(name: string, config: Partial<Plugin>): Plugin {
  return {
    name,
    version: '1.0.0',
    ...config,
  };
}

export const builtinRules: PluginRule[] = [
  {
    id: 'no-debug',
    name: 'No debug statements',
    severity: 'warning',
    pattern: /\bprint\s*\(/,
  },
  {
    id: 'no-global',
    name: 'No implicit globals',
    severity: 'error',
    pattern: /^([A-Z][a-zA-Z0-9]*)\s*=/m,
  },
];

export async function loadProjectPlugins(projectDir: string): Promise<PluginManager> {
  const manager = new PluginManager({
    pluginDirs: [
      join(projectDir, '.localscript', 'plugins'),
    ],
  });
  
  await manager.loadPlugins();
  return manager;
}