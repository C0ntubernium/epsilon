import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

export interface SandboxConfig {
  allowedPaths: string[];
  allowRead?: boolean;
  allowWrite?: boolean;
  allowDelete?: boolean;
  requireApproval?: boolean;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'list';
  path: string;
  content?: string;
}

export class FileSandbox {
  private config: SandboxConfig;
  private operationLog: FileOperation[] = [];
  private approvalCallback?: (op: FileOperation) => Promise<boolean>;

  constructor(config: SandboxConfig) {
    this.config = {
      allowRead: true,
      allowWrite: true,
      allowDelete: false,
      requireApproval: true,
      ...config,
    };
  }

  setApprovalCallback(callback: (op: FileOperation) => Promise<boolean>): void {
    this.approvalCallback = callback;
  }

  private isPathAllowed(targetPath: string): boolean {
    const resolved = resolve(targetPath);
    
    for (const allowed of this.config.allowedPaths) {
      const allowedResolved = resolve(allowed);
      if (resolved.startsWith(allowedResolved) || resolved === allowedResolved) {
        return true;
      }
    }
    
    return false;
  }

  private async checkApproval(op: FileOperation): Promise<boolean> {
    if (!this.config.requireApproval) {
      return true;
    }
    
    if (this.approvalCallback) {
      return this.approvalCallback(op);
    }
    
    return true;
  }

  async read(path: string): Promise<string | null> {
    if (!this.config.allowRead) {
      throw new Error('Read operations disabled');
    }

    if (!this.isPathAllowed(path)) {
      throw new Error(`Path not allowed: ${path}`);
    }

    const op: FileOperation = { type: 'read', path };
    
    if (!(await this.checkApproval(op))) {
      throw new Error('Operation denied by user');
    }

    this.operationLog.push(op);
    return readFileSync(path, 'utf-8');
  }

  async write(path: string, content: string): Promise<void> {
    if (!this.config.allowWrite) {
      throw new Error('Write operations disabled');
    }

    if (!this.isPathAllowed(path)) {
      throw new Error(`Path not allowed: ${path}`);
    }

    const op: FileOperation = { type: 'write', path, content };
    
    if (!(await this.checkApproval(op))) {
      throw new Error('Operation denied by user');
    }

    this.operationLog.push(op);
    
    const dir = join(path, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(path, content);
  }

  async delete(path: string): Promise<void> {
    if (!this.config.allowDelete) {
      throw new Error('Delete operations disabled');
    }

    if (!this.isPathAllowed(path)) {
      throw new Error(`Path not allowed: ${path}`);
    }

    const op: FileOperation = { type: 'delete', path };
    
    if (!(await this.checkApproval(op))) {
      throw new Error('Operation denied by user');
    }

    this.operationLog.push(op);
    rmSync(path, { recursive: true });
  }

  async list(path: string): Promise<string[]> {
    if (!this.config.allowRead) {
      throw new Error('Read operations disabled');
    }

    if (!this.isPathAllowed(path)) {
      throw new Error(`Path not allowed: ${path}`);
    }

    const op: FileOperation = { type: 'list', path };
    this.operationLog.push(op);
    
    return readdirSync(path);
  }

  getOperationLog(): FileOperation[] {
    return [...this.operationLog];
  }

  clearLog(): void {
    this.operationLog = [];
  }
}

export function createDefaultSandbox(projectDir: string): FileSandbox {
  return new FileSandbox({
    allowedPaths: [projectDir, join(homedir(), '.localscript')],
    allowRead: true,
    allowWrite: true,
    allowDelete: false,
    requireApproval: true,
  });
}