import readline from 'readline';
import { SqlUtil } from '../sql/SqlUtil';

export function startCli() {
  const sqlUtil = new SqlUtil();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function prompt() {
    rl.question('', (query) => {
      // Skip processing if the user presses ENTER without typing anything
      if (query.trim() === '') {
        prompt();  // Just reprompt without processing the empty query
        return;
      }

      sqlUtil.parseQuery(query);
      prompt();  // Continue prompting after the query is processed
    });
  }

  console.log('Welcome to paddock-db, Insert your queries:');
  prompt();
}