const fs = require('fs');
const content = fs.readFileSync('src/screens/CreateTaskScreen.tsx', 'utf8');

// Print all uppercase imports
const imports = content.match(/import\s+({[^}]+}|\w+)\s+from\s+['"][^'"]+['"]/g) || [];
console.log(imports);

