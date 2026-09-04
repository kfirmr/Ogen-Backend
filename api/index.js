// Vercel Node.js function entry. Plain CommonJS on purpose: it requires the already-compiled
// `dist/serverless.js` (built by `nest build` via the project's own path-alias resolution),
// so Vercel's function bundler never needs to resolve the TypeScript path aliases itself.
let cachedAppPromise;

module.exports = async (req, res) => {
  if (cachedAppPromise == null) {
    cachedAppPromise = require('../dist/serverless.js').createServerlessApp();
  }

  const app = await cachedAppPromise;

  return app(req, res);
};
