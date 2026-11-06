# Card Hub Navigation & Single-Level Accordion UX Redesign

Restructures the **Card Hub** workspace to eliminate stacked, multi-level sub-menus along vertical scroll—introducing a **single-level collapsible accordion architecture** paired with a **compact sticky mini-card preview bar on mobile** (expanding full-screen on tap) and a **side-by-side live preview on desktop**, preserving 100% of existing capabilities with zero menu clutter.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions incorporate your confirmed preferences from our design alignment:

- **Confirmed Decision 1 — Navigation Branding ("Card Hub")**: Rename the primary workspace tab from *Card Studio / Studio* to **Card Hub** across both the top desktop header and the mobile bottom navigation bar.
- **Confirmed Decision 2 — Single-Level Collapsible Accordion Workspace**: Replace the stacked 2-tier and 3-tier horizontal tab bars (*Master Identity → Personal / Work / Beyond / Socials*, *Image Hub → Avatar / Background*, *Card Theme & Style → Surface / Layout / Brand*, *Selective Sharing*) with **one clean, flat list of single-level collapsible accordion sections**. Users can expand any section directly in place without hunting through nested sub-tabs.
- **Confirmed Decision 3 — Mobile Sticky Mini-Card Bar + Full-Screen Tap Preview**: On phones and small displays (`< 1024px`), replace the tall inline 3D card stage at the top of the scroll flow with a **compact sticky mini-card bar** showing the active card's live finish, holder name, card switcher, QR/NFC trigger, and a **Tap to Preview Card** action that opens the full interactive **3D Card / Story Deck / VIP Pass** in a full-screen sheet. On desktop (`≥ 1024px`), maintain the side-by-side sticky 5-column Live Card stage on the left and 7-column Accordion Workspace on the right.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms a dense, multi-layered vertical scroll page into an intuitive, thumb-friendly **Card Hub** where every identity field, AI portrait/background generator, luxury card theme, and selective sharing toggle is one tap away inside a single-level accordion list.
- **Target Audience / Persona**: Mobile and desktop professionals managing multiple digital business cards, identity circles, and selective sharing rules who need fast, distraction-free navigation on portable screens (`375px–430px`) as well as wide desktop monitors (`1440px`).
- **Key Value**: Eliminates the 4 stacked horizontal menu bars that previously competed for vertical space on phones, reducing cognitive load and scroll fatigue while keeping every single feature intact.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Mobile Card Hub Flow (`< 1024px`)**:
   - **Top Sticky Mini-Card Bar**: Displays a sleek, 56px-tall live summary of the active card (mini portrait/monogram with the card's actual theme color/finish, active card selector dropdown, quick `+ New Card` / `QR & NFC` icon buttons, and an **Expand Live Card** button).
   - **Full-Screen Live Card Sheet (On Tap)**: Tapping the mini-card bar or **Preview Card** opens a full-screen overlay where the user can interactively flip the **3D Physical Card**, swipe the **3-Slide Story Deck**, or inspect the **VIP Wallet Pass**, switch presentation modes, or share via QR/NFC, then close back to their exact scroll position in the editor.
   - **Single-Level Accordion List**: Right below the mini-card bar sits one clean vertical list of collapsible accordion cards—each with a clear title, summary badge (e.g., filled field count or active theme name), and smooth expand/collapse chevron.

2. **Desktop Card Hub Flow (`≥ 1024px`)**:
   - **Top Card Switcher Toolbar**: Single-row bar for switching cards, editing the public `/p/` vanity handle, copying the card link, or opening QR/NFC hardware.
   - **Left Column (5 Columns, Sticky)**: Full interactive **Live Card Stage** (with the `3D Card · Story Deck · Pass` presentation switcher integrated cleanly at the top of the card stage).
   - **Right Column (7 Columns, Scrollable)**: The same unified **Single-Level Collapsible Accordion Workspace** with an optional *Expand All / Collapse All* control at the top right.

### Single-Level Accordion Sections (Replacing All Nested Sub-Tabs)

Instead of outer tabs containing inner sub-tabs, the workspace presents **8 direct, single-level accordion sections** grouped logically with subtle category headers:

- **Identity & Profile Data**
  1. **Personal Identity & Coordinates** *(First/Last name, nickname, gender, pronouns, personal mobile/email, home address, birthday, Personal Bio with AI Rewrite, and Emergency ICE contacts)*
  2. **Work & Company Credentials** *(Role, company, department, work email/phone, website, HQ address, VAT/Registration/EORI/SDI, Company Logo upload/AI generator, and Work Executive Bio)*
  3. **Beyond Work, Education & Portfolio** *(Passions & Sports, Academic Degrees, and Visual Portfolio showcase)*
  4. **Social & Messaging Networks** *(Searchable social links with automatic clickable test symbols and custom labels)*
- **Visual Studio (Image Hub)**
  5. **Portrait & AI Avatar Studio** *(Active portrait preview, Saved Portrait Vault, photo upload, Studio Headshot presets, 3D/Stylized Avatar presets, and auto-expanding AI Instructions)*
  6. **Card Background & Scenic Studio** *(Active background preview, Saved Background Vault, Curated Scenic/Architectural/Luxury Presets including Milky Way & Tropical Atoll, and AI Background generator)*
- **Card Design & Privacy**
  7. **Card Theme, Layout & Typography** *(Default Presentation Mode `3D / Story Deck / Pass`, Luxury Color Palettes & Precious Metals, Tactile Surface Finishes, Front Layout Architecture, Font Pairings across all views, and Primary CTA / Video Greeting)*
  8. **Selective Sharing & Field Visibility** *(Master privacy switches and per-field visibility toggles for the active card, plus Live Presence & Time-Zone status)*

### Visual Identity & Ergonomics

- **Aesthetic Direction**: Refined luxury dark slate canvas (`#090D16`) with Day Mode support (`#F1F5F9`), crisp 1px structural borders (`border-slate-800`), and high-contrast typography.
- **Typography & Hierarchy**: `Plus Jakarta Sans` for UI controls and accordion headers, `JetBrains Mono` (`tabular-nums`) for field counters and status indicators, and the user's selected bespoke card font pairing (`Playfair Display`, `Cormorant Garamond`, `Bodoni Moda`, `Cinzel`, `Syne`, `Outfit`, `Sora`) applied consistently across 3D Card, Story Deck, and VIP Wallet Pass.
- **Mobile Touch Ergonomics**:
  - Minimum `44px × 44px` touch hitboxes on all accordion headers, mobile bottom nav tabs, and action buttons.
  - Aggregate sticky surface height on mobile kept strictly compact so over 80% of the viewport remains dedicated to scrollable content.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Flatten 2-Tier Sub-Tabs into 8 Direct Accordion Drawers**
  - *Chosen Approach*: Promote the inner sub-sections (*Personal*, *Work*, *Beyond Work*, *Socials*, *Portrait Studio*, *Background Studio*, *Card Theme & Typography*, *Selective Sharing*) to top-level accordion panels.
  - *Why*: Previously, changing a work phone number and then updating a card background required scrolling up to switch outer tabs, then scrolling down to switch inner tabs. Direct accordion headers let users see the entire map of capabilities at a glance and open any section in one tap.
  - *Alternatives Considered*: Keeping the 4 outer tabs and only using accordions inside them was rejected because it still forces two levels of navigation.

- **Decision 2: Sticky Mini-Card Bar + Full-Screen Sheet on Mobile (`< lg`)**
  - *Chosen Approach*: Show a compact live mini-card bar at the top of Card Hub on phones that opens the full interactive 3D Card / Story Deck / Pass modal on tap, while keeping the side-by-side 2-column layout on desktop (`≥ lg`).
  - *Why*: A full 3D card + presentation mode switcher consumes ~520px of vertical height on a phone screen before the user even reaches the first editor field. A compact sticky mini-card bar gives instant visual context and 1-tap full-screen preview while bringing all accordion sections immediately above the fold.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Top App Header & Mobile Nav                         │
│   [Brand]  ──  [Card Hub | P2P Radar | Contacts | CRM | Settings]  ── [CTA]│
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            CARD HUB WORKSPACE                              │
├───────────────────────────────────┬────────────────────────────────────────┤
│   MOBILE VIEWPORT (< 1024px)      │       DESKTOP VIEWPORT (≥ 1024px)      │
│                                   │                                        │
│ ┌───────────────────────────────┐ │ ┌────────────────┐ ┌─────────────────┐ │
│ │ Sticky Live Mini-Card Bar     │ │ │ Left 5-Col     │ │ Right 7-Col     │ │
│ │ • Card Switcher + New Card    │ │ │ Sticky Stage   │ │ Single-Level    │ │
│ │ • [QR/NFC]  [Preview Card ↗]  │ │ │                │ │ Accordion List  │ │
│ └──────────────┬────────────────┘ │ │ • 3D Card      │ │                 │ │
│                │ Tap Preview      │ │ • Story Deck   │ │ 1. Personal     │ │
│                ▼                  │ │ • VIP Pass     │ │ 2. Work         │ │
│ ┌───────────────────────────────┐ │ │ • QR & NFC Box │ │ 3. Beyond Work  │ │
│ │ Full-Screen Card Preview Sheet│ │ └────────────────┘ │ 4. Socials      │ │
│ │ (3D Flip / Story Deck / Pass) │ │                    │ 5. Portrait Hub │ │
│ └───────────────────────────────┘ │                    │ 6. Backdrop Hub │ │
│                                   │                    │ 7. Theme & Font │ │
│ ┌───────────────────────────────┐ │                    │ 8. Sharing      │ │
│ │ Single-Level Accordion List   │ │                    └─────────────────┘ │
│ │ (Panels 1–8 Expand In-Place)  │ │                                        │
│ └───────────────────────────────┘ │                                        │
└───────────────────────────────────┴────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Global Navigation State**:
  - Updates the primary tab label to **Card Hub** in both desktop top navigation and the fixed mobile bottom tab bar.
- **Mobile Mini-Card & Full-Screen Preview Sheet State**:
  - `isMobilePreviewModalOpen: boolean` controls the full-screen interactive card preview overlay on viewports `< 1024px`.
  - Inside the full-screen preview sheet, users have full access to the `3D Card`, `Story Deck`, and `Pass` presentation switcher, interactive 3D flip/drag portrait controls, and the `Instant QR & NFC Hardware` drawer.
- **Single-Level Accordion Controller**:
  - `openSections: Record<AccordionSectionId, boolean>` tracks which accordion drawers (`personal`, `work`, `beyond`, `socials`, `portrait`, `background`, `theme`, `sharing`) are expanded, defaulting to `personal` open so the workspace starts clean and uncluttered.
  - Clicking "Manage Portrait" from the Personal/Header thumbnail automatically expands and scrolls to the `portrait` accordion drawer.
  - Every existing state handler (`onUpdateProfile`, `onUpdateCard`, `onConsumeAiCoin`, Portrait/Background Vault modals, double-click image lightbox, auto-expanding textareas, and selective sharing toggles) remains wired directly to its respective accordion panel with zero loss of functionality.
