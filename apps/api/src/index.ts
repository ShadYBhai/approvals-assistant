
import { createApp } from './app';


const placeholderLlm = {
  completeJson: async () => {
    throw new Error('LLM not configured');
  },
  stream: async function* () {
    throw new Error('LLM not configured');
  },
};

const port = process.env.PORT ?? 3001;
const app = createApp({ llm: placeholderLlm });

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
