import ExpoModulesCore
import Photos
import UIKit

/// Backing store for one library session. Display index 0 = newest.
enum PhotokitLibraryBacking {
  /// Recents: physical oldest-first; map display via reversed.
  case fetch(PHFetchResult<PHAsset>, reversed: Bool)
  /// Newest-first array (Option 2B limited open via reverse enum).
  case displayOrder([PHAsset])

  var count: Int {
    switch self {
    case .fetch(let result, _):
      return result.count
    case .displayOrder(let assets):
      return assets.count
    }
  }

  func asset(atDisplay index: Int) -> PHAsset? {
    guard index >= 0, index < count else {
      return nil
    }
    switch self {
    case .fetch(let result, let reversed):
      let physical = reversed ? count - 1 - index : index
      guard physical >= 0, physical < result.count else {
        return nil
      }
      return result.object(at: physical)
    case .displayOrder(let assets):
      return assets[index]
    }
  }
}

struct PhotokitLibrarySession {
  let token: Int
  var backing: PhotokitLibraryBacking
}

enum PhotokitThumbEngine {
  /// Grid thumbs only. The default (`true`) makes PhotoKit cache full-quality
  /// images and stalls the first screen (TF 211: ~7s after IDs).
  static let manager: PHCachingImageManager = {
    let manager = PHCachingImageManager()
    manager.allowsCachingHighQualityImages = false
    return manager
  }()

  static var librarySession: PhotokitLibrarySession?
  static var nextToken = 1
  static var cachedRange: (token: Int, from: Int, to: Int)?
  /// Serializes session pointer vs JS `idAt` / thumb requests.
  static let sessionLock = NSLock()
  /// Drop stale `openLibrary` completions after a newer album open.
  static var openSeq = 0
  /// TF 214: sync `openLibrary` on the JS thread froze chrome for ~11s.
  static let workQueue = DispatchQueue(
    label: "insite.photokit.library",
    qos: .userInitiated
  )

  static func beginOpen() -> Int {
    sessionLock.lock()
    defer { sessionLock.unlock() }
    openSeq += 1
    return openSeq
  }

  static func makeOptions() -> PHImageRequestOptions {
    let options = PHImageRequestOptions()
    options.deliveryMode = .fastFormat
    options.resizeMode = .fast
    options.isNetworkAccessAllowed = false
    options.isSynchronous = false
    options.version = .current
    return options
  }

  static let maxThumbPixel: CGFloat = 256

  static func targetSize(pixelSize: Double) -> CGSize {
    let n = min(max(pixelSize, 1), maxThumbPixel)
    return CGSize(width: n, height: n)
  }

  /// TF 220: `creationDate` sort (even with fetchLimit 48) still cost ~7s before
  /// first bind. Recents: no sort + reverse display. Named albums: sort desc.
  static func fetchOptions(sorted: Bool) -> PHFetchOptions {
    let options = PHFetchOptions()
    options.predicate = NSPredicate(
      format: "mediaType == %d",
      PHAssetMediaType.image.rawValue
    )
    options.includeHiddenAssets = false
    options.wantsIncrementalChangeDetails = false
    if sorted {
      options.sortDescriptors = [
        NSSortDescriptor(key: "creationDate", ascending: false),
      ]
    }
    return options
  }

  static func fetchRecentsOrAll() -> (PHFetchResult<PHAsset>, reversed: Bool) {
    let recents = PHAssetCollection.fetchAssetCollections(
      with: .smartAlbum,
      subtype: .smartAlbumUserLibrary,
      options: nil
    )
    if let collection = recents.firstObject {
      return (
        PHAsset.fetchAssets(in: collection, options: fetchOptions(sorted: false)),
        true
      )
    }
    return (
      PHAsset.fetchAssets(with: .image, options: fetchOptions(sorted: true)),
      false
    )
  }

  static func openLibrary(albumId: String, seq: Int) -> PhotokitLibrarySession? {
    let backing: PhotokitLibraryBacking
    if albumId.isEmpty || albumId == "__all__" {
      let (result, reversed) = fetchRecentsOrAll()
      backing = .fetch(result, reversed: reversed)
    } else {
      let collections = PHAssetCollection.fetchAssetCollections(
        withLocalIdentifiers: [albumId],
        options: nil
      )
      if let collection = collections.firstObject {
        backing = .fetch(
          PHAsset.fetchAssets(in: collection, options: fetchOptions(sorted: true)),
          reversed: false
        )
      } else {
        backing = .fetch(
          PHAsset.fetchAssets(withLocalIdentifiers: [], options: nil),
          reversed: false
        )
      }
    }
    sessionLock.lock()
    defer { sessionLock.unlock() }
    guard seq == openSeq else {
      return nil
    }
    manager.stopCachingImagesForAllAssets()
    cachedRange = nil
    let session = PhotokitLibrarySession(token: nextToken, backing: backing)
    nextToken += 1
    librarySession = session
    return session
  }

  /// Option 2B: newest `limit` assets. Prefer fetchLimit+creationDate (capped set).
  /// Fall back to Recents reverse-enum if sorted fetch returns empty.
  /// Do not call stopCachingImagesForAllAssets unless replacing an existing session
  /// (cold open was paying a multi-second cache flush — TF 233).
  static func openLibraryLimited(
    albumId: String,
    limit: Int,
    seq: Int
  ) -> PhotokitLibrarySession? {
    let capped = max(1, min(limit, 200))
    var assets: [PHAsset] = []
    assets.reserveCapacity(capped)

    if albumId.isEmpty || albumId == "__all__" {
      let recents = PHAssetCollection.fetchAssetCollections(
        with: .smartAlbum,
        subtype: .smartAlbumUserLibrary,
        options: nil
      )
      if let collection = recents.firstObject {
        let limitedOpts = fetchOptions(sorted: true)
        limitedOpts.fetchLimit = capped
        let limitedResult = PHAsset.fetchAssets(in: collection, options: limitedOpts)
        limitedResult.enumerateObjects { asset, _, stop in
          assets.append(asset)
          if assets.count >= capped {
            stop.pointee = true
          }
        }
      }
      if assets.isEmpty {
        let (result, reversed) = fetchRecentsOrAll()
        if reversed {
          result.enumerateObjects(options: .reverse) { asset, _, stop in
            assets.append(asset)
            if assets.count >= capped {
              stop.pointee = true
            }
          }
        } else {
          result.enumerateObjects { asset, _, stop in
            assets.append(asset)
            if assets.count >= capped {
              stop.pointee = true
            }
          }
        }
      }
    } else {
      let collections = PHAssetCollection.fetchAssetCollections(
        withLocalIdentifiers: [albumId],
        options: nil
      )
      let limitedOpts = fetchOptions(sorted: true)
      limitedOpts.fetchLimit = capped
      let result: PHFetchResult<PHAsset>
      if let collection = collections.firstObject {
        result = PHAsset.fetchAssets(in: collection, options: limitedOpts)
      } else {
        result = PHAsset.fetchAssets(withLocalIdentifiers: [], options: nil)
      }
      result.enumerateObjects { asset, _, stop in
        assets.append(asset)
        if assets.count >= capped {
          stop.pointee = true
        }
      }
    }

    sessionLock.lock()
    defer { sessionLock.unlock() }
    guard seq == openSeq else {
      return nil
    }
    if librarySession != nil {
      manager.stopCachingImagesForAllAssets()
    }
    cachedRange = nil
    let session = PhotokitLibrarySession(
      token: nextToken,
      backing: .displayOrder(assets)
    )
    nextToken += 1
    librarySession = session
    return session
  }

  /// Option 2B: replace backing with full Recents fetch; **keep same token**.
  static func expandLibraryFull(token: Int) -> PhotokitLibrarySession? {
    let (result, reversed) = fetchRecentsOrAll()
    sessionLock.lock()
    defer { sessionLock.unlock() }
    guard var session = librarySession, session.token == token else {
      return nil
    }
    // Keep token; indices 0..<priorCount should still resolve (newest-first).
    cachedRange = nil
    session.backing = .fetch(result, reversed: reversed)
    librarySession = session
    return session
  }

  /// Nil if token is stale or index is out of range.
  static func asset(token: Int, index: Int) -> PHAsset? {
    sessionLock.lock()
    defer { sessionLock.unlock() }
    guard let session = librarySession, session.token == token else {
      return nil
    }
    return session.backing.asset(atDisplay: index)
  }

  static func assets(for localIds: [String]) -> [PHAsset] {
    guard !localIds.isEmpty else {
      return []
    }
    let result = PHAsset.fetchAssets(withLocalIdentifiers: localIds, options: nil)
    var list: [PHAsset] = []
    list.reserveCapacity(result.count)
    result.enumerateObjects { asset, _, _ in
      list.append(asset)
    }
    return list
  }

  /// `from`/`to` are display indexes (half-open).
  static func assetsInRange(token: Int, from: Int, to: Int) -> [PHAsset] {
    sessionLock.lock()
    defer { sessionLock.unlock() }
    guard let session = librarySession, session.token == token else {
      return []
    }
    let lo = max(from, 0)
    let hi = min(to, session.backing.count)
    guard hi > lo else {
      return []
    }
    var list: [PHAsset] = []
    list.reserveCapacity(hi - lo)
    for display in lo..<hi {
      if let asset = session.backing.asset(atDisplay: display) {
        list.append(asset)
      }
    }
    return list
  }

  static func startCachingRange(token: Int, from: Int, to: Int, pixelSize: Double) {
    sessionLock.lock()
    let prev = cachedRange
    sessionLock.unlock()
    if let prev, prev.token == token {
      let old = assetsInRange(token: token, from: prev.from, to: prev.to)
      if !old.isEmpty {
        manager.stopCachingImages(
          for: old,
          targetSize: targetSize(pixelSize: pixelSize),
          contentMode: .aspectFill,
          options: makeOptions()
        )
      }
    } else if prev != nil {
      manager.stopCachingImagesForAllAssets()
    }
    let next = assetsInRange(token: token, from: from, to: to)
    sessionLock.lock()
    cachedRange = next.isEmpty ? nil : (token, from, to)
    sessionLock.unlock()
    guard !next.isEmpty else {
      return
    }
    manager.startCachingImages(
      for: next,
      targetSize: targetSize(pixelSize: pixelSize),
      contentMode: .aspectFill,
      options: makeOptions()
    )
  }

  /// Newest `limit` local IDs from Recents via reverse enumeration (early stop).
  static func previewNewestIds(limit: Int) -> [String] {
    let capped = max(1, min(limit, 60))
    let (result, reversed) = fetchRecentsOrAll()
    var ids: [String] = []
    ids.reserveCapacity(capped)
    if reversed {
      result.enumerateObjects(options: .reverse) { asset, _, stop in
        ids.append(asset.localIdentifier)
        if ids.count >= capped {
          stop.pointee = true
        }
      }
    } else {
      result.enumerateObjects { asset, _, stop in
        ids.append(asset.localIdentifier)
        if ids.count >= capped {
          stop.pointee = true
        }
      }
    }
    return ids
  }
}

public final class PhotokitThumbsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhotokitThumbs")

    Function("startCaching") { (assetIds: [String], pixelSize: Double) in
      let assets = PhotokitThumbEngine.assets(for: assetIds)
      guard !assets.isEmpty else {
        return
      }
      PhotokitThumbEngine.manager.startCachingImages(
        for: assets,
        targetSize: PhotokitThumbEngine.targetSize(pixelSize: pixelSize),
        contentMode: .aspectFill,
        options: PhotokitThumbEngine.makeOptions()
      )
    }

    Function("stopCaching") {
      PhotokitThumbEngine.sessionLock.lock()
      PhotokitThumbEngine.cachedRange = nil
      PhotokitThumbEngine.sessionLock.unlock()
      PhotokitThumbEngine.manager.stopCachingImagesForAllAssets()
    }

    AsyncFunction("openLibrary") { (albumId: String) async -> [String: Int] in
      let seq = PhotokitThumbEngine.beginOpen()
      return await withCheckedContinuation { (continuation: CheckedContinuation<[String: Int], Never>) in
        PhotokitThumbEngine.workQueue.async {
          if let session = PhotokitThumbEngine.openLibrary(albumId: albumId, seq: seq) {
            continuation.resume(returning: [
              "token": session.token,
              "count": session.backing.count,
            ])
          } else {
            continuation.resume(returning: [
              "token": 0,
              "count": 0,
            ])
          }
        }
      }
    }

    /// Option 2B: reverse-enum first `limit` newest; early return before full count.
    AsyncFunction("openLibraryLimited") { (albumId: String, limit: Int) async -> [String: Int] in
      let seq = PhotokitThumbEngine.beginOpen()
      return await withCheckedContinuation { (continuation: CheckedContinuation<[String: Int], Never>) in
        PhotokitThumbEngine.workQueue.async {
          if let session = PhotokitThumbEngine.openLibraryLimited(
            albumId: albumId,
            limit: limit,
            seq: seq
          ) {
            continuation.resume(returning: [
              "token": session.token,
              "count": session.backing.count,
            ])
          } else {
            continuation.resume(returning: [
              "token": 0,
              "count": 0,
            ])
          }
        }
      }
    }

    /// Option 2B: full Recents behind the **same** token (no FlatList remount).
    /// Does not bump openSeq — a newer openLibraryLimited/openLibrary owns that.
    AsyncFunction("expandLibraryFull") { (token: Int) async -> [String: Int] in
      return await withCheckedContinuation { (continuation: CheckedContinuation<[String: Int], Never>) in
        PhotokitThumbEngine.workQueue.async {
          if let session = PhotokitThumbEngine.expandLibraryFull(token: token) {
            continuation.resume(returning: [
              "token": session.token,
              "count": session.backing.count,
            ])
          } else {
            continuation.resume(returning: [
              "token": 0,
              "count": 0,
            ])
          }
        }
      }
    }

    AsyncFunction("previewNewestIds") { (limit: Int) async -> [String] in
      await withCheckedContinuation { (continuation: CheckedContinuation<[String], Never>) in
        PhotokitThumbEngine.workQueue.async {
          continuation.resume(
            returning: PhotokitThumbEngine.previewNewestIds(limit: limit)
          )
        }
      }
    }

    Function("idAt") { (token: Int, index: Int) -> String in
      PhotokitThumbEngine.asset(token: token, index: index)?.localIdentifier ?? ""
    }

    Function("startCachingRange") { (token: Int, from: Int, to: Int, pixelSize: Double) in
      PhotokitThumbEngine.startCachingRange(
        token: token,
        from: from,
        to: to,
        pixelSize: pixelSize
      )
    }

    View(PhotokitThumbView.self) {
      Events("onPainted")

      Prop("assetId") { (view: PhotokitThumbView, assetId: String?) in
        view.assetId = assetId
        view.requestIfNeeded()
      }

      Prop("index") { (view: PhotokitThumbView, index: Int) in
        view.assetIndex = index
        view.indexExplicit = true
        view.requestIfNeeded()
      }

      Prop("token") { (view: PhotokitThumbView, token: Int) in
        view.libraryToken = token
        view.requestIfNeeded()
      }

      Prop("pixelSize") { (view: PhotokitThumbView, pixelSize: Double) in
        view.pixelSize = pixelSize
        view.requestIfNeeded()
      }
    }
  }
}
