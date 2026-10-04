import SwiftUI

private enum Palette {
    static let background = Color(red: 0.969, green: 0.953, blue: 0.914)
    static let ink = Color(red: 0.09, green: 0.23, blue: 0.23)
    static let teal = Color(red: 0.19, green: 0.48, blue: 0.45)
    static let orange = Color(red: 0.93, green: 0.56, blue: 0.22)
}

struct ContentView: View {
    @StateObject private var game = GameModel()

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 18) {
                switch game.phase {
                case .setup: welcome
                case .memorize, .ready, .playing: gameScreen(height: geometry.size.height)
                case .result: result
                }
            }
            .frame(maxWidth: 820, maxHeight: .infinity)
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.background.ignoresSafeArea())
            .foregroundStyle(Palette.ink)
        }
    }

    private var welcome: some View {
        VStack(spacing: 18) {
            Spacer()
            Text("✏️  ?  📏").font(.system(size: 70))
            eyebrow("LET'S TALK!")
            Text("Do You Have?").font(.system(size: 58, weight: .heavy, design: .rounded)).minimumScaleFactor(0.7).lineLimit(1)
            Text("Ask. Remember. Match.").font(.title2).foregroundStyle(Palette.teal)
            action("LET’S PLAY", primary: true, action: game.begin).padding(.top, 24)
            Spacer()
        }
    }

    private func gameScreen(height: CGFloat) -> some View {
        VStack(spacing: 16) {
            if game.phase == .playing {
                HStack {
                    VStack(alignment: .leading) {
                        eyebrow("TIME")
                        Text(game.formattedTime).font(.system(size: 42, weight: .heavy, design: .rounded)).monospacedDigit()
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("\(game.matchCount) / 3").font(.system(size: 38, weight: .heavy, design: .rounded))
                        eyebrow("MATCH")
                    }
                }
            } else {
                eyebrow(game.phase == .memorize ? "LOOK & REMEMBER" : "TIME TO TALK")
                Text(game.phase == .memorize ? "YOUR ITEMS" : "Remember your items?")
                    .font(.system(size: 43, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.65).lineLimit(1)
            }
            let columns = [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)]
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(game.items.indices, id: \.self) { index in
                    Button { withAnimation(.easeInOut(duration: 0.18)) { game.flip(index) } } label: {
                        card(index)
                            .frame(height: max(110, min(220, (height - 245) / 2)))
                    }
                    .buttonStyle(.plain)
                    .disabled(game.phase != .playing)
                    .accessibilityLabel("Card \(index + 1), \(game.faceUp[index] ? game.items[index].displayName : "face down")")
                }
            }
            if game.phase == .playing {
                Text(game.showPenalty ? "+5 sec" : " ").font(.title3.bold()).foregroundStyle(Color(red: 0.84, green: 0.4, blue: 0.21)).frame(height: 28)
                HStack(spacing: 16) {
                    action("NEXT PERSON", primary: false, action: game.nextPerson)
                    action("MATCH!", primary: true, enabled: game.matchCount >= 3, action: game.match)
                }
            } else {
                Spacer(minLength: 0)
                action(game.phase == .memorize ? "I'm ready!" : "START", primary: true, action: game.phase == .memorize ? game.ready : game.start)
            }
        }
    }

    private func card(_ index: Int) -> some View {
        let up = game.faceUp[index]
        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 24)
                .fill(up ? Color.white : Palette.teal)
                .shadow(color: .black.opacity(0.12), radius: 0, y: 7)
            Text("\(index + 1)").font(.headline).foregroundStyle(up ? Palette.ink.opacity(0.55) : .white.opacity(0.65)).padding(14)
            VStack(spacing: 2) {
                if up {
                    Text(game.items[index].icon).font(.system(size: 65))
                    Text(game.items[index].displayName).font(.system(size: 27, weight: .heavy, design: .rounded)).minimumScaleFactor(0.7).lineLimit(1)
                } else {
                    Text("?").font(.system(size: 85, weight: .heavy, design: .rounded)).foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var result: some View {
        VStack(spacing: 18) {
            Spacer()
            Text("✦  ✧  ✦").font(.largeTitle).foregroundStyle(Palette.orange)
            Text("MATCH!").font(.system(size: 76, weight: .heavy, design: .rounded)).foregroundStyle(Palette.teal).minimumScaleFactor(0.7)
            eyebrow("YOU BOTH HAVE...")
            HStack(spacing: 12) {
                ForEach(game.matchedItems) { item in
                    VStack {
                        Text(item.icon).font(.system(size: 44))
                        Text(item.displayName).font(.title3.bold())
                    }
                    .frame(minWidth: 110).padding(12)
                    .background(.white, in: RoundedRectangle(cornerRadius: 18))
                }
            }
            Text(game.sentence).font(.title2.bold()).multilineTextAlignment(.center).padding(.vertical, 8)
            eyebrow("TIME")
            Text(game.formattedTime).font(.system(size: 54, weight: .heavy, design: .rounded)).monospacedDigit()
            action("PLAY AGAIN", primary: true, action: game.reset)
            Spacer()
        }
    }

    private func eyebrow(_ text: String) -> some View {
        Text(text).font(.system(size: 16, weight: .heavy, design: .rounded)).tracking(2).foregroundStyle(Palette.teal)
    }

    private func action(_ title: String, primary: Bool, enabled: Bool = true, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.system(size: 23, weight: .heavy, design: .rounded)).frame(maxWidth: .infinity).frame(height: 68)
                .background(enabled ? (primary ? Palette.orange : .white) : Color.gray.opacity(0.35), in: RoundedRectangle(cornerRadius: 20))
                .foregroundStyle(primary ? .white : Palette.teal)
        }
        .disabled(!enabled)
        .frame(maxWidth: 330)
    }
}
