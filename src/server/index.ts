import express from 'express';
import cors from 'cors';
import SqlUtil from '../sql/SqlUtil';

const sqlUtil = new SqlUtil();

const BACKEND_PORT = process.env.BACKEND_PORT || 3000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 5173;
const MOCK_RESPONSE_DELAY = process.env.MOCK_RESPONSE_DELAY || true;

export function startServer() {
  const app = express();

  app.use(cors({
    origin: `http://localhost:${FRONTEND_PORT}`,
    methods: ['POST'],
    allowedHeaders: ['Content-Type'],
  }));
  
  app.use(express.json());

  app.post('/query', handlePostQuery);

  app.listen(BACKEND_PORT, () => {
    console.log(`Server is running on port ${BACKEND_PORT}`);
  });
}

async function handlePostQuery(req: express.Request, res: express.Response) {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query not provided' });
  }

  try {
    const result = await sqlUtil.parseQuery(query);
    if (MOCK_RESPONSE_DELAY) {
      await mockResponseDelay();
    }
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

function mockResponseDelay() {
  const randomDelay = Math.floor(Math.random() * 400) + 400;

  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, randomDelay);
  });
}