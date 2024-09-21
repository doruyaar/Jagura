import { SQLEngine } from './sql/sqlEngine';
import { startCli } from './cli';
import { startServer } from './server';

const mode = process.env.MODE || 'CLI';
const sqlEngine = new SQLEngine();

if (mode === 'CLI') {
  startCli(sqlEngine);
} else if (mode === 'API') {
  startServer(sqlEngine);
} else {
  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}