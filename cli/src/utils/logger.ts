import chalk from 'chalk';

class Logger {
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  }

  code(code: string, language = 'lua'): void {
    console.log('\n' + chalk.gray('```' + language));
    console.log(code);
    console.log(chalk.gray('```') + '\n');
  }

  box(title: string, content: string): void {
    const lines = content.split('\n');
    const width = Math.max(...lines.map(l => l.length), title.length) + 4;
    
    console.log(chalk.gray('┌' + '─'.repeat(width - 2) + '┐'));
    console.log(chalk.gray('│') + ' '.repeat(Math.floor((width - title.length - 3) / 2)) + chalk.bold(title) + ' '.repeat(width - title.length - 3 - Math.floor((width - title.length - 3) / 2)) + chalk.gray('│'));
    console.log(chalk.gray('├' + '─'.repeat(width - 2) + '┤'));
    
    for (const line of lines) {
      console.log(chalk.gray('│') + ' ' + line + ' '.repeat(width - line.length - 3) + chalk.gray('│'));
    }
    
    console.log(chalk.gray('└' + '─'.repeat(width - 2) + '┘'));
  }

  section(title: string): void {
    console.log('\n' + chalk.bold.cyan('━━━ ' + title + ' ━━━') + '\n');
  }

  prompt(text: string): string {
    return chalk.green('localScript') + chalk.gray(' > ') + text;
  }
}

export const logger = new Logger();