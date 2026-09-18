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
  private var displayedPixel: CGFloat = 0
  private var sharpSlotHeld = false
  private var phContentMode: PHImageContentMode = .aspectFill

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .clear
    imageView.backgroundColor = .clear
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
    displayedPixel = 0
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
      targetSize: PhotokitThumbEngine.fastTargetSize(pixelSize: pixelSize),
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
        self.applyIfSharper(image, key: key, notifyPainted: true)
        self.scheduleSharpUpgrade(asset: asset, key: key)
      }
      if Thread.isMainThread {
        apply()
      } else {
        DispatchQueue.main.async(execute: apply)
      }
    }
  }

  private func scheduleSharpUpgrade(asset: PHAsset, key: String) {
    let fast = PhotokitThumbEngine.fastTargetSize(pixelSize: pixelSize).width
    let sharp = PhotokitThumbEngine.targetSize(pixelSize: pixelSize).width
    if sharp <= fast + 0.5 {
      return
    }
    PhotokitThumbEngine.acquireSharpSlot { [weak self] in
      guard let self, self.requestedKey == key else {
        PhotokitThumbEngine.releaseSharpSlot()
        return
      }
      if self.indexExplicit, PhotokitThumbEngine.pausedForAccept {
        PhotokitThumbEngine.releaseSharpSlot()
        return
      }
      self.sharpSlotHeld = true
      self.startSharpRequest(asset: asset, key: key)
    }
  }

  private func startSharpRequest(asset: PHAsset, key: String) {
    let rid = PhotokitThumbEngine.manager.requestImage(
      for: asset,
      targetSize: PhotokitThumbEngine.targetSize(pixelSize: pixelSize),
      contentMode: phContentMode,
      options: PhotokitThumbEngine.makeSharpOptions()
    ) { [weak self] image, info in
      let cancelled = (info?[PHImageCancelledKey] as? Bool) ?? false
      let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
      let apply = {
        guard let self else {
          return
        }
        if cancelled {
          self.releaseSharpSlot()
          return
        }
        if let image {
          self.applyIfSharper(image, key: key, notifyPainted: false)
        }
        // Opportunistic: degraded then final. Hold the slot until final so
        // the 256px thumb can be replaced. Old code dropped degraded and
        // never applied a later bitmap.
        if !degraded {
          self.sharpRequestId = PHInvalidImageRequestID
          self.releaseSharpSlot()
        }
      }
      if Thread.isMainThread {
        apply()
      } else {
        DispatchQueue.main.async(execute: apply)
      }
    }
    sharpRequestId = rid
    DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) { [weak self] in
      guard let self, self.sharpRequestId == rid else {
        return
      }
      self.releaseSharpSlot()
    }
  }

  /// Replace the on-screen bitmap when PhotoKit returns more pixels.
  private func applyIfSharper(_ image: UIImage, key: String, notifyPainted: Bool) {
    guard requestedKey == key else {
      return
    }
    let incoming = max(image.size.width, image.size.height) * image.scale
    if incoming <= displayedPixel + 0.5 {
      return
    }
    imageView.image = image
    displayedPixel = incoming
    if notifyPainted, !didNotifyPainted {
      didNotifyPainted = true
      onPainted()
    }
  }

  private func releaseSharpSlot() {
    guard sharpSlotHeld else {
      return
    }
    sharpSlotHeld = false
    PhotokitThumbEngine.releaseSharpSlot()
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
    releaseSharpSlot()
  }
}
