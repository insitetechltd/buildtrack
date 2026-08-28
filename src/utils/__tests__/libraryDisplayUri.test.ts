import {
  isSystemLibraryDisplayUri,
  libraryGridDisplayUri,
} from "../libraryDisplayUri";

describe("libraryDisplayUri", () => {
  it("treats ph:// and content:// as system display URIs", () => {
    expect(isSystemLibraryDisplayUri("ph://ABC-DEF")).toBe(true);
    expect(isSystemLibraryDisplayUri("assets-library://asset")).toBe(true);
    expect(isSystemLibraryDisplayUri("content://media/external/images/1")).toBe(true);
    expect(isSystemLibraryDisplayUri("file:///tmp/x.jpg")).toBe(false);
  });

  it("returns asset uri for grid bind", () => {
    expect(libraryGridDisplayUri("ph://asset-1")).toBe("ph://asset-1");
    expect(libraryGridDisplayUri("file:///tmp/x.jpg")).toBe("file:///tmp/x.jpg");
    expect(libraryGridDisplayUri("")).toBeNull();
  });
});
