import ExpoModulesCore
import Photos
import UIKit

public final class PhotokitThumbView: ExpoView {
  let onPainted = EventDispatcher()

  var assetId: String?
  var assetIndex: Int = -1
  var indexExplicit = false
  var libraryToken: Int = 0
  var pixelSize: Double = 0

  private let imageView = UIImageView()
  private var requestId: PHImageRequestID = PHInvalidImageRequestID
  private var sharpRequestId: PHImageRequestID = PHInvalidImageRequestID
  private var requestedKey: String = ""
  private var didNotifyPainted = false
  private var phContentMode: PHImageContentMode = .aspectFill

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    imageView.contentMode = .scaleAspectFill
    imageView.clipsToBounds = true
    imageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    imageView.frame = bounds
    addSubview(imageView)
    PhotokitThumbEngine.liveThumbViews.add(self)
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    imageView.frame = bounds
    requestIfNeeded()
  }

  func setContentFit(_ raw: String?) {
    let contain = (raw ?? "cover").lowercased() == "contain"
    imageView.contentMode = contain ? .scaleAspectFit : .scaleAspectFill
    phContentMode = contain ? .aspectFit : .aspectFill
  }

  func requestIfNeeded() {
    // Recents index thumbs pause while Select Photos is on top. Asset-id
    // thumbs (Select Photos tiles) must still paint.
    if PhotokitThumbEngine.pausedForAccept, indexExplicit {
      return
    }
    guard pixelSize >= 1 else {
      return
    }

    var asset: PHAsset?
    let key: String
    if libraryToken > 0, indexExplicit, assetIndex >= 0 {
      asset = PhotokitThumbEngine.asset(token: libraryToken, index: assetIndex)
      if asset == nil, let assetId, !assetId.isEmpty {
        asset = PhotokitThumbEngine.asset(localIdentifier: assetId)
      }
      key = "t\(libraryToken):i\(assetIndex):\(Int(pixelSize.rounded()))"
    } else if let assetId, !assetId.isEmpty {
      asset = PhotokitThumbEngine.asset(localIdentifier: assetId)
      key = "id:\(PhotokitThumbEngine.normalizedLocalIdentifier(assetId)):\(Int(pixelSize.rounded()))"
    } else {
      return
    }

    if key == requestedKey {
      return
    }
    cancelRequest()
    requestedKey = key
    didNotifyPainted = false
    imageView.image = nil

    guard let asset else {
      requestedKey = ""
      return
    }

    startFastRequest(asset: asset, key: key)
  }

  deinit {
    cancelPendingRequest()
  }

  func cancelPendingRequest() {
    cancelRequest()
    requestedKey = ""
  }

  private func startFastRequest(asset: PHAsset, key: String) {
    requestId = PhotokitThumbEngine.manager.requestImage(
      for: asset,
      targetSize: PhotokitThumbEngine.targetSize(pixelSize: pixelSize),
      contentMode: phContentMode,
      options: PhotokitThumbEngine.makeOptions()
    ) { [weak self] image, info in
      guard let self else {
        return
      }
      let cancelled = (info?[PHImageCancelledKey] as? Bool) ?? false
      if cancelled {
        return
      }
      guard let image else {
        return
      }
      let apply = {
        guard self.requestedKey == key else {
          return
        }
        self.imageView.image = image
        if !self.didNotifyPainted {
          self.didNotifyPainted = true
          self.onPainted()
        }
        self.scheduleSharpUpgrade(asset: asset, key: key)
      }
      if Thread.isMainThread {
        apply()
      } else {
        DispatchQueue.main.async(execute: apply)
      }
    }
  }

  private func scheduleSharpUpgrade(asset: PHAsset, key: String, attempts: Int = 0) {
    if requestedKey != key {
      return
    }
    if indexExplicit, PhotokitThumbEngine.pausedForAccept {
      return
    }
    if PhotokitThumbEngine.sharpInflight >= PhotokitThumbEngine.sharpLimit {
      if attempts > 80 {
        return
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.scheduleSharpUpgrade(asset: asset, key: key, attempts: attempts + 1)
      }
      return
    }

    PhotokitThumbEngine.sharpInflight += 1
    sharpRequestId = PhotokitThumbEngine.manager.requestImage(
      for: asset,
      targetSize: PhotokitThumbEngine.targetSize(pixelSize: pixelSize),
      contentMode: phContentMode,
      options: PhotokitThumbEngine.makeSharpOptions()
    ) { [weak self] image, info in
      let cancelled = (info?[PHImageCancelledKey] as? Bool) ?? false
      let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
      let apply = {
        PhotokitThumbEngine.sharpInflight = max(0, PhotokitThumbEngine.sharpInflight - 1)
        if cancelled || degraded {
          return
        }
        guard let self, let image, self.requestedKey == key else {
          return
        }
        // Keep the fast thumb until this HQ bitmap is ready — never nil.
        self.imageView.image = image
      }
      if Thread.isMainThread {
        apply()
      } else {
        DispatchQueue.main.async(execute: apply)
      }
    }
  }

  private func cancelRequest() {
    if requestId != PHInvalidImageRequestID {
      PhotokitThumbEngine.manager.cancelImageRequest(requestId)
      requestId = PHInvalidImageRequestID
    }
    if sharpRequestId != PHInvalidImageRequestID {
      PhotokitThumbEngine.manager.cancelImageRequest(sharpRequestId)
      sharpRequestId = PHInvalidImageRequestID
    }
  }
}
