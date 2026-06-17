import React, { useCallback, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import { createSimDriver } from '@/test-utils/simulation/simDriver';

const mockShowPhotoSelectionDialog = jest.fn(async () => {});

function CreateTaskHarness() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const save = useCallback(
    async (next: { title: string; description: string; priority: string }) => {
      await AsyncStorage.setItem('@createTask_formData', JSON.stringify(next));
    },
    [],
  );

  return (
    <View>
      <TextInput
        testID="createTask-title"
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          setTimeout(() => {
            save({ title: text, description, priority });
          }, 500);
        }}
      />
      <TextInput
        testID="createTask-description"
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          setTimeout(() => {
            save({ title, description: text, priority });
          }, 500);
        }}
      />
      <Pressable testID="createTask-priority-open" />
      <Pressable
        testID="createTask-priority-high"
        onPress={async () => {
          setPriority('high');
          await save({ title, description, priority: 'high' });
        }}
      />
      <Pressable
        testID="createTask-add-photos"
        onPress={async () => {
          await save({ title, description, priority });
          await mockShowPhotoSelectionDialog();
        }}
      />
    </View>
  );
}

describe('Scenario B (UI): Create Task form persistence', () => {
  beforeEach(() => {
    (AsyncStorage.setItem as jest.Mock).mockClear();
    mockShowPhotoSelectionDialog.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caches form fields and triggers photo attach flow', async () => {
    const screen = render(<CreateTaskHarness />);
    const driver = createSimDriver(screen);

    driver.typeText('createTask-title', 'Fix leak in ceiling');
    driver.typeText('createTask-description', 'Water damage near hallway, bring ladder');

    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });

    driver.tap('createTask-priority-open');
    driver.tap('createTask-priority-high');

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      driver.attachImage('createTask-add-photos');
      await Promise.resolve();
    });

    expect(mockShowPhotoSelectionDialog).toHaveBeenCalled();

    const formCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
      (call) => call[0] === '@createTask_formData',
    );
    expect(formCalls.length).toBeGreaterThan(0);

    const lastSavedForm = JSON.parse(formCalls[formCalls.length - 1][1]);
    expect(lastSavedForm.title).toBe('Fix leak in ceiling');
    expect(lastSavedForm.description).toBe('Water damage near hallway, bring ladder');
    expect(lastSavedForm.priority).toBe('high');
  });
});
