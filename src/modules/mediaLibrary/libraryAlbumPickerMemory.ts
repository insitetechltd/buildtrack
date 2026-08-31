import {
  ALL_PHOTOS_ALBUM_ID,
  type LibraryAlbumChoice,
} from "./libraryAlbumConstants";

let rememberedAlbumId = ALL_PHOTOS_ALBUM_ID;
let rememberedAlbums: LibraryAlbumChoice[] | null = null;

export function peekRememberedAlbumId(): string {
  return rememberedAlbumId;
}

export function rememberAlbumId(albumId: string): void {
  rememberedAlbumId = albumId || ALL_PHOTOS_ALBUM_ID;
}

export function peekRememberedAlbums(): LibraryAlbumChoice[] | null {
  return rememberedAlbums;
}

export function rememberAlbums(albums: LibraryAlbumChoice[]): void {
  if (albums.length === 0) {
    return;
  }
  rememberedAlbums = albums;
}

export function resetLibraryAlbumPickerMemory(): void {
  rememberedAlbumId = ALL_PHOTOS_ALBUM_ID;
  rememberedAlbums = null;
}
