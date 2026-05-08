# RE:FORM — Web UI Kit (Mobile-first)

A clickable, mostly-cosmetic recreation of the RE:FORM marketplace shell. All visuals derive from `../../colors_and_type.css` and `../../reference/index.css`.

## Surfaces
- **Home** — hero "WEEKLY DRAFT" panel, sport-category chips, 2-up listing grid
- **Detail** — listing photo (jersey number placeholder), badges, price, description, seller block
- **Community** — board with tabs (인기 / 구단 / 이적시장 / 리뷰), post rows, floating compose FAB
- **Chat** — 1:1 thread list, unread pill
- **My** — profile header, stat tiles (찜/판매/구매), settings list

## Layout
- 390×780 phone frame (matches iPhone 14 logical width)
- 56px sticky GNB on top, 64px sticky tab bar on bottom
- 2-column listing grid at this width; 3 / 4 cols at desktop breakpoints (not implemented in this kit)

## Caveats
- Listing thumbnails are jersey-number placeholders on navy/red gradient with a speed-line motif. **Wire to real photos** when available.
- No real auth, no real catalogue, no real chat — interactions (tab switch, like, drill into detail) are state-only.
- Community FAB tab and Sell tab both route to the community screen for demo purposes.
- Sport-specific iconography (jersey/helmet/ball) is not present; chips use Korean labels only.
