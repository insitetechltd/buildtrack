import ExpoModulesCore
import Photos
import UIKit

/// Backing store for one library session. Display index 0 = newest.
enum PhotokitLibraryBacking {
  /// Full Library fetch with explicit sort (creationDate descending = newest-first).
  /// reversed flag kept for compatibility but always false (no smart album tricks).
  case fetch(PHFetchResult<PHAsset>, reversed: Bool)
  /// Newest-first array (filtered or named-album limited open).
  case displayOrder([PHAsset])
  /// Unsorted user-library fetch. `display` is newest-image-first. `nextIndex` walks down.
  case userLibrary(result: PHFetchResult<PHAsset>, display: [PHAsset], nextIndex: Int)

  var count: Int {
    switch self {
    case .fetch(let result, _):
      return result.count
    case .displayOrder(let assets):
      return assets.count
    case .userLibrary(_, let display, _):
      return display.count
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
    case .userLibrary(_, let display, _):
      return display[index]
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
  /// TF 235: expand/openLibrary + live thumbs starve `getAssetInfoAsync` on Accept.
  static var pausedForAccept = false
  static let liveThumbViews = NSHashTable<PhotokitThumbView>.weakObjects()

  static func pauseLibraryForAccept() {
    pausedForAccept = true
    let apply = {
      sessionLock.lock()
      cachedRange = nil
      sessionLock.unlock()
      manager.stopCachingImagesForAllAssets()
      dropSharpWaiters()
      for view in liveThumbViews.allObjects {
        if view.indexExplicit {
          view.cancelPendingRequest()
        }
      }
    }
    if Thread.isMainThread {
      apply()
    } else {
      DispatchQueue.main.sync(execute: apply)
    }
  }

  static func resumeLibraryAfterAccept() {
    pausedForAccept = false
    let apply = {
      for view in liveThumbViews.allObjects {
        view.requestIfNeeded()
      }
    }
    if Thread.isMainThread {
      apply()
    } else {
      DispatchQueue.main.async(execute: apply)
    }
  }

  static func beginOpen() -> Int {
    sessionLock.lock()
    defer { sessionLock.unlock() }
    openSeq += 1
    return openSeq
  }

  static func makeOptions() -> PHImageRequestOptions {
    let options = PHImageRequestOptions()
    options.deliveryMode = .opportunistic
    options.resizeMode = .fast
    options.isNetworkAccessAllowed = false
    options.isSynchronous = false
    options.version = .current
    return options
  }

  /// Viewport sharpen pass. Opportunistic = degraded then final at full
  /// `targetSize`. Do not use for first `onPainted` (stay on fastFormat).
  static func makeSharpOptions() -> PHImageRequestOptions {
    let options = PHImageRequestOptions()
    options.deliveryMode = .opportunistic
    options.resizeMode = .fast
    options.isNetworkAccessAllowed = false
    options.isSynchronous = false
    options.version = .current
    return options
  }

  /// Cap concurrent HQ upgrades so first-screen decode cannot stall like TF 211.
  static let sharpLimit = 3
  static var sharpInflight = 0
  /// Waiters that missed the 3-wide slot. Old 80×50ms retry dropped most iPad tiles.
  static var sharpWaiters: [() -> Void] = []

  static func acquireSharpSlot(run: @escaping () -> Void) {
    let start = {
      if sharpInflight < sharpLimit {
        sharpInflight += 1
        run()
      } else {
        sharpWaiters.append(run)
      }
    }
    if Thread.isMainThread {
      start()
    } else {
      DispatchQueue.main.async(execute: start)
    }
  }

  static func releaseSharpSlot() {
    let pump = {
      sharpInflight = max(0, sharpInflight - 1)
      guard !sharpWaiters.isEmpty else {
        return
      }
      let next = sharpWaiters.removeFirst()
      sharpInflight += 1
      next()
    }
    if Thread.isMainThread {
      pump()
    } else {
      DispatchQueue.main.async(execute: pump)
    }
  }

  static func dropSharpWaiters() {
    let clear = { sharpWaiters.removeAll(keepingCapacity: false) }
    if Thread.isMainThread {
      clear()
    } else {
      DispatchQueue.main.async(execute: clear)
    }
  }

  /// Keep in sync with JS `LIBRARY_PHOTOKIT_THUMB_BASE_CAP_PX * LINEAR_SCALE` (TF237=256, 2× experiment=512).
  static let maxThumbPixel: CGFloat = 512
  /// First paint (fastFormat). Matches JS `LIBRARY_PHOTOKIT_THUMB_BASE_CAP_PX`.
  /// iPad tiles are large; asking 512 on the fast path stalls Recents fill.
  static let fastThumbPixel: CGFloat = 256

  static func targetSize(pixelSize: Double) -> CGSize {
    let n = min(max(pixelSize, 1), maxThumbPixel)
    return CGSize(width: n, height: n)
  }

  static func fastTargetSize(pixelSize: Double) -> CGSize {
    let requested = CGFloat(max(pixelSize, 1))
    let n = min(requested, fastThumbPixel, maxThumbPixel)
    return CGSize(width: n, height: n)
  }

  /// TF 220: `creationDate` sort (even with fetchLimit 48) still cost ~7s before
  /// first bind. Recents: no sort + reverse display. Named albums: sort desc.
  static func fetchOptions(
    sorted: Bool,
    ascending: Bool = false,
    afterEpochSeconds: Double? = nil,
    beforeEpochSeconds: Double? = nil
  ) -> PHFetchOptions {
    let options = PHFetchOptions()
    
    var predicates: [NSPredicate] = []
    predicates.append(NSPredicate(
      format: "mediaType == %d",
      PHAssetMediaType.image.rawValue
    ))
    
    if let after = afterEpochSeconds {
      let date = Date(timeIntervalSince1970: after)
      predicates.append(NSPredicate(format: "creationDate >= %@", date as CVarArg))
    }
    if let before = beforeEpochSeconds {
      let date = Date(timeIntervalSince1970: before)
      predicates.append(NSPredicate(format: "creationDate <= %@", date as CVarArg))
    }
    
    options.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: predicates)
    options.includeHiddenAssets = false
    options.wantsIncrementalChangeDetails = false
    if sorted {
      options.sortDescriptors = [
        NSSortDescriptor(key: "creationDate", ascending: ascending),
      ]
    }
    return options
  }

  /// TF 235: `mediaType == image` on Recents still scanned the album (~9–14s).
  /// Camera Roll physical order is indexed; filter images while walking from the end.
  static func recentsPhysicalOptions() -> PHFetchOptions {
    let options = PHFetchOptions()
    options.includeHiddenAssets = false
    options.wantsIncrementalChangeDetails = false
    return options
  }

  /// Sorted full-library fetch for expand, oldest-first, and date filters.
  /// Default first paint does not use this — it walks smartAlbumUserLibrary.
  static func fetchLibrary(
    ascending: Bool = false,
    afterEpochSeconds: Double? = nil,
    beforeEpochSeconds: Double? = nil
  ) -> PHFetchResult<PHAsset> {
    return PHAsset.fetchAssets(
      with: .image,
      options: fetchOptions(
        sorted: true,
        ascending: ascending,
        afterEpochSeconds: afterEpochSeconds,
        beforeEpochSeconds: beforeEpochSeconds
      )
    )
  }

  static func openLibrary(
    albumId: String,
    seq: Int,
    ascending: Bool = false,
    afterEpochSeconds: Double? = nil,
    beforeEpochSeconds: Double? = nil
  ) -> PhotokitLibrarySession? {
    let backing: PhotokitLibraryBacking
    if albumId.isEmpty || albumId == "__all__" {
      let result = fetchLibrary(
        ascending: ascending,
        afterEpochSeconds: afterEpochSeconds,
        beforeEpochSeconds: beforeEpochSeconds
      )
      backing = .fetch(result, reversed: false)
    } else {
      let collections = PHAssetCollection.fetchAssetCollections(
        withLocalIdentifiers: [albumId],
        options: nil
      )
      if let collection = collections.firstObject {
        backing = .fetch(
          PHAsset.fetchAssets(
            in: collection,
            options: fetchOptions(
              sorted: true,
              ascending: ascending,
              afterEpochSeconds: afterEpochSeconds,
              beforeEpochSeconds: beforeEpochSeconds
            )
          ),
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

  /// Oldest-first and date-filtered limited opens. Not the default first paint:
  /// a creationDate sort with fetchLimit still scans the library (TF 220 / 234).
  static func newestLibrary(
    limit: Int,
    ascending: Bool = false,
    afterEpochSeconds: Double? = nil,
    beforeEpochSeconds: Double? = nil
  ) -> [PHAsset] {
    let capped = max(1, min(limit, 200))
    let options = fetchOptions(
      sorted: true,
      ascending: ascending,
      afterEpochSeconds: afterEpochSeconds,
      beforeEpochSeconds: beforeEpochSeconds
    )
    options.fetchLimit = capped
    let result = PHAsset.fetchAssets(with: .image, options: options)
    guard result.count > 0 else {
      return []
    }
    var assets: [PHAsset] = []
    assets.reserveCapacity(result.count)
    result.enumerateObjects { asset, _, _ in
      assets.append(asset)
    }
    return assets
  }

  /// Newest images from smartAlbumUserLibrary. Index 0 is the newest image.
  /// Keeps walking until `imageCount` images or the start of the album.
  /// Not PHAsset.fetchAssets(with: .image).
  static func userLibraryCursor(imageCount: Int) -> (PHFetchResult<PHAsset>, [PHAsset], Int)? {
    let imageCap = max(1, min(imageCount, 200))
    let collections = PHAssetCollection.fetchAssetCollections(
      with: .smartAlbum,
      subtype: .smartAlbumUserLibrary,
      options: nil
    )
    guard let collection = collections.firstObject else {
      return nil
    }
    let result = PHAsset.fetchAssets(in: collection, options: recentsPhysicalOptions())
    var display: [PHAsset] = []
    display.reserveCapacity(imageCap)
    var nextIndex = result.count - 1
    appendUserLibraryImages(
      result: result,
      display: &display,
      nextIndex: &nextIndex,
      imageCount: imageCap
    )
    return (result, display, nextIndex)
  }

  static func appendUserLibraryImages(
    result: PHFetchResult<PHAsset>,
    display: inout [PHAsset],
    nextIndex: inout Int,
    imageCount: Int
  ) {
    let target = display.count + max(1, imageCount)
    while nextIndex >= 0 && display.count < target {
      let asset = result.object(at: nextIndex)
      nextIndex -= 1
      if asset.mediaType == .image {
        display.append(asset)
      }
    }
  }

  /// Option 2B: newest `limit` assets.
  /// Default all-photos uses the user-library reverse walk.
  /// Named albums, oldest-first, and date filters keep fetchLimit + creationDate.
  /// Do not call stopCachingImagesForAllAssets unless replacing an existing session
  /// (cold open was paying a multi-second cache flush — TF 233).
  static func openLibraryLimited(
    albumId: String,
    limit: Int,
    seq: Int,
    ascending: Bool = false,
    afterEpochSeconds: Double? = nil,
    beforeEpochSeconds: Double? = nil
  ) -> PhotokitLibrarySession? {
    let capped = max(1, min(limit, 200))
    var assets: [PHAsset] = []
    assets.reserveCapacity(capped)

    if albumId.isEmpty || albumId == "__all__" {
      let defaultNewest =
        !ascending && afterEpochSeconds == nil && beforeEpochSeconds == nil
      if defaultNewest {
        if let cursor = userLibraryCursor(imageCount: capped) {
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
            backing: .userLibrary(
              result: cursor.0,
              display: cursor.1,
              nextIndex: cursor.2
            )
          )
          nextToken += 1
          librarySession = session
          return session
        }
        assets = []
      } else {
        assets = newestLibrary(
          limit: capped,
          ascending: ascending,
          afterEpochSeconds: afterEpochSeconds,
          beforeEpochSeconds: beforeEpochSeconds
        )
      }
    } else {
      let collections = PHAssetCollection.fetchAssetCollections(
        withLocalIdentifiers: [albumId],
        options: nil
      )
      let limitedOpts = fetchOptions(
        sorted: true,
        ascending: ascending,
        afterEpochSeconds: afterEpochSeconds,
        beforeEpochSeconds: beforeEpochSeconds
      )
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

  /// Default user-library session: next 90 images on the same fetch, same token.
  /// Filtered and named-album sessions replace the backing with a sorted full fetch.
  /// A session that is already a full fetch is unchanged.
  static func expandLibraryFull(
    token: Int,
    ascending: Bool = false,
    afterEpochSeconds: Double? = nil,
    beforeEpochSeconds: Double? = nil
  ) -> PhotokitLibrarySession? {
    sessionLock.lock()
    let existing = librarySession
    sessionLock.unlock()
    guard let existing, existing.token == token else {
      return nil
    }
    if case .userLibrary(let result, var display, var nextIndex) = existing.backing {
      appendUserLibraryImages(
        result: result,
        display: &display,
        nextIndex: &nextIndex,
        imageCount: 90
      )
      sessionLock.lock()
      defer { sessionLock.unlock() }
      guard var current = librarySession, current.token == token else {
        return nil
      }
      guard case .userLibrary = current.backing else {
        return current
      }
      cachedRange = nil
      current.backing = .userLibrary(
        result: result,
        display: display,
        nextIndex: nextIndex
      )
      librarySession = current
      return current
    }
    if case .fetch = existing.backing {
      return existing
    }
    let result = fetchLibrary(
      ascending: ascending,
      afterEpochSeconds: afterEpochSeconds,
      beforeEpochSeconds: beforeEpochSeconds
    )
    sessionLock.lock()
    defer { sessionLock.unlock() }
    guard var current = librarySession, current.token == token else {
      return nil
    }
    if case .userLibrary = current.backing {
      return current
    }
    if case .fetch = current.backing {
      return current
    }
    cachedRange = nil
    current.backing = .fetch(result, reversed: false)
    librarySession = current
    return current
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

  static func normalizedLocalIdentifier(_ raw: String) -> String {
    if raw.lowercased().hasPrefix("ph://") {
      return String(raw.dropFirst(5))
    }
    return raw
  }

  static func asset(localIdentifier raw: String) -> PHAsset? {
    let localId = normalizedLocalIdentifier(raw)
    guard !localId.isEmpty else {
      return nil
    }
    return PHAsset.fetchAssets(withLocalIdentifiers: [localId], options: nil).firstObject
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

  /// Jobsite evidence export (M-PERF-02). Independent of grid `maxThumbPixel`.
  static func exportCappedJpeg(assetId: String, maxPixel: Double) -> String? {
    let fetched = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil)
    guard let asset = fetched.firstObject else {
      return nil
    }
    let options = PHImageRequestOptions()
    options.deliveryMode = .highQualityFormat
    options.resizeMode = .exact
    options.isNetworkAccessAllowed = true
    options.isSynchronous = true
    options.version = .current
    let cap = min(max(maxPixel, 1), 4096)
    let target = CGSize(width: cap, height: cap)
    var rendered: UIImage?
    PHImageManager.default().requestImage(
      for: asset,
      targetSize: target,
      contentMode: .aspectFit,
      options: options
    ) { image, info in
      let cancelled = (info?[PHImageCancelledKey] as? Bool) ?? false
      let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
      if cancelled || degraded {
        return
      }
      rendered = image
    }
    guard let image = rendered, let data = image.jpegData(compressionQuality: 0.85) else {
      return nil
    }
    guard let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      return nil
    }
    let url = dir.appendingPathComponent("insite-export-\(UUID().uuidString).jpg")
    do {
      try data.write(to: url, options: .atomic)
      return url.absoluteString
    } catch {
      return nil
    }
  }

  /// Fast Select Photos tile — not the 1920 HQ evidence export.
  /// Takes the first bitmap PhotoKit returns (degraded OK).
  static func exportPreviewJpeg(assetId: String, maxPixel: Double) async -> String {
    let fetched = PHAsset.fetchAssets(
      withLocalIdentifiers: [normalizedLocalIdentifier(assetId)],
      options: nil
    )
    guard let asset = fetched.firstObject else {
      return ""
    }
    let options = PHImageRequestOptions()
    options.deliveryMode = .fastFormat
    options.resizeMode = .fast
    options.isNetworkAccessAllowed = false
    options.isSynchronous = false
    options.version = .current
    let cap = min(max(maxPixel, 1), maxThumbPixel)
    let target = CGSize(width: cap, height: cap)
    return await withCheckedContinuation { (continuation: CheckedContinuation<String, Never>) in
      var settled = false
      let finish: (String) -> Void = { value in
        guard !settled else {
          return
        }
        settled = true
        continuation.resume(returning: value)
      }
      PHImageManager.default().requestImage(
        for: asset,
        targetSize: target,
        contentMode: .aspectFill,
        options: options
      ) { image, info in
        // Recents pause can cancel in-flight work; a nil first callback is
        // common. Wait for a bitmap or the 2s timeout — do not settle empty.
        let cancelled = (info?[PHImageCancelledKey] as? Bool) ?? false
        if cancelled {
          return
        }
        guard let image, let data = image.jpegData(compressionQuality: 0.7) else {
          return
        }
        guard let dir = FileManager.default.urls(
          for: .cachesDirectory,
          in: .userDomainMask
        ).first else {
          return
        }
        let url = dir.appendingPathComponent("insite-preview-\(UUID().uuidString).jpg")
        do {
          try data.write(to: url, options: .atomic)
          finish(url.absoluteString)
        } catch {
          return
        }
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
        finish("")
      }
    }
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

    Function("pauseLibraryForAccept") {
      PhotokitThumbEngine.pauseLibraryForAccept()
    }

    Function("resumeLibraryAfterAccept") {
      PhotokitThumbEngine.resumeLibraryAfterAccept()
    }

    AsyncFunction("openLibrary") { (
      albumId: String,
      ascending: Bool,
      afterEpochSeconds: Double?,
      beforeEpochSeconds: Double?
    ) async -> [String: Int] in
      let seq = PhotokitThumbEngine.beginOpen()
      return await withCheckedContinuation { (continuation: CheckedContinuation<[String: Int], Never>) in
        PhotokitThumbEngine.workQueue.async {
          if let session = PhotokitThumbEngine.openLibrary(
            albumId: albumId,
            seq: seq,
            ascending: ascending,
            afterEpochSeconds: afterEpochSeconds,
            beforeEpochSeconds: beforeEpochSeconds
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

    /// Option 2B: newest `limit` Library with sort and date filter.
    AsyncFunction("openLibraryLimited") { (
      albumId: String,
      limit: Int,
      ascending: Bool,
      afterEpochSeconds: Double?,
      beforeEpochSeconds: Double?
    ) async -> [String: Int] in
      let seq = PhotokitThumbEngine.beginOpen()
      return await withCheckedContinuation { (continuation: CheckedContinuation<[String: Int], Never>) in
        PhotokitThumbEngine.workQueue.async {
          if let session = PhotokitThumbEngine.openLibraryLimited(
            albumId: albumId,
            limit: limit,
            seq: seq,
            ascending: ascending,
            afterEpochSeconds: afterEpochSeconds,
            beforeEpochSeconds: beforeEpochSeconds
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

    /// Option 2B: more images behind the **same** token (no FlatList remount).
    /// Does not bump openSeq — a newer openLibraryLimited/openLibrary owns that.
    AsyncFunction("expandLibraryFull") { (
      token: Int,
      ascending: Bool,
      afterEpochSeconds: Double?,
      beforeEpochSeconds: Double?
    ) async -> [String: Int] in
      return await withCheckedContinuation { (continuation: CheckedContinuation<[String: Int], Never>) in
        PhotokitThumbEngine.workQueue.async {
          if let session = PhotokitThumbEngine.expandLibraryFull(
            token: token,
            ascending: ascending,
            afterEpochSeconds: afterEpochSeconds,
            beforeEpochSeconds: beforeEpochSeconds
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

    /// Annotation / upload only. Do not use `maxThumbPixel` (grid fast path).
    AsyncFunction("exportCappedJpeg") { (assetId: String, maxPixel: Double) async -> String in
      await withCheckedContinuation { (continuation: CheckedContinuation<String, Never>) in
        PhotokitThumbEngine.workQueue.async {
          continuation.resume(
            returning: PhotokitThumbEngine.exportCappedJpeg(
              assetId: assetId,
              maxPixel: maxPixel
            ) ?? ""
          )
        }
      }
    }

    /// Select Photos tiles after Accept. Fast/degraded OK — never 1920 HQ.
    AsyncFunction("exportPreviewJpeg") { (assetId: String, maxPixel: Double) async -> String in
      await PhotokitThumbEngine.exportPreviewJpeg(assetId: assetId, maxPixel: maxPixel)
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

      Prop("contentFit") { (view: PhotokitThumbView, contentFit: String?) in
        view.setContentFit(contentFit)
      }
    }
  }
}
