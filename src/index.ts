import readline from 'readline';
import { SQLEngine } from './sql/sqlEngine';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const sqlEngine = new SQLEngine();

function prompt() {
  rl.question('', (query) => {
    // Skip processing if the user presses ENTER without typing anything
    if (query.trim() === '') {
      prompt();  // Just reprompt without processing the empty query
      return;
    }

    // Process the query if it's not empty
    sqlEngine.parseQuery(query);
    prompt();  // Continue prompting after the query is processed
  });
}

// Show welcome message only once
console.log('Welcome to paddock-db, Insert your queries:');
prompt();  // Start listening for queries
