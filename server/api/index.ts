import { buildApp } from "../src/compositionRoot.js";

// Vercel runs this file as a serverless function. An Express app is a valid (request, response)
// handler, and server/vercel.json rewrites every path to this function.
export default buildApp();
