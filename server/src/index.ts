import { buildApp } from "./compositionRoot.js";
import { loadConfig } from "./config.js";

// Local entry point (`npm run dev` / `npm start`). On Vercel, api/index.ts is used instead.
const config = loadConfig();

buildApp(config).listen(config.PORT, () => {
  console.log(`jobtrack API listening on http://localhost:${config.PORT}`);
});
