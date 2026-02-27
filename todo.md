# CleanVentures TODO

## Setup & Branding
- [x] Generate app logo and configure branding
- [x] Configure theme colors (earthy green palette)
- [x] Set up icon mappings in icon-symbol.tsx
- [x] Configure tab bar with 5 tabs

## Mock Data
- [x] Create mock data file (ventures, users, products, services, chats, transactions)

## Screens
- [x] S1: Home screen (map widget + top ventures + bottom tab bar)
- [x] S2: My Ventures screen (list + start new venture button)
- [x] S3: Market screen (products + services sections)
- [x] S4: Chats screen (group chat list)
- [x] S5: Account screen (profile + stats + menu)
- [x] S6: Venture Detail screen (5 tabs: Mission, Requests, Tasks, Wallet, Supplies)
- [x] S7: Cart / Checkout screen
- [x] S8: Venture Chat screen
- [x] S9: Create Venture screen (multi-step 4-step form)
- [x] S10: Join Request bottom sheet (embedded in Venture Detail)

## Components
- [x] VentureBannerCard component
- [x] HealthBar component (capacity + funding)
- [x] BadgeChip component (Free/Paid, role badges)
- [x] TaskDropdownCard (inline in Venture Detail)
- [x] WalletTransactionRow (inline in Venture Detail)
- [x] ChatListCard (inline in Chats screen)

## Future Iterations
- [ ] Real map integration (expo-maps)
- [ ] Photo upload for ventures
- [ ] Push notifications
- [ ] Backend + database integration
- [ ] User authentication
- [ ] Wallet top-up flow
- [ ] Venture search with real geolocation

## Iteration 2 (User Feedback)
- [x] Fix dark text on dark background contrast issues
- [x] Integrate react-native-maps on Home screen with GPS + radius filter
- [x] Add map widget to Create Venture location step (react-native-maps)
- [x] Build full Create Venture flow (ventures appear in My Ventures after creation)
- [x] In-session AsyncStorage persistence (ventures, cart, user state)
- [x] Fix Top Ventures horizontal scroll (more items, proper swipe)

## Iteration 3 (User Feedback)
- [x] Expand mock data: 4 more ventures with varied settings and real GPS coordinates
- [x] Add GPS coordinates to all existing mock ventures
- [x] Improve Unsplash image URLs for ventures and products
- [x] Fix badge chip contrast on images (dark backdrop behind Free/EAC badges)
- [x] Map pins visible at all zoom levels (country-level to street-level)
- [x] Fix venture name input bug in Create Venture step 1

## Iteration 4 (User Feedback)
- [x] Add date picker for Cleanup Date in Create Venture step 2
- [x] Darken badge backgrounds on venture images, remove "EAC" label (show amount only)
- [x] Fix task creation form: keyboard-aware, form shifts up above keyboard
- [x] Fix description field keyboard dismiss bug in task creation
- [x] Fix map: all ventures (including proposed) visible at country-level zoom

## Iteration 5 (User Feedback)
- [x] Fix badge text color: use white/light text on dark badge backdrop
- [x] Add joinable mock ventures (proposed + ongoing, user is NOT a member)
- [x] Join button only shown for proposed/ongoing ventures user has not joined
- [x] Wire up join request flow end-to-end (role/privilege selection → submitted state)

## Iteration 6 (User Feedback)
- [x] Fix task creation: tasks persist and appear in the Tasks tab after creation
- [x] Cart: assign cart items to personal wallet or a venture (buyer/co-owner only)
- [x] Supplies tab: show venture cart items as "Pending Purchase" / "Purchased"
- [x] Venture status controls: owner-only Activate and Mark Complete on Mission tab
- [x] Map pin color updates live when venture status changes
- [x] Discover tab in My Ventures: lists joinable ventures
- [x] Pending request badge on Discover cards after join request submitted

## Iteration 7 (User Feedback)
- [x] Photo upload in venture gallery (Mission tab) and Create Venture form
- [x] Persistent join request state: show "Request Pending" on revisit
- [x] Fix chat messages not showing in some chats (mock data bug)
- [x] Add quantity selector when adding products to cart
- [x] Add date + time slot picker when adding services to cart
- [x] Full cart checkout flow: mark items as Purchased, deduct from venture wallet
- [x] Wallet top-up on Account screen with mock payment flow

## Iteration 8 (User Feedback)
- [ ] Sign-in screen with in-memory auth (user: abhi / password: 1234)
- [ ] Protect all tabs behind auth (redirect to sign-in if not logged in)
- [ ] Persist venture photos (store photo URIs in ventures store via AsyncStorage)
- [ ] Fix service date picker (use DatePicker component instead of plain TextInput)
- [ ] Venture contribution flow: "Contribute Funds" button on Mission tab wallet section
- [ ] Owner request management: accept/decline join requests on Requests tab
- [ ] Accepted members appear in team roster on Mission tab
- [ ] Notification centre: bell icon on Home header, notification list screen

## Iteration 9 (User Feedback)
- [ ] Photo gallery: remove photo action
- [ ] Photo gallery: set photo as venture cover (display photo)
- [ ] Fix service date picker in market (not yet implemented)
- [ ] Members tab: show list of members with name and role
- [ ] Members tab: co-owner can remove members (with confirmation)
- [ ] Members tab: approved requests add person to members list
- [ ] Members tab: when my join request is approved, I appear in members
- [ ] Contribute Funds: deduct from personal wallet, add to venture wallet

## Iteration 10 (User Feedback)
- [ ] Fix venture wallet balance persistence (top-up and contributions survive refresh)
- [ ] Build role-based permission matrix (viewer/volunteer/co-owner/owner) in a central lib file
- [ ] Enforce permissions: viewers cannot mark tasks complete, cannot activate/complete ventures, etc.
- [ ] Task assignment: "Assign To" field in task creation, assignee avatar on task card
- [ ] Discover tab: add search bar to filter joinable ventures by name or location

## Iteration 11 (User Feedback)
- [x] Add Admin role to permission matrix (can create tasks, manage members)
- [x] Co-owners can view and change member roles from the Members tab
- [x] Everyone can see member roles on the Members tab
- [x] Multi-member task assignment (assign one task to many members)
- [x] Task completion toggle with strike-through (gated behind COMPLETE_TASK permission)
- [x] Venture activity feed on Mission tab (member joined, task created, funds contributed, status changed)

## Iteration 12 (User Feedback)
- [x] Add second mock user (priya / 1234) with different venture memberships
- [x] User-switching UI in Account screen (switch between abhi and priya)
- [x] When user switches, venture permissions update to reflect new user's role
- [x] Task due dates: optional date field in task creation
- [x] Overdue indicator: red border + "Overdue" badge on task cards past due date
- [x] Persistent activity feed: store events in AsyncStorage, append on real actions
- [x] Audit all state: ensure notifications, cart, wallet, ventures all persist to AsyncStorage
- [x] Persist active user selection across app restarts

## Iteration 13 (User Feedback)
- [x] Fix: co-owner/owner always gets all privileges (no "Request to Join" shown for own ventures)
- [x] Fix: only buyer or co-owner can add products to venture cart
- [x] Fix: viewer cannot upload photos until approved as a member
- [x] Curate 3-user mock data: abhijeet (owner/co-owner), priya (admin/viewer), rahul (admin/viewer/co-owner)
- [x] Each user has ventures where they are co-owner, admin, and viewer
- [x] Financial lifecycle: pledge amount deducted from wallet when join request is approved
- [x] Financial lifecycle: refund pledge when co-owner removes member or member withdraws
- [x] Financial lifecycle: proportional payout when venture is marked complete
- [x] Financial lifecycle: auto-reject all pending requests when venture is marked complete
- [x] Store pledge amount on join request so it can be refunded later

## Iteration 14 (User Feedback)
- [x] Request persistence: store approved/denied status on JoinRequest in ventures store, survive restarts
- [x] Per-user wallet: wallet store keyed by authUsername, each user has own balance + history
- [x] Venture completion confirmation dialog: show proportional payout summary before confirming
- [x] Functional multi-user persistent chat: messages per venture, per-user authorship, survive restarts
- [x] Chat: image message support (pick from library or camera)
- [x] Chat: poll message support (create poll, vote, see results)
- [x] Chat: show sender name + avatar for each message, distinguish self vs others

## Iteration 15 (Bug Fixes)
- [x] Fix: keyboard in chat causes text input to disappear (KeyboardAvoidingView layout issue)
- [x] Fix: viewer can upload photos — should be blocked until approved member
- [x] Fix: "Request to Join" shown on own ventures from My Ventures tab
- [x] Fix: ownership/permission detection — derive from members store, not static venture object
- [x] Fix: activity feed is per-user — should be global per venture (all users see same events)
- [x] Fix: request tab visible to viewers/pending members — hide it for them
- [x] Fix: co-owner/owner not recognized when approving requests (approval gating broken)
- [x] Fix: notifications are not interactive — tapping should navigate to the venture

## Iteration 16 (Bug Fix)
- [x] Fix: venture creator/owner always sees "Request to Join" — must have full owner access with no join button

## Iteration 17 (Bug Fixes)
- [x] Fix: venture wallet tab visible to all members — only show for buyer or co-owner
- [x] Fix: venture cart at marketplace visible to all — only show ventures where user is buyer or co-owner
- [x] Fix: co-owner (Abhijeet) not showing in member list for their own ventures
- [x] Fix: pledge amount not deducted from Rahul's wallet when his request is approved
- [x] Fix: venture wallet balance shows 0 at cart checkout (should reflect actual venture wallet balance)

## Iteration 18 (Bug Fixes)
- [x] Fix: join request "Request Pending" state shared between users — scope hasRequestedJoin to current user (ventureId + authUsername)
- [x] Fix: venture detail screen alreadyRequested not scoped to current user
- [x] Fix: Discover tab pending count not scoped to current user
- [x] Fix: Chats screen uses static MOCK_CHATS — now derived dynamically from ventures user is a member of
- [x] Fix: new venture created by user doesn't appear in Chats — now auto-appears since chat list is member-derived
- [x] Fix: approved member doesn't see venture in Chats — now auto-appears on approval since member store is updated

## Iteration 19 (User Feedback)
- [x] Fix: volunteer count bar shows stale 1/5 on venture cards and landing page — use live members store count
- [x] Fix: budget bar on landing page card shows stale 0/2000 — use live venture wallet balance
- [x] Add unread message count badge on Chats tab icon (new messages from other users)
- [x] Emit notification when item is added to cart for a venture
- [x] Emit notification when cart items are purchased (checkout complete)
