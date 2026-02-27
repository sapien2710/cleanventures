# CleanVentures — Mobile App Design Plan

## Brand Identity

**App Name:** CleanVentures
**Tagline:** "Clean Together. Grow Together."
**Personality:** Purposeful, community-driven, grounded, optimistic. Feels civic and trustworthy — not corporate.

### Color Palette

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `primary` | `#2D7D46` | `#4CAF72` | Forest green — nature, action, growth |
| `primaryLight` | `#E8F5EC` | `#1A3D26` | Soft green tint for backgrounds |
| `accent` | `#F5A623` | `#F5A623` | Warm amber — energy, badges, funded state |
| `background` | `#F7F9F7` | `#111814` | Off-white with green tint |
| `surface` | `#FFFFFF` | `#1C2420` | Cards and elevated surfaces |
| `foreground` | `#1A2E1E` | `#E8F0EA` | Primary text |
| `muted` | `#6B7B6E` | `#8FA494` | Secondary text |
| `border` | `#D8E8DB` | `#2A3D30` | Subtle green-tinted borders |
| `success` | `#22C55E` | `#4ADE80` | Success / volunteer badge |
| `warning` | `#F5A623` | `#FBBF24` | Paid / funding badge |
| `error` | `#EF4444` | `#F87171` | Errors / deny actions |

### Typography
- **Headings:** Bold, tight tracking
- **Body:** Regular weight, comfortable line height (1.5×)
- **Labels/Badges:** Semibold, uppercase, small caps feel

---

## Screen List

| ID | Screen Name | Description |
|----|-------------|-------------|
| S1 | Home | Map widget + top ventures around me + bottom tab bar |
| S2 | My Ventures | List of all ventures user is involved in + start new venture |
| S3 | Market | Products and services available for purchase/rent |
| S4 | Chats | List of all group chats the user is part of |
| S5 | Account | Profile, stats, badges, settings |
| S6 | Venture Detail | Per-venture screen with 5 tabs: Mission, Requests, Tasks, Wallet, Products & Services |
| S7 | Cart / Checkout | Review cart items, select wallet, place order |
| S8 | Venture Chat | Group messaging screen for a specific venture |
| S9 | Create Venture | Multi-step form to start a new CleanVenture |
| S10 | Join Request | Pop-up/sheet to request joining a venture with role selection |
| S11 | User Profile | Public profile with stats, badges, history |

---

## Primary Content & Functionality Per Screen

### S1: Home
- **Map widget** (top half): Shows ventures as pins on a map. Filterable by status, ownership, entry type.
- **"Top Ventures Around You"** (bottom half): Horizontal scroll of top 5 proposed ventures.
  - Each card: venture name, location, volunteer count fraction, funded health bar (if paid), free/paid badge.
- **Account avatar** (top right): Taps to Account screen.
- **Bottom tab bar**: Home, My Ventures, Market, Chats, Account.

### S2: My Ventures
- **"Start a new venture"** button + label (top right).
- **Search bar** with status filter (proposed, ongoing, finished).
- **Venture list**: Banner cards showing status, role, privilege, venture name, location.

### S3: Market
- **Cart icon** (top right).
- **Products section**: Grid/list of product cards with Add to Cart button.
- **Services section**: List of service cards with scheduling Add to Cart.

### S4: Chats
- **Chat list**: Cards showing group name, avatar, unread count badge, last message preview.

### S5: Account
- **Avatar + name + handle** (top).
- **Stats row**: Ventures completed, kg trash collected, badges earned.
- **Menu items**: User Profile, Settings, Shuddh Stats, Help & Legal.

### S6: Venture Detail (5 tabs)
- **Mission**: Capacity bar, budget bar (if paid), description, tags, photo gallery, join button.
- **Requests**: Pending join requests with approve/deny.
- **Tasks**: Active tasks list with create task button.
- **Wallet**: Balance + transaction log.
- **Products & Services**: Items and services tied to this venture.

### S7: Cart / Checkout
- Items grouped by Products / Services.
- Wallet selector (personal or project wallet).
- Order summary with totals.
- Place order CTA.

### S8: Venture Chat
- Standard messaging UI with bubble layout.
- Group name header with venture link.

### S9: Create Venture
- Multi-step: Name + location → Scope + timeline → Budget + EAC → Roles + disclaimers.

---

## Key User Flows

### Flow 1: Discover and Join a Venture
Home → Tap venture card → Venture Detail (Mission tab) → Tap "Request to Join" → Select role/privilege → Send Request → Confirmation

### Flow 2: Start a New Venture
My Ventures → Tap "+" → Create Venture form → Set name, location, scope, budget → Publish → Venture appears in My Ventures

### Flow 3: Manage a Venture (Owner)
My Ventures → Tap venture → Venture Detail → Requests tab → Approve/Deny → Tasks tab → Create task → Wallet tab → View transactions

### Flow 4: Purchase Supplies
Market → Browse products → Add to Cart → Cart → Select wallet → Checkout → Order placed

### Flow 5: Chat with Team
Chats → Tap group chat → Venture Chat screen → Send messages

---

## Design Principles

1. **Earthy & purposeful**: Green-forward palette that evokes nature, cleanliness, and civic pride.
2. **Information density balanced**: Cards show just enough — tap to expand.
3. **Badges are prominent**: Free (green) vs Paid (gold) badges are always visible.
4. **Progress is visual**: Health bars for capacity and funding make progress tangible.
5. **Trust signals**: User ratings, badge counts, and completed venture counts are always shown.
6. **iOS-native feel**: Follows Apple HIG — bottom tab bar, sheet modals, native-feeling transitions.
