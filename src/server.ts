import express from 'express';
import { SQLEngine } from './sql/sqlEngine';

export function startServer(sqlEngine: SQLEngine) {
  const app = express();

  app.use(express.json());

  app.post('/query', (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query not provided' });
    }

    try {
      const result = sqlEngine.parseQuery(query);
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}