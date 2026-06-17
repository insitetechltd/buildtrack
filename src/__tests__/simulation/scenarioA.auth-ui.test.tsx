import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { createSimDriver } from '@/test-utils/simulation/simDriver';

const mockLogin = jest.fn(async (_username: string, _password: string) => true);

function LoginHarness() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View>
      <TextInput testID="login-emailOrPhone" value={username} onChangeText={setUsername} />
      <TextInput testID="login-password" value={password} onChangeText={setPassword} />
      <Pressable testID="login-submit" onPress={() => mockLogin(username, password)} />
    </View>
  );
}

describe('Scenario A (UI): Authentication input flow', () => {
  beforeEach(() => {
    mockLogin.mockClear();
  });

  it('types credentials and triggers login', async () => {
    const screen = render(<LoginHarness />);
    const driver = createSimDriver(screen);

    driver.typeText('login-emailOrPhone', 'user@example.com');
    driver.typeText('login-password', 'secret123');
    driver.tap('login-submit');

    expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123');
  });
});
