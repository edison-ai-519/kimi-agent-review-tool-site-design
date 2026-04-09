import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const childProcesses = [];
let shuttingDown = false;

function spawnProcess(label, args, extraEnv = {}) {
  const child = spawn(npmCommand, args, {
    cwd: appRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...extraEnv
    }
  });

  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const processRef of childProcesses) {
      if (processRef.pid && processRef.pid !== child.pid) {
        processRef.kill();
      }
    }

    process.exit(code ?? 0);
  });

  childProcesses.push(child);
  console.log(`[dev] started ${label}`);
  return child;
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of childProcesses) {
    if (child.pid) {
      child.kill();
    }
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

spawnProcess('api', ['run', 'dev:server'], {
  API_HOST: '127.0.0.1',
  API_PORT: '8787'
});

spawnProcess('client', ['run', 'dev:client', '--', '--host', '127.0.0.1'], {
  VITE_API_BASE_URL: 'http://127.0.0.1:8787'
});
