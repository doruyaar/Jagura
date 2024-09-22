import { startCli } from './cli';
import { startServer } from './server';

const mode = process.env.MODE || 'CLI';

run();

function run() {
  if (mode === 'CLI') {
    startCli();
  } else if (mode === 'API') {
    startServer();
  } else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
}