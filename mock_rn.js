const fs = require('fs');
let code = fs.readFileSync('src/__tests__/integration/CreateTaskScreen.test.tsx', 'utf8');

// Remove my bad react-native mock
code = code.replace(/jest\.mock\('react-native', \(\) => {[\s\S]*?\}\);/, '');

// Mock the React Native Modal by mocking react-native explicitly but only returning the required stuff, or just mock `react-native` carefully.
// Wait, if Modal is undefined, what if I just use a regular View?
// Let's just mock it like this:
code = "jest.mock('react-native', () => {\n  const rn = jest.requireActual('react-native');\n  rn.Modal = rn.View;\n  return rn;\n});\n" + code;

fs.writeFileSync('src/__tests__/integration/CreateTaskScreen.test.tsx', code);
