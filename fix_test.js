const fs = require('fs');
let code = fs.readFileSync('src/__tests__/integration/CreateTaskScreen.test.tsx', 'utf8');

// remove my bad react-native mock
code = code.replace(/jest\.mock\('react-native', \(\) => {[\s\S]*?\}\);\n/, '');

// Add jest.mock('react-native/Libraries/Modal/Modal')
code = "jest.mock('react-native/Libraries/Modal/Modal', () => {\n  const { View } = require('react-native');\n  return (props) => <View {...props} testID=\"MockModal\" />;\n});\n" + code;

fs.writeFileSync('src/__tests__/integration/CreateTaskScreen.test.tsx', code);
