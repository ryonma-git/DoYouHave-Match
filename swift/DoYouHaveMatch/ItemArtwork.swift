import SwiftUI

struct ItemArtwork: View {
    let item: Item
    var body: some View {
        Group {
            if let name = item.imageName {
                Image(name).resizable().scaledToFit()
            } else {
                Text(item.icon).font(.system(size: 55))
            }
        }
        .accessibilityHidden(true)
    }
}
