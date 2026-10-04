import Foundation
import Combine

struct Item: Identifiable, Equatable {
    let id: String
    let displayName: String
    let icon: String
    let phraseForSentence: String

    static let pool: [Item] = [
        .init(id: "pencil", displayName: "pencil", icon: "✏️", phraseForSentence: "a pencil"),
        .init(id: "pen", displayName: "pen", icon: "🖊️", phraseForSentence: "a pen"),
        .init(id: "ruler", displayName: "ruler", icon: "📏", phraseForSentence: "a ruler"),
        .init(id: "eraser", displayName: "eraser", icon: "🧽", phraseForSentence: "an eraser"),
        .init(id: "glue", displayName: "glue", icon: "🧴", phraseForSentence: "glue")
    ]
}

enum Phase { case setup, memorize, ready, playing, result }

/// An item source can later be replaced by items earned in Color Hunt.
protocol ItemProviding { func makeItems() -> [Item] }

struct ClassroomItemProvider: ItemProviding {
    func makeItems() -> [Item] {
        // Any two four-item subsets of this five-item pool share at least three items.
        Array(Item.pool.shuffled().prefix(4))
    }
}

final class GameModel: ObservableObject {
    @Published private(set) var phase: Phase = .setup
    @Published private(set) var items: [Item] = []
    @Published private(set) var faceUp = [false, false, false, false]
    @Published private(set) var displayedSeconds = 0
    @Published private(set) var showPenalty = false

    private let itemProvider: ItemProviding
    private var startedAt: Date?
    private var penaltySeconds = 0
    private var timer: Timer?
    private var penaltyTask: DispatchWorkItem?

    init(itemProvider: ItemProviding = ClassroomItemProvider()) {
        self.itemProvider = itemProvider
    }

    var matchCount: Int { faceUp.filter { $0 }.count }
    var matchedItems: [Item] { items.enumerated().compactMap { faceUp[$0.offset] ? $0.element : nil } }
    var formattedTime: String { String(format: "%02d:%02d", displayedSeconds / 60, displayedSeconds % 60) }

    var sentence: String {
        let parts = matchedItems.map(\.phraseForSentence)
        switch parts.count {
        case 0: return ""
        case 1: return "I have \(parts[0])."
        case 2: return "I have \(parts[0]) and \(parts[1])."
        default: return "I have \(parts.dropLast().joined(separator: ", ")), and \(parts.last!)."
        }
    }

    func begin() {
        guard phase == .setup else { return }
        items = itemProvider.makeItems()
        guard items.count == 4, Set(items.map(\.id)).count == 4 else { return }
        faceUp = [true, true, true, true]
        phase = .memorize
    }

    func ready() {
        guard phase == .memorize else { return }
        faceUp = [false, false, false, false]
        phase = .ready
    }

    func start() {
        guard phase == .ready else { return }
        startedAt = Date()
        phase = .playing
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in self?.updateTime() }
    }

    private func updateTime() {
        guard let startedAt, phase == .playing else { return }
        displayedSeconds = max(0, Int(Date().timeIntervalSince(startedAt))) + penaltySeconds
    }

    func flip(_ index: Int) {
        guard phase == .playing, faceUp.indices.contains(index) else { return }
        if faceUp[index] {
            penaltySeconds += 5
            updateTime()
            showPenalty = true
            penaltyTask?.cancel()
            let task = DispatchWorkItem { [weak self] in self?.showPenalty = false }
            penaltyTask = task
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.1, execute: task)
        }
        faceUp[index].toggle()
    }

    func nextPerson() {
        guard phase == .playing else { return }
        faceUp = [false, false, false, false]
        showPenalty = false
        penaltyTask?.cancel()
    }

    func match() {
        guard phase == .playing, matchCount >= 3 else { return }
        updateTime()
        timer?.invalidate()
        timer = nil
        phase = .result
    }

    func reset() {
        timer?.invalidate()
        timer = nil
        penaltyTask?.cancel()
        phase = .setup
        items = []
        faceUp = [false, false, false, false]
        displayedSeconds = 0
        penaltySeconds = 0
        startedAt = nil
        showPenalty = false
    }

    deinit { timer?.invalidate(); penaltyTask?.cancel() }
}
