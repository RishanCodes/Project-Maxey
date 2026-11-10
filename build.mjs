// Bundles src/ into a single self-contained artifact page: dist/index.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const r = (f) => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const lib = ['data-trees.js', 'data-quests.js', 'data-gym.js', 'engine.js', 'store.js'].map(r).join('\n');
const ui = ['ui-a.js', 'ui-b.js', 'ui-c.js'].map(r).join('\n');
const html = `<title>Project Maxey: Ascension</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Basketball player-development RPG: smart scheduling, skill quests, weight-room training, evidence-based skill trees and game-transfer tracking.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&display=swap">
<style>
${r('styles.css')}
</style>
<div id="app"></div>
<script>
${lib}
(function () {
'use strict';
${ui}
})();
</script>
`;
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
console.log('dist/index.html', (html.length / 1024).toFixed(1) + ' KB');
