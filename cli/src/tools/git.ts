import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';

export interface GitStatus {
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

export interface CommitMessage {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  message: string;
  body?: string;
  breaking?: boolean;
}

export async function getGitStatus(dir?: string): Promise<GitStatus> {
  const gitDir = dir || process.cwd();
  
  if (!existsSync(join(gitDir, '.git'))) {
    throw new Error('Not a git repository');
  }

  try {
    const { stdout: stagedOutput } = await execa('git', ['diff', '--cached', '--name-only'], { cwd: gitDir });
    const { stdout: modifiedOutput } = await execa('git', ['diff', '--name-only'], { cwd: gitDir });
    const { stdout: untrackedOutput } = await execa('git', ['ls-files', '--others', '--exclude-standard'], { cwd: gitDir });
    const { stdout: deletedOutput } = await execa('git', ['diff', '--name-only', '--diff-filter=D'], { cwd: gitDir });

    return {
      staged: stagedOutput.split('\n').filter(f => f.endsWith('.lua')),
      modified: modifiedOutput.split('\n').filter(f => f.endsWith('.lua')),
      untracked: untrackedOutput.split('\n').filter(f => f.endsWith('.lua')),
      deleted: deletedOutput.split('\n').filter(f => f.endsWith('.lua')),
    };
  } catch (error) {
    return { staged: [], modified: [], untracked: [], deleted: [] };
  }
}

export async function getStagedChanges(dir?: string): Promise<string> {
  const gitDir = dir || process.cwd();
  
  try {
    const { stdout } = await execa('git', ['diff', '--cached'], { cwd: gitDir });
    return stdout;
  } catch {
    return '';
  }
}

export function generateCommitMessage(status: GitStatus): CommitMessage {
  const hasTests = status.staged.some(f => f.includes('test') || f.includes('spec'));
  const hasDocs = status.staged.some(f => f.endsWith('.md'));
  const hasConfig = status.staged.some(f => f.endsWith('.json') || f.endsWith('.yaml'));
  
  let type: CommitMessage['type'] = 'feat';
  let message = 'update';
  
  if (status.staged.length === 0) {
    message = 'no changes';
  } else if (hasDocs) {
    type = 'docs';
    message = 'update documentation';
  } else if (hasConfig) {
    type = 'chore';
    message = 'update configuration';
  } else if (hasTests) {
    type = 'test';
    message = 'add tests';
  } else {
    const luaFiles = status.staged.filter(f => f.endsWith('.lua'));
    if (luaFiles.length > 0) {
      message = `update ${luaFiles.length} Lua file(s)`;
    }
  }

  return {
    type,
    message,
    body: `Changes:\n${status.staged.map(f => `- ${f}`).join('\n')}`,
  };
}

export function formatCommitMessage(commit: CommitMessage): string {
  let msg = `${commit.type}`;
  
  if (commit.scope) {
    msg += `(${commit.scope})`;
  }
  
  msg += `: ${commit.message}`;
  
  if (commit.breaking) {
    msg += '\n\nBREAKING CHANGE: ';
  }
  
  if (commit.body) {
    msg += '\n\n' + commit.body;
  }
  
  return msg;
}

export async function createCommit(message: CommitMessage, dir?: string): Promise<void> {
  const gitDir = dir || process.cwd();
  const formatted = formatCommitMessage(message);
  
  await execa('git', ['commit', '-m', formatted], { cwd: gitDir });
}

export async function getCurrentBranch(dir?: string): Promise<string> {
  const gitDir = dir || process.cwd();
  
  try {
    const { stdout } = await execa('git', ['branch', '--show-current'], { cwd: gitDir });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

export async function getRepoInfo(dir?: string): Promise<{ branch: string; remote: string | null; url: string | null }> {
  const gitDir = dir || process.cwd();
  
  const branch = await getCurrentBranch(gitDir);
  
  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin'], { cwd: gitDir });
    const url = stdout.trim();
    return { branch, remote: 'origin', url };
  } catch {
    return { branch, remote: null, url: null };
  }
}

export async function generatePRDescription(status: GitStatus): Promise<string> {
  const lines = [
    '## Summary',
    '',
  ];

  if (status.staged.length > 0) {
    lines.push('- ' + status.staged.map(f => `\`${f}\``).join(', '));
  }

  lines.push('', '## Changes', '');
  
  for (const file of status.staged) {
    lines.push(`- ${file}`);
  }

  return lines.join('\n');
}