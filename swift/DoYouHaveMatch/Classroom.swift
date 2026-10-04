import Foundation

struct Item: Identifiable, Equatable {
    let id: String
    let displayName: String
    let japanese: String
    let icon: String
    let phraseForSentence: String
    static let pool: [Item] = [
        .init(id: "pencil", displayName: "pencil", japanese: "えんぴつ", icon: "✏️", phraseForSentence: "a pencil"),
        .init(id: "pen", displayName: "pen", japanese: "ペン", icon: "🖊️", phraseForSentence: "a pen"),
        .init(id: "ruler", displayName: "ruler", japanese: "ものさし", icon: "📏", phraseForSentence: "a ruler"),
        .init(id: "eraser", displayName: "eraser", japanese: "消しゴム", icon: "🧽", phraseForSentence: "an eraser"),
        .init(id: "glue", displayName: "glue", japanese: "のり", icon: "🧴", phraseForSentence: "glue"),
        .init(id: "scissors", displayName: "scissors", japanese: "はさみ", icon: "✂️", phraseForSentence: "scissors"),
        .init(id: "notebook", displayName: "notebook", japanese: "ノート", icon: "📓", phraseForSentence: "a notebook"),
        .init(id: "pencil-case", displayName: "pencil case", japanese: "ふでばこ", icon: "👝", phraseForSentence: "a pencil case"),
        .init(id: "marker", displayName: "marker", japanese: "マーカー", icon: "🖍️", phraseForSentence: "a marker"),
        .init(id: "crayon", displayName: "crayon", japanese: "クレヨン", icon: "🖍️", phraseForSentence: "a crayon")
    ]
}

struct SeededGenerator {
    var state: UInt32
    mutating func next() -> Double {
        state = state &+ 0x6D2B79F5
        var value = (state ^ (state >> 15)) &* (1 | state)
        value ^= value &+ ((value ^ (value >> 7)) &* (61 | value))
        return Double(value ^ (value >> 14)) / 4294967296
    }
    mutating func shuffle<T>(_ values: [T]) -> [T] {
        var copy = values
        guard copy.count > 1 else { return copy }
        for index in stride(from: copy.count - 1, through: 1, by: -1) {
            copy.swapAt(index, Int(next() * Double(index + 1)))
        }
        return copy
    }
}

struct ClassConfiguration: Codable, Equatable {
    var version = 1
    var selected = Item.pool.map(\.id)
    var present = Array(1...40)
    var pattern = 0
    static let seeds: [UInt32] = [1729, 4093, 7919, 12347, 24593, 49157, 65537, 99991]
    var isValid: Bool {
        version == 1 && (4...10).contains(selected.count) && Set(selected).count == selected.count &&
        selected.allSatisfy { id in Item.pool.contains { $0.id == id } } &&
        (2...40).contains(present.count) && Set(present).count == present.count &&
        present.allSatisfy { (1...40).contains($0) } && Self.seeds.indices.contains(pattern)
    }
    func assignments() -> [Int: [Item]] {
        guard isValid else { return [:] }
        let seed = Self.seeds[pattern]
        var random = SeededGenerator(state: seed)
        let roster = random.shuffle(present.sorted())
        let pool = Item.pool.filter { selected.contains($0.id) }
        let groupCount = max(1, roster.count / 5)
        let baseSize = roster.count / groupCount
        let extra = roster.count % groupCount
        var result: [Int: [Item]] = [:]
        var offset = 0
        for group in 0..<groupCount {
            let size = baseSize + (group < extra ? 1 : 0)
            let members = Array(roster[offset..<(offset + size)])
            offset += size
            let groupPool = Array(random.shuffle(pool).prefix(5))
            for (index, number) in members.enumerated() {
                let cards = groupPool.enumerated().compactMap { cardIndex, item in
                    groupPool.count == 4 || cardIndex != (index + pattern) % 5 ? item : nil
                }
                var cardRandom = SeededGenerator(state: seed ^ (UInt32(number) &* 2654435761))
                result[number] = cardRandom.shuffle(cards)
            }
        }
        return result
    }
    func partners() -> [Int: [Int]] {
        let deals = assignments()
        var result: [Int: [Int]] = [:]
        for number in present.sorted() {
            guard let cards = deals[number] else { continue }
            let ids = Set(cards.map(\.id))
            result[number] = present.sorted().filter { other in
                other != number && (deals[other]?.filter { ids.contains($0.id) }.count ?? 0) >= 3
            }
        }
        return result
    }
    var randomMatchProbability: Double {
        guard isValid else { return 0 }
        let count = Double(selected.count)
        return (1 + 4 * (count - 4)) / (count * (count - 1) * (count - 2) * (count - 3) / 24)
    }
    var sharedURL: URL? {
        guard isValid, let data = try? JSONEncoder().encode(self) else { return nil }
        let code = data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        return URL(string: "https://ryonma-git.github.io/DoYouHave-Match/#class=\(code)")
    }
    static func fromURL(_ text: String) -> ClassConfiguration? {
        guard let url = URL(string: text), let fragment = url.fragment,
              let code = URLComponents(string: "https://local/?\(fragment)")?.queryItems?.first(where: { $0.name == "class" })?.value,
              code.count <= 2000 else { return nil }
        var base64 = code.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64), let config = try? JSONDecoder().decode(ClassConfiguration.self, from: data), config.isValid else { return nil }
        return config
    }
}
