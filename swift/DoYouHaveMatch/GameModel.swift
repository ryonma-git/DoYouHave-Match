import Foundation
import Combine

enum Phase { case setup, memorize, ready, playing, result }

enum Scoring {
    static let base = 1000
    static let timeLimit = 180
    static let reveal = 10
    static let next = 20
    static let overtime = 2
}

/// An item source can later be replaced by items earned in Color Hunt.
protocol ItemProviding { func makeItems() -> [Item] }

final class GameModel: ObservableObject {
    @Published private(set) var phase: Phase = .setup
    @Published private(set) var items: [Item] = []
    @Published private(set) var faceUp = [false, false, false, false]
    @Published private(set) var displayedSeconds = 0
    @Published private(set) var penaltyNotice = ""
    @Published private(set) var revealCount = 0
    @Published private(set) var nextCount = 0

    @Published var classroom = ClassConfiguration()
    @Published private(set) var attendance = 0
    private let itemProvider: ItemProviding?
    private let now: () -> Date
    private var startedAt: Date?
    private var timer: Timer?
    private var penaltyTask: DispatchWorkItem?

    init(itemProvider: ItemProviding? = nil, now: @escaping () -> Date = Date.init) {
        self.itemProvider = itemProvider
        self.now = now
    }

    var matchCount: Int { faceUp.filter { $0 }.count }
    var matchedItems: [Item] { items.enumerated().compactMap { faceUp[$0.offset] ? $0.element : nil } }
    var formattedTime: String { String(format: "%02d:%02d", displayedSeconds / 60, displayedSeconds % 60) }
    var remainingSeconds: Int { max(0, Scoring.timeLimit - displayedSeconds) }
    var overtimeSeconds: Int { max(0, displayedSeconds - Scoring.timeLimit) }
    var score: Int { max(0, Scoring.base + remainingSeconds - revealCount * Scoring.reveal - nextCount * Scoring.next - overtimeSeconds * Scoring.overtime) }
    var countdown: String {
        let seconds = overtimeSeconds > 0 ? overtimeSeconds : remainingSeconds
        return String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }

    var sentence: String {
        let parts = matchedItems.map(\.phraseForSentence)
        switch parts.count {
        case 0: return ""
        case 1: return "I have \(parts[0])."
        case 2: return "I have \(parts[0]) and \(parts[1])."
        default: return "I have \(parts.dropLast().joined(separator: ", ")), and \(parts.last!)."
        }
    }

    @discardableResult
    func begin(_ number: Int) -> Bool {
        guard phase == .setup, (1...40).contains(number), classroom.present.contains(number), classroom.isValid else { return false }
        let cards = itemProvider?.makeItems() ?? classroom.assignments()[number] ?? []
        guard cards.count == 4, Set(cards.map(\.id)).count == 4 else { return false }
        attendance = number
        items = cards
        faceUp = [true, true, true, true]
        phase = .memorize
        return true
    }

    func ready() {
        guard phase == .memorize else { return }
        faceUp = [false, false, false, false]
        phase = .ready
    }

    func start() {
        guard phase == .ready else { return }
        startedAt = now()
        phase = .playing
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in self?.updateTime() }
    }

    private func updateTime() {
        guard let startedAt, phase == .playing else { return }
        displayedSeconds = max(0, Int(now().timeIntervalSince(startedAt)))
    }

    func flip(_ index: Int) {
        guard phase == .playing, faceUp.indices.contains(index) else { return }
        updateTime()
        if !faceUp[index] {
            revealCount += 1
            showNotice("カードを見た：−\(Scoring.reveal)点")
        }
        faceUp[index].toggle()
    }

    func nextPerson() {
        guard phase == .playing else { return }
        updateTime()
        faceUp = [false, false, false, false]
        nextCount += 1
        showNotice("次の友だちへ：−\(Scoring.next)点")
    }

    private func showNotice(_ message: String) {
        penaltyNotice = message
        penaltyTask?.cancel()
        let task = DispatchWorkItem { [weak self] in self?.penaltyNotice = "" }
        penaltyTask = task
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1, execute: task)
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
        attendance = 0
        items = []
        faceUp = [false, false, false, false]
        displayedSeconds = 0
        revealCount = 0
        nextCount = 0
        startedAt = nil
        penaltyNotice = ""
    }

    deinit { timer?.invalidate(); penaltyTask?.cancel() }
}
