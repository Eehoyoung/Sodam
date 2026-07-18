import UIKit
import React
import React_RCTAppDelegate
import React_RCTLinking
import ReactAppDependencyProvider
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Sodam_Front_End",
      in: window,
      launchOptions: launchOptions
    )

    // GoogleService-Info.plist는 Firebase 콘솔에서 iOS 앱을 등록해야 발급된다(사람 작업) —
    // 파일이 없는 개발 중에는 FirebaseApp.configure()를 건너뛰어 크래시를 막는다.
    if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
      UNUserNotificationCenter.current().delegate = self
      Messaging.messaging().delegate = self
      application.registerForRemoteNotifications()
    } else {
      print("[Sodam] GoogleService-Info.plist 없음 — FCM 비활성 상태로 기동 (Firebase 콘솔에서 iOS 앱 등록 후 파일 추가 필요)")
    }

    return true
  }

  // APNs 디바이스 토큰을 Firebase Messaging에 전달 — 이게 없으면 FCM 원격 푸시가 iOS에서 동작하지 않는다.
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
  }

  // 카카오 로그인 복귀 등 커스텀 스킴(sodam://) 딥링크를 RN Linking 모듈로 전달.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

// 포그라운드 상태에서도 배너/사운드로 알림을 표시 — 기본값은 포그라운드에서 알림을 숨긴다.
extension AppDelegate: UNUserNotificationCenterDelegate {
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound, .badge])
  }
}

extension AppDelegate: MessagingDelegate {
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    // FCM 토큰 자체는 BE 등록(디바이스 토큰 API)에서 처리 — 여기서는 갱신만 수신 확인.
    NotificationCenter.default.post(
      name: Notification.Name("FCMToken"),
      object: nil,
      userInfo: ["token": fcmToken ?? ""]
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
