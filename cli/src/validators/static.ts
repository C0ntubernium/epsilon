import { execa } from 'execa';
import which from 'which';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { ValidationError, ValidationResult } from './syntax.js';

export interface StaticAnalysisConfig {
  enabled: boolean;
  maxLineLength?: number;
  unusedArgs?: boolean;
  globals?: string[];
}

const DEFAULT_CONFIG: StaticAnalysisConfig = {
  enabled: true,
  maxLineLength: 120,
  unusedArgs: true,
  globals: [],
};

export async function runLuacheck(
  code: string,
  config: StaticAnalysisConfig = DEFAULT_CONFIG
): Promise<ValidationResult> {
  const luacheckPath = which.sync('luacheck', { nothrow: true });
  
  if (!luacheckPath) {
    return {
      valid: true,
      errors: [{
        message: 'luacheck not installed (optional)',
        severity: 'info',
      }],
      output: '',
    };
  }

  const tempFile = join(tmpdir(), `localscript_${randomUUID()}.lua`);
  
  try {
    await writeFile(tempFile, code);
    
    const args = [
      '--formatter', 'plain',
      '--no-color',
    ];

    if (config.maxLineLength) {
      args.push('--max-line-length', String(config.maxLineLength));
    }

    if (!config.unusedArgs) {
      args.push('--no-unused-args');
    }

    for (const global of config.globals || []) {
      args.push('--globals', global);
    }

    args.push(tempFile);

    const { stdout, stderr } = await execa(luacheckPath, args, { reject: false });
    
    return parseLuacheckOutput(stdout + stderr);
  } catch (error: any) {
    return parseLuacheckOutput(error.message);
  } finally {
    try { unlinkSync(tempFile); } catch {}
  }
}

async function writeFile(path: string, content: string): Promise<void> {
  const { writeFileSync } = await import('fs');
  writeFileSync(path, content);
}

function parseLuacheckOutput(output: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim() || line.includes('Checking')) continue;

    const match = line.match(/(\S+\.lua):(\d+):(\d+): (\w+) (.+)/);
    if (match) {
      const [, , lineNum, col, severity, message] = match;
      const sev = severity.startsWith('E') ? 'error' : 
                  severity.startsWith('W') ? 'warning' : 'info';
      
      errors.push({
        line: parseInt(lineNum),
        column: parseInt(col),
        message: message.trim(),
        severity: sev as 'error' | 'warning' | 'info',
      });
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    output,
  };
}

export async function runSelene(code: string): Promise<ValidationResult> {
  const selenePath = which.sync('selene', { nothrow: true });
  
  if (!selenePath) {
    return {
      valid: true,
      errors: [{
        message: 'selene not installed (optional)',
        severity: 'info',
      }],
      output: '',
    };
  }

  const tempFile = join(tmpdir(), `localscript_${randomUUID()}.lua`);
  
  try {
    const { writeFileSync } = await import('fs');
    writeFileSync(tempFile, code);
    
    const { stdout, stderr } = await execa(selenePath, [tempFile], { reject: false });
    return parseSeleneOutput(stdout + stderr);
  } catch (error: any) {
    return parseSeleneOutput(error.message);
  } finally {
    try { unlinkSync(tempFile); } catch {}
  }
}

function parseSeleneOutput(output: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/:(\d+):(\d+): (.+)/);
    if (match) {
      const [, lineNum, col, message] = match;
      errors.push({
        line: parseInt(lineNum),
        column: parseInt(col),
        message: message.trim(),
        severity: 'warning',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    output,
  };
}

export async function runFullStaticAnalysis(
  code: string,
  config: StaticAnalysisConfig = DEFAULT_CONFIG
): Promise<ValidationResult> {
  const [luacheckResult, seleneResult] = await Promise.all([
    runLuacheck(code, config),
    runSelene(code),
  ]);

  const allErrors = [...luacheckResult.errors, ...seleneResult.errors];
  
  return {
    valid: allErrors.filter(e => e.severity === 'error').length === 0,
    errors: allErrors,
    output: `Luacheck: ${luacheckResult.output}\nSelene: ${seleneResult.output}`,
  };
}

const { unlinkSync } = await import('fs');

export function formatStaticErrors(result: ValidationResult): string {
  if (result.valid) {
    return '✓ No static analysis issues';
  }

  const errors = result.errors.filter(e => e.severity !== 'info');
  const lines = [`✗ Found ${errors.length} issue(s):`, ''];
  
  for (const error of errors) {
    const icon = error.severity === 'error' ? '✗' : '⚠';
    lines.push(`  ${icon} ${error.line ? `L${error.line}: ` : ''}${error.message}`);
  }

  return lines.join('\n');
}