import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // 백그라운드 → 복귀 때 레이아웃이 깨졌다 돌아오는 순간을 가리는 스냅샷 덮개 (docs/ios-build.md §11 #16)
    private var coverView: UIView?

    private var bridgeWebView: WKWebView? {
        return (window?.rootViewController as? CAPBridgeViewController)?.webView
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // iPad가 스냅샷용으로 앱 크기를 바꾸기 전에, 지금의 정상 화면을 웹뷰 위에 덮어둔다.
        // 복귀 후 웹뷰가 재계산되는 동안 이 덮개가 깨진 화면을 가린다(앱 전환 화면의 미리보기도 정상으로 보임).
        guard coverView == nil,
              let webView = bridgeWebView,
              let superview = webView.superview,
              let snapshot = webView.snapshotView(afterScreenUpdates: true) else { return }
        snapshot.frame = webView.frame
        snapshot.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        superview.addSubview(snapshot)
        coverView = snapshot
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // iPad는 백그라운드 진입 시 스냅샷용으로 앱 크기를 여러 폭으로 바꾼다. 복귀 후 창 크기는 돌아오지만
        // 웹뷰의 CSS 뷰포트 단위(vw/vh) 기준이 스냅샷 때의 좁은 폭에 남아 레이아웃이 좁게 굳는다(회전하면 복구).
        // 웹뷰 크기를 1pt 바꿨다 되돌려 뷰포트를 다시 계산시킨다. (docs/ios-build.md §11 #16)
        guard let webView = bridgeWebView else { return }
        let original = webView.frame
        webView.frame = CGRect(x: original.origin.x, y: original.origin.y, width: original.width, height: original.height - 1)
        DispatchQueue.main.async {
            webView.frame = original
            // 웹이 새 크기로 레이아웃을 다시 그릴 시간을 준 뒤 덮개를 걷는다
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                guard let cover = self?.coverView else { return }
                self?.coverView = nil
                UIView.animate(withDuration: 0.15, animations: { cover.alpha = 0 }, completion: { _ in
                    cover.removeFromSuperview()
                })
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
