import express from 'express';
import { SqlUtil } from './sql/SqlUtil';

const sqlUtil = new SqlUtil();

export function startServer() {
  const app = express();
  
  app.use(express.json());

  app.post('/query', handlePostQuery);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

async function handlePostQuery(req: express.Request, res: express.Response) {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query not provided' });
  }

  try {
    const result = await sqlUtil.parseQuery(query);
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}