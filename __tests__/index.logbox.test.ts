const mockIgnoreLogs = jest.fn();
const mockRegisterRootComponent = jest.fn();

jest.mock("../src/utils/errorUtilsShim", () => ({}));
jest.mock("../global.css", () => ({}), { virtual: true });
jest.mock("react-native-get-random-values", () => ({}));
jest.mock("../App", () => "App");

jest.mock("react-native", () => ({
  LogBox: {
    ignoreLogs: mockIgnoreLogs,
  },
}));

jest.mock("expo", () => ({
  registerRootComponent: mockRegisterRootComponent,
}));

describe("index LogBox bootstrap", () => {
  beforeEach(() => {
    jest.resetModules();
    mockIgnoreLogs.mockClear();
    mockRegisterRootComponent.mockClear();
  });

  it("suppresses the recurring dev-overlay warnings used by observed Maestro flows", () => {
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    require("../index");

    expect(mockIgnoreLogs).toHaveBeenCalledWith(
      expect.arrayContaining([
        "SafeAreaView has been deprecated",
        "The app is running using the Legacy Architecture",
        "Ignoring DevTools app debug target",
        "Failed to open debugger. Please check that the dev server is running and reload the app.",
      ]),
    );
    expect(mockRegisterRootComponent).toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });
});
