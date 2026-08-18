// Compatibility wrapper for older Render/Vercel start commands.
// All backend models, routes, auth, launch APIs and seeding now live in server.js.
const { startApplication } = require("./server");

startApplication().catch((error) => {
  console.error(error);
  process.exit(1);
});
