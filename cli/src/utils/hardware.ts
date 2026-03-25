import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import which from 'which';

export interface HardwareInfo {
  type: 'cuda' | 'metal' | 'cpu';
  name: string;
  memory: number;
  cores: number;
  supportsGpu: boolean;
}

export interface SystemStatus {
  hardware: HardwareInfo;
  hasLua: boolean;
  hasLuac: boolean;
  hasLuacheck: boolean;
  hasLlamaCpp: boolean;
  hasOllama: boolean;
  availableModels: string[];
}

function detectCuda(): HardwareInfo | null {
  try {
    if (process.platform !== 'linux') return null;
    const nvidiaSmi = which.sync('nvidia-smi', { nothrow: true });
    if (!nvidiaSmi) return null;

    const output = execSync('nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader', { encoding: 'utf-8' });
    const [name, mem, compute] = output.trim().split(', ');
    return {
      type: 'cuda',
      name: `NVIDIA ${name}`,
      memory: parseInt(mem.replace('MiB', '')),
      cores: parseFloat(compute) * 1000,
      supportsGpu: true,
    };
  } catch {
    return null;
  }
}

function detectMetal(): HardwareInfo | null {
  if (process.platform !== 'darwin') return null;
  
  try {
    const output = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf-8' });
    const isAppleSilicon = output.toLowerCase().includes('apple');
    
    if (!isAppleSilicon) return null;

    const memory = execSync('sysctl -n hw.memsize', { encoding: 'utf-8' });
    const cores = execSync('sysctl -n hw.ncpu', { encoding: 'utf-8' });

    return {
      type: 'metal',
      name: 'Apple Silicon (Neural Engine)',
      memory: parseInt(memory) / (1024 * 1024 * 1024),
      cores: parseInt(cores),
      supportsGpu: true,
    };
  } catch {
    return null;
  }
}

function detectCpu(): HardwareInfo {
  try {
    const cores = execSync('getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4', { encoding: 'utf-8' });
    const memory = execSync('getconf _PHYS_PAGES 2>/dev/null && getconf _SC_PAGESIZE 2>/dev/null', { encoding: 'utf-8' });
    
    const [pages, pageSize] = memory.trim().split('\n');
    const totalMemory = (parseInt(pages) * parseInt(pageSize)) / (1024 * 1024 * 1024);

    return {
      type: 'cpu',
      name: 'CPU (Fallback)',
      memory: Math.round(totalMemory * 100) / 100,
      cores: parseInt(cores.trim()) || 4,
      supportsGpu: false,
    };
  } catch {
    return {
      type: 'cpu',
      name: 'CPU',
      memory: 8,
      cores: 4,
      supportsGpu: false,
    };
  }
}

export async function detectHardware(): Promise<HardwareInfo> {
  return detectCuda() ?? detectMetal() ?? detectCpu();
}

function checkTool(name: string): boolean {
  try {
    which.sync(name);
    return true;
  } catch {
    return false;
  }
}

function findModels(): string[] {
  const modelDirs = [
    join(homedir(), '.localscript', 'models'),
    join(homedir(), '.ollama', 'models'),
    join(homedir(), '.cache', 'llama.cpp'),
  ];

  const models: string[] = [];
  
  for (const dir of modelDirs) {
    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.gguf') || f.endsWith('.bin'));
      models.push(...files.map(f => join(dir, f)));
    } catch {
      // Directory doesn't exist
    }
  }

  return models;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const hardware = await detectHardware();
  
  return {
    hardware,
    hasLua: checkTool('lua') || checkTool('lua5.1') || checkTool('lua5.3') || checkTool('luajit'),
    hasLuac: checkTool('luac'),
    hasLuacheck: checkTool('luacheck'),
    hasLlamaCpp: checkTool('llama-cli') || checkTool('llama'),
    hasOllama: checkTool('ollama'),
    availableModels: findModels(),
  };
}

export function printHardwareInfo(info: HardwareInfo): void {
  const typeLabels = {
    cuda: '🎮 CUDA GPU',
    metal: '🍎 Apple Metal',
    cpu: '💻 CPU',
  };
  
  console.log(`  Type: ${typeLabels[info.type]}`);
  console.log(`  Device: ${info.name}`);
  console.log(`  Memory: ${info.memory.toFixed(1)} GB`);
  console.log(`  Cores: ${info.cores}`);
  console.log(`  GPU Support: ${info.supportsGpu ? '✓' : '✗'}`);
}