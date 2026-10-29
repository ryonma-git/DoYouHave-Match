import Foundation

@main
struct SwiftScoringTests {
    static func main() {
        var time = Date(timeIntervalSince1970: 0)
        let game = GameModel(now: { time })
        precondition(game.begin(1))
        game.flip(0); game.nextPerson()
        precondition(game.revealCount == 0 && game.nextCount == 0)
        game.ready(); game.start()
        for index in 0..<4 { game.flip(index) }
        game.nextPerson()
        precondition(game.score == 1120 && game.displayedSeconds == 0)
        game.flip(0); game.flip(0); game.flip(0)
        precondition(game.score == 1100 && game.revealCount == 6)
        time = Date(timeIntervalSince1970: 180)
        game.flip(0) // Closing refreshes the clock without charging points.
        precondition(game.remainingSeconds == 0 && game.overtimeSeconds == 0 && game.score == 920)
        time = Date(timeIntervalSince1970: 181)
        game.flip(0); game.flip(1); game.flip(2)
        precondition(game.score == 888 && game.countdown == "00:01")
        game.match()
        time = Date(timeIntervalSince1970: 999)
        game.flip(3); game.nextPerson(); game.match()
        precondition(game.phase == .result && game.score == 888 && game.displayedSeconds == 181)
        game.reset()
        precondition(game.score == 1180 && game.revealCount == 0 && game.nextCount == 0)
        precondition(game.begin(1))
        game.ready(); game.start()
        time = Date(timeIntervalSince1970: 1999)
        game.flip(0); game.flip(1); game.flip(2); game.match()
        precondition(game.phase == .result && game.score == 0)
        print("Swift scoring: reveals, skips, overtime, frozen results, zero floor and reset verified")
    }
}
