import UIKit
import WebKit
import UserNotifications

class MainViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {

    private static let appURL = URL(string: "https://rime-rush.vercel.app")!

    private var webView: WKWebView!
    private var loadingIndicator: UIActivityIndicatorView!
    private var offlineView: UIView?

    // Haptic feedback generators
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let notificationFeedback = UINotificationFeedbackGenerator()
    private let selectionFeedback = UISelectionFeedbackGenerator()

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    override var prefersHomeIndicatorAutoHidden: Bool {
        return true
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 6/255.0, green: 16/255.0, blue: 24/255.0, alpha: 1.0)

        setupWebView()
        setupLoadingIndicator()
        loadGame()

        // Prepare haptics
        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
        notificationFeedback.prepare()
    }

    private func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        // Register JS Haptics & Notifications bridges
        let contentController = WKUserContentController()
        contentController.add(self, name: "haptics")
        contentController.add(self, name: "notifications")
        configuration.userContentController = contentController

        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = preferences

        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 6/255.0, green: 16/255.0, blue: 24/255.0, alpha: 1.0)

        // Game canvas handles all gestures: disable bounce to prevent pull-to-refresh glitches
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.backgroundColor = UIColor(red: 6/255.0, green: 16/255.0, blue: 24/255.0, alpha: 1.0)
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false

        // Custom user-agent so web app can identify native iOS wrapper
        let existingUA = webView.customUserAgent ?? ""
        webView.customUserAgent = existingUA.isEmpty ? "RimeRush-iOS/1.0.0 (NativeApp)" : "\(existingUA) RimeRush-iOS/1.0.0 (NativeApp)"

        view.addSubview(webView)
    }

    private func setupLoadingIndicator() {
        loadingIndicator = UIActivityIndicatorView(style: .large)
        loadingIndicator.color = UIColor(red: 126/255.0, green: 231/255.0, blue: 255/255.0, alpha: 1.0) // Ice cyan
        loadingIndicator.center = view.center
        loadingIndicator.hidesWhenStopped = true
        view.addSubview(loadingIndicator)
    }

    private func loadGame() {
        loadingIndicator.startAnimating()
        hideOfflineView()
        let request = URLRequest(url: Self.appURL, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 20.0)
        webView.load(request)
    }

    // MARK: - WKScriptMessageHandler (Haptics & Notifications Bridges)

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "notifications" {
            handleNotificationMessage(message.body)
            return
        }

        guard message.name == "haptics" else { return }

        var hapticType = "light"

        if let str = message.body as? String {
            hapticType = str
        } else if let dict = message.body as? [String: Any], let type = dict["type"] as? String {
            hapticType = type
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            switch hapticType {
            case "heavy":
                self.heavyImpact.impactOccurred()
                self.heavyImpact.prepare()
            case "medium":
                self.mediumImpact.impactOccurred()
                self.mediumImpact.prepare()
            case "light":
                self.lightImpact.impactOccurred()
                self.lightImpact.prepare()
            case "success":
                self.notificationFeedback.notificationOccurred(.success)
                self.notificationFeedback.prepare()
            case "warning":
                self.notificationFeedback.notificationOccurred(.warning)
                self.notificationFeedback.prepare()
            case "error":
                self.notificationFeedback.notificationOccurred(.error)
                self.notificationFeedback.prepare()
            case "selection":
                self.selectionFeedback.selectionChanged()
                self.selectionFeedback.prepare()
            default:
                self.lightImpact.impactOccurred()
                self.lightImpact.prepare()
            }
        }
    }

    private func handleNotificationMessage(_ body: Any) {
        guard let dict = body as? [String: Any], let action = dict["action"] as? String else { return }
        if action == "request" {
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        } else if action == "push" {
            let title = dict["title"] as? String ?? "RIME RUSH"
            let msgBody = dict["body"] as? String ?? ""
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = msgBody
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1.0, repeats: false)
            let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loadingIndicator.stopAnimating()
        hideOfflineView()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        loadingIndicator.stopAnimating()
        showOfflineView()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        loadingIndicator.stopAnimating()
        showOfflineView()
    }

    // MARK: - WKUIDelegate (Native Alerts & OAuth Popups)

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = UIAlertController(title: "RIME RUSH", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = UIAlertController(title: "RIME RUSH", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    // MARK: - Offline View

    private func showOfflineView() {
        if offlineView != nil { return }

        let container = UIView(frame: view.bounds)
        container.backgroundColor = UIColor(red: 6/255.0, green: 16/255.0, blue: 24/255.0, alpha: 1.0)
        container.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Connection Required"
        titleLabel.font = UIFont.systemFont(ofSize: 22, weight: .bold)
        titleLabel.textColor = UIColor(red: 126/255.0, green: 231/255.0, blue: 255/255.0, alpha: 1.0) // Ice
        titleLabel.textAlignment = .center

        let descLabel = UILabel()
        descLabel.text = "Please connect to the internet to climb the Frost Tower."
        descLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        descLabel.textColor = UIColor(red: 196/255.0, green: 168/255.0, blue: 130/255.0, alpha: 1.0) // Muted gold
        descLabel.textAlignment = .center
        descLabel.numberOfLines = 0

        var config = UIButton.Configuration.filled()
        config.baseBackgroundColor = UIColor(red: 126/255.0, green: 231/255.0, blue: 255/255.0, alpha: 1.0)
        config.baseForegroundColor = UIColor(red: 6/255.0, green: 16/255.0, blue: 24/255.0, alpha: 1.0)
        config.cornerStyle = .capsule
        config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 32, bottom: 12, trailing: 32)
        var titleAttr = AttributedString("Retry")
        titleAttr.font = UIFont.systemFont(ofSize: 17, weight: .bold)
        config.attributedTitle = titleAttr

        let retryButton = UIButton(configuration: config)
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)

        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(descLabel)
        stack.addArrangedSubview(retryButton)

        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: container.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: container.trailingAnchor, constant: -32)
        ])

        view.addSubview(container)
        offlineView = container
    }

    private func hideOfflineView() {
        offlineView?.removeFromSuperview()
        offlineView = nil
    }

    @objc private func retryTapped() {
        hideOfflineView()
        loadGame()
    }
}
