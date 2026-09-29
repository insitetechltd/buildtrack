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

    // Require complete prop set before attempting asset resolution.
    // Index mode needs token > 0, indexExplicit, and assetIndex >= 0.
    // Asset-id mode needs non-empty assetId.
    let hasIndexProps = libraryToken > 0 && indexExplicit && assetIndex >= 0
    let hasAssetIdProp = assetId != nil && !(assetId?.isEmpty ?? true)
    guard hasIndexProps || hasAssetIdProp else {
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
  }
}
