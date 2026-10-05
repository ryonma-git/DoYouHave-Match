import SwiftUI

struct TeacherView: View {
    @Binding var config: ClassConfiguration
    let closeAndLock: () -> Void
    @State private var importURL = ""
    @State private var importError = ""
    var body: some View {
        Form {
            Section("使用するアイテム（4〜10種類）") {
                Button("10種類すべて使う") { config.selected = Item.pool.map(\.id) }
                Text("交流には10種類がおすすめです。")
                if config.selected.count <= 5 {
                    Text("4〜5種類では、どの相手とも3枚以上そろいます。何人かに聞いて探す活動には、10種類を使ってください。")
                }
                ForEach(Item.pool) { item in
                    Toggle(isOn: Binding(
                        get: { config.selected.contains(item.id) },
                        set: { checked in
                            if checked { config.selected.append(item.id) }
                            else { config.selected.removeAll { $0 == item.id } }
                        }
                    )) {
                        HStack(spacing: 12) {
                            ItemArtwork(item: item).frame(width: 104, height: 59)
                            Text("\(item.displayName) / \(item.japanese)")
                        }
                    }
                }
                Text("提供いただいた画像を使っています。クレヨンのみ絵文字です。児童には選択した中から4種類を配ります。")
            }
            Section("出席者（2〜40人）") {
                Text("欠席・対象外の番号を外してください。変更すると配布を組み直します。")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8)) {
                    ForEach(1...40, id: \.self) { number in
                        Button {
                            if config.present.contains(number) { config.present.removeAll { $0 == number } }
                            else { config.present.append(number); config.present.sort() }
                        } label: {
                            Text("\(number)").font(.headline).frame(maxWidth: .infinity).frame(height: 44)
                                .background(config.present.contains(number) ? Color.teal : Color.gray.opacity(0.2), in: RoundedRectangle(cornerRadius: 8))
                                .foregroundStyle(config.present.contains(number) ? Color.white : Color.gray)
                        }.buttonStyle(.plain)
                    }
                }
            }
            Section("配布パターン") {
                Picker("パターン", selection: $config.pattern) {
                    ForEach(0..<8, id: \.self) { Text("パターン \($0 + 1)").tag($0) }
                }
                Button("ランダムに選び直す") {
                    config.pattern = (0..<8).filter { $0 != config.pattern }.randomElement()!
                }
                if config.isValid {
                    let partners = config.partners()
                    let count = config.present.count
                    let matches = partners.values.reduce(0) { $0 + $1.count } / 2
                    let pairs = count * (count - 1) / 2
                    let minimum = partners.values.map(\.count).min() ?? 0
                    let expectedContacts = partners.values.reduce(0.0) { $0 + Double(count) / Double($1.count + 1) } / Double(count)
                    Text("完全に無作為な配布の目安：\(config.randomMatchProbability * 100, specifier: "%.1f")%")
                    Text("最初の相手とマッチする目安：\(matches) / \(pairs)組（\(Double(matches) / Double(pairs) * 100, specifier: "%.1f")%）")
                    Text("別の相手に順に聞くと、マッチまで平均\(expectedContacts, specifier: "%.1f")人。相手を無作為に選ぶ場合の目安です。")
                    Text("各児童に最少\(minimum)人の候補。配布後に最大\(max(0, minimum - 1))人の追加欠席が出ても、全員に候補が残ります。")
                } else { Text("アイテムを4〜10種類、出席者を2〜40人選んでください。").foregroundStyle(.red) }
            }
            if let url = config.sharedURL {
                Section("授業URL") {
                    ShareLink("全員に同じURLを配る", item: url)
                    Text(url.absoluteString).font(.caption).textSelection(.enabled)
                    Text("このURLでWeb版に同じ配布を再現できます。変更後は新しいURLを全員に配り直してください。")
                }
            }
            Section("授業URLを読み込む") {
                TextField("先生から配られたURL", text: $importURL).textInputAutocapitalization(.never).autocorrectionDisabled()
                Button("読み込む") {
                    if let imported = ClassConfiguration.fromURL(importURL) { config = imported; importError = "読み込みました。" }
                    else { importError = "授業URLを確認してください。" }
                }
                Text(importError)
            }
            Section { Text("配布一覧はタイトル画面で出席番号99を入力すると、パスコードなしで確認できます。") }
            Section { Button("閉じてロック", action: closeAndLock) }
        }
        .navigationTitle("先生用メニュー")
    }
}
