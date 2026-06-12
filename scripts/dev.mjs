import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';

const rootDir = process.cwd();
const isWindows = process.platform === 'win32';
const pythonPath = path.join(rootDir, 'backend', '.venv', 'Scripts', isWindows ? 'python.exe' : 'python');

const children = [];
let shuttingDown = false;

function quoteWindowsArg(value) {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

function startProcess(name, command, args, options = {}) {
  const windowsCommand = isWindows
    ? {
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', `${[command, ...args].map(quoteWindowsArg).join(' ')}`],
      }
    : { command, args };

  const child = spawn(windowsCommand.command, windowsCommand.args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  child.on('exit', (code, signal) => {
    if (!shuttingDown && code && code !== 0) {
      console.error(`\n[${name}] exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`);
      shutdown(code);
    }
  });

  child.on('error', (error) => {
    console.error(`\n[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting frontend + backend dev servers...');
console.log(`Backend Python: ${pythonPath}`);

startProcess('backend', pythonPath, [
  '-m',
  'uvicorn',
  'backend.main:app',
  '--host',
  '127.0.0.1',
  '--port',
  '8000',
]);

startProcess('frontend', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:frontend']);
