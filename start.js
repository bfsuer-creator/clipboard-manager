// Launcher script that handles ELECTRON_RUN_AS_NODE properly
const { spawn } = require('child_process');
const path = require('path');

const electronPath = require('electron');
const projectPath = path.resolve(__dirname);

// Remove ELECTRON_RUN_AS_NODE from environment
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [projectPath], {
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code);
});
