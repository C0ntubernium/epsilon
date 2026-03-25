import { execa } from 'execa';
import which from 'which';
import { readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface ValidationError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  output: string;
}

export async function validateSyntax(code: string, _luaVersion = '5.4'): Promise<ValidationResult> {
  try {
    which.sync('luac');
  } catch {
    return {
      valid: false,
      errors: [{
        message: 'luac not found. Install Lua: https://www.lua.org/download.html',
        severity: 'error',
      }],
      output: '',
    };
  }

  const tempFile = join(tmpdir(), `localscript_${randomUUID()}.lua`);
  
  try {
    await execa('luac', ['-', '-o', '/dev/null'], {
      input: code,
      reject: false,
    });

    return {
      valid: true,
      errors: [],
      output: 'Syntax OK',
    };
  } catch (error: any) {
    return parseLuacOutput(error.stderr || error.stdout || '', code);
  } finally {
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function parseLuacOutput(output: string, _code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    const match = line.match(/luac: (.*?):(\d+): (.+)/);
    if (match) {
      const [, , lineNum, message] = match;
      errors.push({
        line: parseInt(lineNum),
        message: message.trim(),
        severity: 'error',
      });
    } else if (line.includes(':')) {
      errors.push({
        message: line.trim(),
        severity: 'error',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    output,
  };
}

export async function validateFile(filePath: string, luaVersion = '5.4'): Promise<ValidationResult> {
  if (!existsSync(filePath)) {
    return {
      valid: false,
      errors: [{ message: `File not found: ${filePath}`, severity: 'error' }],
      output: '',
    };
  }

  const code = readFileSync(filePath, 'utf-8');
  return validateSyntax(code, luaVersion);
}

export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return '✓ No syntax errors';
  }

  const lines = ['✗ Syntax errors found:', ''];
  
  for (const error of result.errors) {
    lines.push(`  ${error.line ? `Line ${error.line}: ` : ''}${error.message}`);
  }

  return lines.join('\n');
}