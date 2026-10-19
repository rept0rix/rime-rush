import UIKit
import AVFoundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Configure Audio Session for games: ambient audio allows mixing with background music
        // and respects the physical mute switch if needed.
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .ambient,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("AudioSession setup error: \(error)")
        }

        // Prevent screen dimming during gameplay
        UIApplication.shared.isIdleTimerDisabled = true

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = UIColor(red: 6/255.0, green: 16/255.0, blue: 24/255.0, alpha: 1.0)
        window.rootViewController = MainViewController()
        window.makeKeyAndVisible()
        self.window = window

        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        UIApplication.shared.isIdleTimerDisabled = true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        UIApplication.shared.isIdleTimerDisabled = false
    }
}
