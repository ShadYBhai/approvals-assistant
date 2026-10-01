import 'dotenv/config';
import { createApp } from './app';
import { createLlmClient } from './services/llm';

const port = process.env.PORT ?? 3001;
const app = createApp({ llm: createLlmClient() });

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
