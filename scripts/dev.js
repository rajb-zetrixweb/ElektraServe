import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const services = [startService('API', 'backend'), startService('WEB', 'frontend')];
let stopping = false;

function startService(label, directory) {
  const child = spawn(npmCommand, ['start'], {
    cwd: new URL(`../${directory}/`, import.meta.url),
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });
  child.stdout.on('data', (chunk) => writeWithPrefix(process.stdout, label, chunk));
  child.stderr.on('data', (chunk) => writeWithPrefix(process.stderr, label, chunk));
  child.on('exit', (code, signal) => {
    if (stopping) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[${label}] stopped with ${reason}; stopping all services.`);
    shutdown(code || 1);
  });
  return child;
}

function writeWithPrefix(stream, label, chunk) {
  const lines = chunk.toString().split(/(?<=\n)/);
  for (const line of lines) {
    if (line) stream.write(`[${label}] ${line}`);
  }
}

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const service of services) {
    if (!service.killed) service.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 500).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
