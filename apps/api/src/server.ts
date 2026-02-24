import { createApp } from './app.js';
import { appConfig } from './config.js';

const { app } = createApp();

app.listen(appConfig.port, () => {
  console.log(`[api] Nyvoro API listening on port ${appConfig.port}`);
});
