import type { RenderAPI } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';

export type SimDriver = {
  typeText: (testId: string, text: string) => void;
  tap: (testId: string) => void;
  scrollTo: (listTestId: string, y: number) => void;
  attachImage: (triggerTestId: string) => void;
};

export function createSimDriver(screen: RenderAPI): SimDriver {
  return {
    typeText: (testId, text) => {
      fireEvent.changeText(screen.getByTestId(testId), text);
    },
    tap: (testId) => {
      fireEvent.press(screen.getByTestId(testId));
    },
    scrollTo: (listTestId, y) => {
      fireEvent.scroll(screen.getByTestId(listTestId), {
        nativeEvent: { contentOffset: { y } },
      });
    },
    attachImage: (triggerTestId) => {
      fireEvent.press(screen.getByTestId(triggerTestId));
    },
  };
}

