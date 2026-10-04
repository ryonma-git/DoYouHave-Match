import Foundation

@main
struct SwiftTeacherAccessTests {
    static func main() {
        let suite = "DoYouHaveMatch.Test.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        defaults.set(5, forKey: "dyhmTeacherAttemptsV1")
        let access = TeacherAccess(defaults: defaults)
        precondition(access.failures == 0)
        for _ in 0..<8 {
            precondition(access.unlock("2891"))
            precondition(access.failures == 0)
        }
        for count in 1...4 {
            precondition(!access.unlock("0000"))
            precondition(!access.hasAccess)
            precondition(access.failures == count)
            precondition(access.unlock("2891"))
            precondition(access.failures == count)
        }
        precondition(!access.unlock("0000"))
        precondition(access.failures == 5)
        precondition(!access.canAttempt)
        precondition(!access.unlock("2891"))
        precondition(TeacherAccess(defaults: defaults).failures == 5)
        print("Swift: success allowance, five failures, persistence and legacy counter verified")
    }
}
