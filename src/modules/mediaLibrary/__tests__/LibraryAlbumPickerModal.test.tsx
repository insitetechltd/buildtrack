import React, { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LibraryAlbumPickerSheet } from "../LibraryAlbumPickerModal";
import {
  ALL_PHOTOS_ALBUM_ID,
  RECENTS_ALBUM_TITLE,
} from "../libraryAlbumConstants";

const albums = [
  { id: ALL_PHOTOS_ALBUM_ID, title: RECENTS_ALBUM_TITLE, assetCount: 0 },
  { id: "shots", title: "Screenshots", assetCount: 8 },
  { id: "site", title: "Site A — Level 12", assetCount: 40 },
];

function wrap(ui: React.ReactElement) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      {ui}
    </SafeAreaProvider>
  );
}

function Harness({
  onSelect = jest.fn(),
}: {
  onSelect?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <LibraryAlbumPickerSheet
      albums={albums}
      selectedAlbumId={ALL_PHOTOS_ALBUM_ID}
      onClose={jest.fn()}
      onSelectAlbum={onSelect}
      testIdPrefix="capture-session"
      query={query}
      onQueryChange={setQuery}
    />
  );
}

describe("LibraryAlbumPickerSheet", () => {
  it("filters the list from the search field and keeps Recents as the default label", () => {
    const onSelect = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      wrap(<Harness onSelect={onSelect} />),
    );

    expect(getByText(RECENTS_ALBUM_TITLE)).toBeTruthy();
    expect(getByText("Screenshots")).toBeTruthy();

    fireEvent.changeText(getByTestId("capture-session__album_search"), "level");
    expect(queryByText("Screenshots")).toBeNull();
    expect(getByText("Site A — Level 12")).toBeTruthy();

    fireEvent.press(getByText("Site A — Level 12"));
    expect(onSelect).toHaveBeenCalledWith("site");
  });

  it("shows an empty state when nothing matches", () => {
    const { getByTestId, getByText } = render(wrap(<Harness />));
    fireEvent.changeText(getByTestId("capture-session__album_search"), "zzzz");
    expect(getByText("No matching albums")).toBeTruthy();
  });
});
