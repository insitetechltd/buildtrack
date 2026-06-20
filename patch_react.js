const fs = require('fs');
const testPath = 'src/__tests__/integration/CreateTaskScreen.test.tsx';
let code = fs.readFileSync(testPath, 'utf8');

const patch = `
jest.mock('react/jsx-runtime', () => {
  const original = jest.requireActual('react/jsx-runtime');
  return {
    ...original,
    jsx: (type, ...args) => {
      if (type === undefined) console.error('UNDEFINED JSX ELEMENT DETECTED!', args);
      return original.jsx(type, ...args);
    },
    jsxs: (type, ...args) => {
      if (type === undefined) console.error('UNDEFINED JSXS ELEMENT DETECTED!', args);
      return original.jsxs(type, ...args);
    }
  };
});
`;

if (!code.includes('jsx-runtime')) {
    code = patch + '\n' + code;
    fs.writeFileSync(testPath, code);
}
