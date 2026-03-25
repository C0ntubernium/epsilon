import type { ValidationError, ValidationResult } from './syntax.js';

export interface SecurityPattern {
  pattern: RegExp;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion?: string;
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  {
    pattern: /\bos\.execute\s*\(/,
    message: 'os.execute allows arbitrary command execution',
    severity: 'critical',
    suggestion: 'Use spawn with sanitized arguments or a safe subprocess library',
  },
  {
    pattern: /\bos\.remove\s*\(/,
    message: 'os.remove can delete arbitrary files',
    severity: 'high',
    suggestion: 'Validate path is within allowed directory',
  },
  {
    pattern: /\bos\.rename\s*\(/,
    message: 'os.rename can move files arbitrarily',
    severity: 'high',
    suggestion: 'Validate source and destination paths',
  },
  {
    pattern: /\bos\.exit\s*\(/,
    message: 'os.exit terminates the process',
    severity: 'medium',
    suggestion: 'Use error() or return error codes instead',
  },
  {
    pattern: /\bio\.popen\s*\(/,
    message: 'io.popen executes shell commands',
    severity: 'critical',
    suggestion: 'Use a safe subprocess library instead',
  },
  {
    pattern: /\bio\.write\s*\(/,
    message: 'io.write can write to arbitrary files',
    severity: 'high',
    suggestion: 'Use safe file handling with path validation',
  },
  {
    pattern: /\bdebug\.getregistry\s*\(/,
    message: 'debug library exposes internal state',
    severity: 'medium',
    suggestion: 'Remove debug usage in production',
  },
  {
    pattern: /\bdebug\.setmetatable\s*\(/,
    message: 'debug.setmetatable can bypass encapsulation',
    severity: 'medium',
  },
  {
    pattern: /\b(loadstring|load|loadfile)\s*\(/,
    message: 'Dynamic code execution is dangerous',
    severity: 'critical',
    suggestion: 'Use safe parsing or precompiled code',
  },
  {
    pattern: /require\s*\(\s*["'].*%\.\./,
    message: 'Path traversal in require',
    severity: 'high',
    suggestion: 'Use absolute module paths',
  },
  {
    pattern: /\brawget\s*\(\s*_G\s*,/,
    message: 'Accessing _G directly can bypass encapsulation',
    severity: 'medium',
  },
  {
    pattern: /\brawset\s*\(\s*_G\s*,/,
    message: 'Setting globals directly is dangerous',
    severity: 'high',
    suggestion: 'Use proper module patterns',
  },
  {
    pattern: /\bsetmetatable\s*\(\s*\{\s*\}\s*,\s*\{[^}]*__gc[^}]*\}/,
    message: 'Finalizer may not run in all Lua versions',
    severity: 'low',
    suggestion: 'Ensure proper cleanup in Lua 5.2+',
  },
];

function severityToValidationSeverity(severity: 'critical' | 'high' | 'medium' | 'low'): 'error' | 'warning' | 'info' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
  }
}

export interface SecurityScanOptions {
  patterns?: SecurityPattern[];
  severityFilter?: ('critical' | 'high' | 'medium' | 'low')[];
}

export function scanSecurity(code: string, options: SecurityScanOptions = {}): ValidationResult {
  const patterns = options.patterns || SECURITY_PATTERNS;
  const filter = options.severityFilter || ['critical', 'high', 'medium', 'low'];
  const errors: ValidationError[] = [];

  const lines = code.split('\n');

  for (const pattern of patterns) {
    if (!filter.includes(pattern.severity)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(pattern.pattern);
      
      if (match) {
        errors.push({
          line: i + 1,
          message: pattern.message,
          severity: severityToValidationSeverity(pattern.severity),
          code: pattern.suggestion,
        });
      }
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    output: '',
  };
}

export function formatSecurityErrors(result: ValidationResult): string {
  if (result.valid) {
    return '✓ No security issues found';
  }

  const grouped = {
    critical: result.errors.filter(e => e.severity === 'error' && e.code),
    warning: result.errors.filter(e => e.severity === 'warning'),
  };

  const lines: string[] = ['🔒 Security scan results:', ''];

  if (grouped.critical.length > 0) {
    lines.push('  Critical/High:');
    for (const err of grouped.critical) {
      lines.push(`    ✗ L${err.line}: ${err.message}`);
      if (err.code) {
        lines.push(`      → ${err.code}`);
      }
    }
    lines.push('');
  }

  if (grouped.warning.length > 0) {
    lines.push('  Medium/Low:');
    for (const err of grouped.warning) {
      lines.push(`    ⚠ L${err.line}: ${err.message}`);
    }
  }

  return lines.join('\n');
}

export const DANGEROUS_PATTERNS = SECURITY_PATTERNS;