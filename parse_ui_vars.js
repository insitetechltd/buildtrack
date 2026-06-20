const fs = require('fs');

const lines = fs.readFileSync('src/screens/CreateTaskScreen.tsx', 'utf8').split('\n');

// The UI code is from 1582 to 3016
const uiCode = lines.slice(1581, 3016).join('\n');

// Find all used variables that look like state/functions.
console.log('UI Code length:', uiCode.length);
