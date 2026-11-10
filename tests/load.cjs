// Loads the browser-global source files into Node for testing.
const fs = require('fs'), path = require('path');
globalThis.MX = {};
['data-trees.js', 'data-quests.js', 'data-gym.js', 'engine.js', 'planner.js'].forEach(f => {
  (0, eval)(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'));
});
module.exports = globalThis.MX;
