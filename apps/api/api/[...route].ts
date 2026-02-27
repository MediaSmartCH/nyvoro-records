import { createApp } from '../src/app.js';

// Vercel Node Functions can directly use an Express app as the request handler.
const { app } = createApp();

export default app;
