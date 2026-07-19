const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Trading Journal Application...');

const runCommand = (cmd, args, cwd, label) => {
  // Use shell: true to support npm on Windows
  const process = spawn(cmd, args, { cwd, shell: true });

  process.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.log(`[${label}] ${line}`));
  });

  process.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.error(`[${label}] [ERROR] ${line}`));
  });

  process.on('close', (code) => {
    console.log(`[${label}] Exited with code ${code}`);
  });

  return process;
};

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

const backendProcess = runCommand('C:\\Python314\\python.exe', ['-u', 'server.py'], backendDir, 'Backend');
const frontendProcess = runCommand('npm', ['run', 'dev'], frontendDir, 'Frontend');

// Handle process termination cleanly
const cleanExit = () => {
  console.log('\nStopping all services...');
  backendProcess.kill();
  frontendProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('exit', cleanExit);
