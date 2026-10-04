import SwiftUI

private enum Palette {
    static let background = Color(red: 0.969, green: 0.953, blue: 0.914)
    static let ink = Color(red: 0.09, green: 0.23, blue: 0.23)
    static let teal = Color(red: 0.19, green: 0.48, blue: 0.45)
    static let orange = Color(red: 0.93, green: 0.56, blue: 0.22)
}

struct ContentView: View {
    @StateObject private var game = GameModel()
    @StateObject private var teacherAccess = TeacherAccess()
    @State private var attendanceText = ""
    @State private var setupError = ""
    @State private var teacherPresented = false
    @State private var needsPasscode = true
    @State private var pendingRoster = false
    @State private var passcode = ""
    @State private var titleTaps: [Date] = []
    @State private var hasClassConfiguration = false

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
        .sheet(isPresented: $teacherPresented) {
            NavigationStack {
                if needsPasscode {
                    Form {
                        Section("先生用パスコード") {
                            Text("入力できる回数：あと\(max(0, 5 - teacherAccess.attempts))回")
                            SecureField("パスコード", text: $passcode).keyboardType(.numberPad)
                            Button("開く") {
                                let allowed = teacherAccess.unlock(passcode)
                                passcode = ""
                                if allowed {
                                    if !hasClassConfiguration && !pendingRoster {
                                        game.classroom.pattern = Int.random(in: 0..<8)
                                    }
                                    hasClassConfiguration = true
                                    needsPasscode = false
                                }
                                else { teacherPresented = false; pendingRoster = false }
                            }
                            .disabled(passcode.count != 4)
                            Button("閉じる") { teacherPresented = false }
                        }
                    }
                } else {
                    TeacherView(config: $game.classroom, showRoster: pendingRoster) {
                        teacherAccess.revoke()
                        teacherPresented = false
                    }
                    .toolbar { ToolbarItem(placement: .navigationBarTrailing) { Button("タイトルへ") { teacherPresented = false } } }
                }
            }
        }
        .onReceive(Timer.publish(every: 5, on: .main, in: .common).autoconnect()) { _ in
            if teacherPresented && !needsPasscode && !teacherAccess.hasAccess { teacherPresented = false }
        }
        .onOpenURL { url in
            if game.phase == .setup, let config = ClassConfiguration.fromURL(url.absoluteString) { game.classroom = config; hasClassConfiguration = true }
        }
    }

    private var welcome: some View {
        VStack(spacing: 18) {
            Spacer()
            Text("✏️  ?  📏").font(.system(size: 70))
            eyebrow("友だちと話そう！")
            Text("Do You Have?").font(.system(size: 58, weight: .heavy, design: .rounded)).minimumScaleFactor(0.7).lineLimit(1)
                .onTapGesture {
                    titleTaps = titleTaps.filter { Date().timeIntervalSince($0) < 1.8 }
                    titleTaps.append(Date())
                    if titleTaps.count >= 3 {
                        titleTaps = []
                        if teacherAccess.canAttempt { passcode = ""; needsPasscode = true; teacherPresented = true }
                    }
                }
            Text("同じ持ち物の友だちを見つけよう").font(.title2).foregroundStyle(Palette.teal)
            Text("出席番号を入れてね（1〜40）").font(.headline)
            TextField("1–40", text: $attendanceText)
                .keyboardType(.numberPad).multilineTextAlignment(.center)
                .font(.largeTitle.bold()).padding(10).frame(width: 170)
                .background(.white, in: RoundedRectangle(cornerRadius: 14))
                .onChange(of: attendanceText) { value in attendanceText = String(value.filter(\.isNumber).prefix(2)) }
            action("はじめる", primary: true) {
                if attendanceText == "99" {
                    pendingRoster = true
                    if teacherAccess.hasAccess { needsPasscode = false; teacherPresented = true }
                    else { setupError = "先生用です。タイトルから先生用メニューを開いてください。" }
                } else if let number = Int(attendanceText), game.begin(number) {
                    teacherAccess.revoke(); pendingRoster = false; setupError = ""; titleTaps = []
                } else { setupError = "出席番号を1〜40で入れてね。進めないときは先生に聞いてね。" }
            }
            Text(setupError).font(.footnote).foregroundStyle(.orange)
            Text("配布 \(game.classroom.pattern + 1) · \(game.classroom.selected.count)種類 · \(game.classroom.present.count)人").font(.caption).foregroundStyle(.secondary)
            Spacer()
        }
    }

    private func gameScreen(height: CGFloat) -> some View {
        VStack(spacing: 16) {
            if game.phase == .playing {
                HStack {
                    VStack(alignment: .leading) {
                        eyebrow("タイム")
                        Text(game.formattedTime).font(.system(size: 42, weight: .heavy, design: .rounded)).monospacedDigit()
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("\(game.matchCount) / 3").font(.system(size: 38, weight: .heavy, design: .rounded))
                        eyebrow("3枚そろえよう")
                    }
                }
            } else {
                eyebrow(game.phase == .memorize ? "カードと場所をおぼえよう" : "友だちに英語で聞いてみよう")
                Text(game.phase == .memorize ? "自分の持ち物" : "じゅんびはいい？")
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
                    .accessibilityLabel("カード\(index + 1)、\(game.faceUp[index] ? game.items[index].displayName : "うら向き")")
                }
            }
            if game.phase == .playing {
                Text(game.showPenalty ? "+5秒" : " ").font(.title3.bold()).foregroundStyle(Color(red: 0.84, green: 0.4, blue: 0.21)).frame(height: 28)
                HStack(spacing: 16) {
                    action("次の友だちへ", primary: false, action: game.nextPerson)
                    action("そろった！", primary: true, enabled: game.matchCount >= 3, action: game.match)
                }
            } else {
                Spacer(minLength: 0)
                action(game.phase == .memorize ? "おぼえた！" : "スタート", primary: true, action: game.phase == .memorize ? game.ready : game.start)
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
            Text("そろった！").font(.system(size: 76, weight: .heavy, design: .rounded)).foregroundStyle(Palette.teal).minimumScaleFactor(0.7)
            eyebrow("2人が持っているもの")
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
            Text("英語で言ってみよう").font(.headline).foregroundStyle(Palette.teal)
            Text(game.sentence).font(.title2.bold()).multilineTextAlignment(.center).padding(.vertical, 8)
            eyebrow("タイム")
            Text(game.formattedTime).font(.system(size: 54, weight: .heavy, design: .rounded)).monospacedDigit()
            action("もう一度あそぶ", primary: true, action: game.reset)
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
