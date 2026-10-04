import Foundation
import Combine
import CryptoKit

final class TeacherAccess: ObservableObject {
    private let key = "dyhmTeacherAttemptsV1"
    @Published private(set) var expiresAt: Date?
    var attempts: Int { UserDefaults.standard.integer(forKey: key) }
    var canAttempt: Bool { attempts < 5 }
    var hasAccess: Bool { (expiresAt ?? .distantPast) > Date() }
    func unlock(_ passcode: String) -> Bool {
        expiresAt = nil
        guard canAttempt else { return false }
        UserDefaults.standard.set(attempts + 1, forKey: key)
        let digest = SHA256.hash(data: Data(passcode.utf8)).map { String(format: "%02x", $0) }.joined()
        guard digest == "09c2a7bba8d858ad8cdcef6f5376da964432a866098797690c22fd25468a560f" else { return false }
        expiresAt = Date().addingTimeInterval(30 * 60)
        return true
    }
    func revoke() { expiresAt = nil }
}
