import Foundation

@main
struct SwiftParity {
    struct Fixture: Decodable { let config: ClassConfiguration; let expected: [String: [String]] }
    static func main() throws {
        let fixtures = try JSONDecoder().decode([Fixture].self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
        for fixture in fixtures {
            let config = fixture.config
            let actual = Dictionary(uniqueKeysWithValues: config.assignments().map { (String($0.key), $0.value.map(\.id)) })
            precondition(actual == fixture.expected, "Swift/Web card order mismatch")
            precondition(config.partners().values.allSatisfy { !$0.isEmpty })
            precondition(ClassConfiguration.fromURL(config.sharedURL!.absoluteString) == config)
        }
        print("Swift/Web exact card order matched for \(fixtures.count) class configurations")
    }
}
