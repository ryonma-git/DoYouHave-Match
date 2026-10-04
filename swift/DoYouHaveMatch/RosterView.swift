import SwiftUI

struct RosterView: View {
    let config: ClassConfiguration
    var body: some View {
        List {
            Section {
                Text("パターン \(config.pattern + 1) · \(config.selected.count)種類 · \(config.present.count)人")
                Text("カードは左上・右上・左下・右下の順です。この画面では設定を変更できません。")
            }
            if config.isValid {
                let deals = config.assignments()
                let partners = config.partners()
                ForEach(1...40, id: \.self) { number in
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(number)番").bold()
                        if let items = deals[number] {
                            Text(items.map(\.displayName).joined(separator: " / "))
                            Text("候補：\((partners[number] ?? []).map(String.init).joined(separator: ", "))").font(.caption).foregroundStyle(.secondary)
                        } else { Text("欠席・対象外").foregroundStyle(.secondary) }
                    }
                }
            } else { Text("授業設定を確認してください。") }
        }
        .navigationTitle("配布一覧（99）")
    }
}
