import Foundation
import Combine
import CryptoKit

final class TeacherAccess: ObservableObject {
    // Legacy counts included successful logins; begin a failure-only counter.
    private let key = "dyhmTeacherFailuresV2"
    private let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    @Published private(set) var expiresAt: Date?
    var failures: Int { defaults.integer(forKey: key) }
    var canAttempt: Bool { failures < 5 }
    var hasAccess: Bool { (expiresAt ?? .distantPast) > Date() }
    func unlock(_ passcode: String) -> Bool {
        expiresAt = nil
        guard canAttempt else { return false }
        let digest = SHA256.hash(data: Data(passcode.utf8)).map { String(format: "%02x", $0) }.joined()
        guard digest == "09c2a7bba8d858ad8cdcef6f5376da964432a866098797690c22fd25468a560f" else {
            defaults.set(failures + 1, forKey: key)
            return false
        }
        expiresAt = Date().addingTimeInterval(30 * 60)
        return true
    }
    func revoke() { expiresAt = nil }
}
