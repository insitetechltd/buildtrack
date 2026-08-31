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
  private var requestedKey: String = ""
  private var didNotifyPainted = false

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

  func requestIfNeeded() {
    if PhotokitThumbEngine.pausedForAccept {
      return
    }
    guard pixelSize >= 1 else {
      return
    }

    let asset: PHAsset?
    let key: String
    if libraryToken > 0, indexExplicit, assetIndex >= 0 {
      asset = PhotokitThumbEngine.asset(token: libraryToken, index: assetIndex)
      key = "t\(libraryToken):i\(assetIndex):\(Int(pixelSize.rounded()))"
    } else if let assetId, !assetId.isEmpty {
      let fetched = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil)
      asset = fetched.firstObject
      key = "id:\(assetId):\(Int(pixelSize.rounded()))"
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
      return
    }

    requestId = PhotokitThumbEngine.manager.requestImage(
      for: asset,
      targetSize: PhotokitThumbEngine.targetSize(pixelSize: pixelSize),
      contentMode: .aspectFill,
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
      }
      if Thread.isMainThread {
        apply()
      } else {
        DispatchQueue.main.async(execute: apply)
      }
    }
  }

  deinit {
    cancelPendingRequest()
  }

  func cancelPendingRequest() {
    cancelRequest()
    requestedKey = ""
  }

  private func cancelRequest() {
    if requestId != PHInvalidImageRequestID {
      PhotokitThumbEngine.manager.cancelImageRequest(requestId)
      requestId = PHInvalidImageRequestID
    }
  }
}
