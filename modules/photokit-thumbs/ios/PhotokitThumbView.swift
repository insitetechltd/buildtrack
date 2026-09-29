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
      print("[PhotokitThumb] requestIfNeeded: paused for accept")
      return
    }
    guard pixelSize >= 1 else {
      print("[PhotokitThumb] requestIfNeeded: pixelSize < 1, got \(pixelSize)")
      return
    }

    // Require complete prop set before attempting asset resolution.
    // Index mode needs token > 0, indexExplicit, and assetIndex >= 0.
    // Asset-id mode needs non-empty assetId.
    let hasIndexProps = libraryToken > 0 && indexExplicit && assetIndex >= 0
    let hasAssetIdProp = assetId != nil && !(assetId?.isEmpty ?? true)
    guard hasIndexProps || hasAssetIdProp else {
      print("[PhotokitThumb] requestIfNeeded: incomplete props - token=\(libraryToken), explicit=\(indexExplicit), index=\(assetIndex), assetId=\(assetId ?? "nil")")
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
      print("[PhotokitThumb] requestIfNeeded: index mode - token=\(libraryToken), index=\(assetIndex), asset=\(asset?.localIdentifier ?? "nil")")
    } else if let assetId, !assetId.isEmpty {
      asset = PhotokitThumbEngine.asset(localIdentifier: assetId)
      key = "id:\(PhotokitThumbEngine.normalizedLocalIdentifier(assetId)):\(Int(pixelSize.rounded()))"
      print("[PhotokitThumb] requestIfNeeded: assetId mode - asset=\(asset?.localIdentifier ?? "nil")")
    } else {
      print("[PhotokitThumb] requestIfNeeded: no valid mode")
      return
    }

    if key == requestedKey {
      print("[PhotokitThumb] requestIfNeeded: already requested key=\(key)")
      return
    }
    cancelRequest()
    requestedKey = key
    didNotifyPainted = false
    imageView.image = nil

    guard let asset else {
      requestedKey = ""
      print("[PhotokitThumb] requestIfNeeded: asset is nil, cannot request")
      return
    }

    print("[PhotokitThumb] requestIfNeeded: calling startFastRequest for key=\(key)")
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
    let targetSize = PhotokitThumbEngine.targetSize(pixelSize: pixelSize)
    print("[PhotokitThumb] startFastRequest: asset=\(asset.localIdentifier), targetSize=\(targetSize), key=\(key)")
    requestId = PhotokitThumbEngine.manager.requestImage(
      for: asset,
      targetSize: targetSize,
      contentMode: phContentMode,
      options: PhotokitThumbEngine.makeOptions()
    ) { [weak self] image, info in
      guard let self else {
        print("[PhotokitThumb] callback: self is nil")
        return
      }
      let cancelled = (info?[PHImageCancelledKey] as? Bool) ?? false
      let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
      let error = info?[PHImageErrorKey]
      print("[PhotokitThumb] callback: key=\(key), image=\(image != nil), cancelled=\(cancelled), degraded=\(degraded), error=\(error != nil)")
      if cancelled {
        return
      }
      guard let image else {
        return
      }
      let apply = {
        guard self.requestedKey == key else {
          print("[PhotokitThumb] callback: key mismatch, expected=\(self.requestedKey), got=\(key)")
          return
        }
        self.imageView.image = image
        if !self.didNotifyPainted {
          self.didNotifyPainted = true
          self.onPainted()
          print("[PhotokitThumb] callback: painted key=\(key)")
        }
      }
      if Thread.isMainThread {
        apply()
      } else {
        DispatchQueue.main.async(execute: apply)
      }
    }
    print("[PhotokitThumb] startFastRequest: requestId=\(requestId)")
  }


  private func cancelRequest() {
    if requestId != PHInvalidImageRequestID {
      PhotokitThumbEngine.manager.cancelImageRequest(requestId)
      requestId = PHInvalidImageRequestID
    }
  }
}
