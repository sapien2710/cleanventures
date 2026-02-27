// ─── Types ───────────────────────────────────────────────────────────────────

export type VentureStatus = 'proposed' | 'ongoing' | 'finished';
export type UserRole = 'volunteer' | 'contributing_volunteer' | 'sponsor';
export type UserPrivilege = 'co-owner' | 'admin' | 'buyer' | 'viewer';

export interface Venture {
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  description: string;
  status: VentureStatus;
  scope: ('clean' | 'beautify')[];
  category: string;
  isFree: boolean;
  budget: number;
  currentFunding: number;
  eac: number; // Expected Average Contribution
  volunteersJoined: number;
  volunteersRequired: number;
  startDate: string;
  endDate: string;
  images: string[];
  tags: string[];
  ownerName: string;
  ownerAvatar: string;
  ownerStats: { completed: number; rating: number };
  myRole?: UserRole;
  myPrivilege?: UserPrivilege;
}

export interface Task {
  id: string;
  ventureId: string;
  title: string;
  description: string;
  tag: string;
  isExpanded?: boolean;
  // Legacy single-assignee (kept for backward compat with old persisted data)
  assignee?: string;
  assigneeAvatar?: string;
  // Multi-member assignment
  assignees?: string[];         // member IDs
  assigneeNames?: string[];     // display names
  assigneeAvatars?: string[];   // avatar URLs
  completed?: boolean;
  dueDate?: string;             // ISO date string (YYYY-MM-DD)
}

export interface JoinRequest {
  id: string;
  ventureId: string;
  username: string;       // Display name
  authUsername?: string;  // Auth username for financial operations
  avatar: string;
  rating: number;
  role: UserRole;
  privilege: UserPrivilege | null;
  pitch: number;          // Pledged EAC amount (deducted on approval)
  message: string;
  status?: 'pending' | 'approved' | 'denied'; // Persisted decision
}

export interface Transaction {
  id: string;
  ventureId: string;
  type: 'contribution' | 'purchase' | 'cashout' | 'refund';
  username: string;
  amount: number;
  description: string;
  timestamp: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  rentPrice?: number;
  canRent: boolean;
  category: string;
  image: string;
  inStock: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  image: string;
  available: boolean;
}

export interface ChatGroup {
  id: string;
  ventureId: string;
  ventureName: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  participants: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  city: string;
  venturesCompleted: number;
  kgCollected: number;
  badgesEarned: number;
  badges: { id: string; name: string; icon: string; color: string }[];
  joinedDate: string;
  personalWalletBalance: number;
}

// ─── Ventures ────────────────────────────────────────────────────────────────

export const MOCK_VENTURES: Venture[] = [
  // ── PROPOSED ──────────────────────────────────────────────────────────────
  {
    id: 'v1',
    name: 'Sayaji Park Cleanup',
    location: 'Sayaji Park, Vadodara',
    coordinates: { lat: 22.3118, lng: 73.1723 },
    description: 'Sayaji Park has been accumulating trash near the eastern entrance for months. We plan to do a full sweep, collect all waste, and plant native shrubs along the pathway to deter future littering.',
    status: 'proposed',
    scope: ['clean', 'beautify'],
    category: 'Park',
    isFree: false,
    budget: 5000,
    currentFunding: 3200,
    eac: 250,
    volunteersJoined: 8,
    volunteersRequired: 15,
    startDate: '2026-03-10',
    endDate: '2026-03-10',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      'https://images.unsplash.com/photo-1542601906897-ecd5e2b5b8b0?w=600&q=80',
    ],
    tags: ['clean', 'beautify', 'park'],
    ownerName: 'Abhijeet P.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=11',
    ownerStats: { completed: 7, rating: 4.8 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v3',
    name: 'Vizag Beach Drive',
    location: 'RK Beach, Visakhapatnam',
    coordinates: { lat: 17.7231, lng: 83.3374 },
    description: 'RK Beach is a gem of Vizag that deserves better. This venture focuses on a full beach cleanup, waste segregation, and painting the promenade wall with eco-art.',
    status: 'proposed',
    scope: ['clean', 'beautify'],
    category: 'Beach',
    isFree: false,
    budget: 12000,
    currentFunding: 4500,
    eac: 500,
    volunteersJoined: 5,
    volunteersRequired: 25,
    startDate: '2026-03-22',
    endDate: '2026-03-22',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80',
    ],
    tags: ['beach', 'clean', 'beautify', 'art'],
    ownerName: 'Rohan S.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=3',
    ownerStats: { completed: 3, rating: 4.5 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v6',
    name: 'Lodhi Garden Restoration',
    location: 'Lodhi Garden, New Delhi',
    coordinates: { lat: 28.5931, lng: 77.2197 },
    description: 'Lodhi Garden is a UNESCO-listed heritage site being degraded by plastic waste and overgrown weeds. This venture will restore the pathways, remove litter, and plant seasonal flowers.',
    status: 'proposed',
    scope: ['clean', 'beautify'],
    category: 'Park',
    isFree: false,
    budget: 18000,
    currentFunding: 7200,
    eac: 600,
    volunteersJoined: 11,
    volunteersRequired: 30,
    startDate: '2026-04-05',
    endDate: '2026-04-05',
    images: [
      'https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=600&q=80',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    ],
    tags: ['park', 'heritage', 'clean', 'beautify'],
    ownerName: 'Neha G.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=47',
    ownerStats: { completed: 5, rating: 4.7 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v7',
    name: 'Juhu Beach Sunday Clean',
    location: 'Juhu Beach, Mumbai',
    coordinates: { lat: 19.0988, lng: 72.8266 },
    description: 'Juhu Beach sees thousands of visitors every weekend. This free community drive will clear the shoreline of plastic, styrofoam, and food waste every Sunday morning before the crowds arrive.',
    status: 'proposed',
    scope: ['clean'],
    category: 'Beach',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 34,
    volunteersRequired: 50,
    startDate: '2026-03-15',
    endDate: '2026-06-30',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    ],
    tags: ['beach', 'free', 'weekly', 'clean'],
    ownerName: 'Sunita R.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=44',
    ownerStats: { completed: 11, rating: 4.9 },
    myRole: undefined,
    myPrivilege: undefined,
  },

  // ── ONGOING ───────────────────────────────────────────────────────────────
  {
    id: 'v2',
    name: 'LBS Road Cleanup',
    location: 'LBS Road, Hyderabad',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    description: 'The stretch of LBS Road near the market has become an unofficial trash dump. We need volunteers to clear the debris and coordinate with the municipality for a large bin placement.',
    status: 'ongoing',
    scope: ['clean'],
    category: 'Road',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 12,
    volunteersRequired: 20,
    startDate: '2026-02-20',
    endDate: '2026-03-01',
    images: [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    ],
    tags: ['clean', 'road', 'municipal'],
    ownerName: 'Priya M.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=5',
    ownerStats: { completed: 12, rating: 4.9 },
    myRole: 'volunteer',
    myPrivilege: 'viewer',
  },
  {
    id: 'v5',
    name: 'Hubli Old Town Revival',
    location: 'Deshpande Nagar, Hubli',
    coordinates: { lat: 15.3647, lng: 75.1240 },
    description: 'The old town area has heritage structures that are being overshadowed by garbage. This venture will clean the streets and restore the visual character of the neighbourhood.',
    status: 'ongoing',
    scope: ['clean', 'beautify'],
    category: 'Neighbourhood',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 22,
    volunteersRequired: 30,
    startDate: '2026-02-10',
    endDate: '2026-02-28',
    images: [
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80',
      'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=80',
    ],
    tags: ['neighbourhood', 'heritage', 'clean'],
    ownerName: 'Kiran B.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=7',
    ownerStats: { completed: 9, rating: 4.7 },
    myRole: 'sponsor',
    myPrivilege: 'co-owner',
  },
  {
    id: 'v8',
    name: 'Sabarmati Riverfront Drive',
    location: 'Sabarmati Riverfront, Ahmedabad',
    coordinates: { lat: 23.0225, lng: 72.5714 },
    description: 'The Sabarmati Riverfront promenade is littered with plastic bottles and food packaging. This ongoing drive runs every Saturday morning with waste segregation and river-edge planting.',
    status: 'ongoing',
    scope: ['clean', 'beautify'],
    category: 'Waterway',
    isFree: false,
    budget: 9000,
    currentFunding: 6300,
    eac: 350,
    volunteersJoined: 19,
    volunteersRequired: 25,
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    images: [
      'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600&q=80',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    ],
    tags: ['waterway', 'clean', 'beautify', 'weekly'],
    ownerName: 'Farhan A.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=15',
    ownerStats: { completed: 6, rating: 4.6 },
    myRole: 'contributing_volunteer',
    myPrivilege: 'viewer',
  },
  {
    id: 'v9',
    name: 'Bengaluru IT Corridor Greenway',
    location: 'Outer Ring Road, Bengaluru',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    description: 'The tech corridor\'s service roads are choked with construction debris and food waste. Corporate volunteers from nearby offices are joining forces to clean and plant trees along the median.',
    status: 'ongoing',
    scope: ['clean', 'beautify'],
    category: 'Road',
    isFree: false,
    budget: 22000,
    currentFunding: 18500,
    eac: 800,
    volunteersJoined: 28,
    volunteersRequired: 35,
    startDate: '2026-02-14',
    endDate: '2026-03-14',
    images: [
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    ],
    tags: ['road', 'corporate', 'clean', 'beautify'],
    ownerName: 'Aditya V.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=22',
    ownerStats: { completed: 14, rating: 4.8 },
    myRole: undefined,
    myPrivilege: undefined,
  },

  // ── JOINABLE PROPOSED (user is NOT a member) ────────────────────────────
  {
    id: 'v13',
    name: 'Pune FC Road Cleanup',
    location: 'FC Road, Pune',
    coordinates: { lat: 18.5204, lng: 73.8567 },
    description: 'FC Road is one of Pune\'s busiest streets and is littered with food packaging, plastic cups, and cigarette butts. Join us for a morning sweep before the shops open.',
    status: 'proposed',
    scope: ['clean'],
    category: 'Road',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 6,
    volunteersRequired: 20,
    startDate: '2026-03-28',
    endDate: '2026-03-28',
    images: [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    ],
    tags: ['road', 'free', 'clean'],
    ownerName: 'Tanvi D.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=49',
    ownerStats: { completed: 3, rating: 4.5 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v14',
    name: 'Chandigarh Rose Garden Restore',
    location: 'Zakir Hussain Rose Garden, Chandigarh',
    coordinates: { lat: 30.7333, lng: 76.7794 },
    description: 'Asia\'s largest rose garden needs our help. Plastic waste has accumulated along the walking paths. We plan to clean the entire garden and install new waste bins.',
    status: 'proposed',
    scope: ['clean', 'beautify'],
    category: 'Park',
    isFree: false,
    budget: 14000,
    currentFunding: 3500,
    eac: 450,
    volunteersJoined: 9,
    volunteersRequired: 30,
    startDate: '2026-04-12',
    endDate: '2026-04-12',
    images: [
      'https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=600&q=80',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    ],
    tags: ['park', 'clean', 'beautify'],
    ownerName: 'Harpreet S.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=57',
    ownerStats: { completed: 6, rating: 4.7 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v15',
    name: 'Kochi Backwaters Bank Clean',
    location: 'Vembanad Lake, Kochi',
    coordinates: { lat: 9.9312, lng: 76.2673 },
    description: 'The backwaters of Kochi are being choked by plastic waste from houseboats and fishing communities. This venture will clean the banks, collect floating debris, and plant mangroves.',
    status: 'proposed',
    scope: ['clean', 'beautify'],
    category: 'Waterway',
    isFree: false,
    budget: 20000,
    currentFunding: 8000,
    eac: 700,
    volunteersJoined: 12,
    volunteersRequired: 28,
    startDate: '2026-04-20',
    endDate: '2026-04-21',
    images: [
      'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    ],
    tags: ['waterway', 'mangroves', 'clean', 'beautify'],
    ownerName: 'Ananya M.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=43',
    ownerStats: { completed: 5, rating: 4.8 },
    myRole: undefined,
    myPrivilege: undefined,
  },

  // ── JOINABLE ONGOING (user is NOT a member) ────────────────────────────────
  {
    id: 'v16',
    name: 'Mysuru Palace Road Sweep',
    location: 'Sayyaji Rao Road, Mysuru',
    coordinates: { lat: 12.3052, lng: 76.6551 },
    description: 'The road leading to the famous Mysore Palace is littered with tourist waste. This ongoing weekly sweep runs every Sunday and needs more volunteers to cover the full stretch.',
    status: 'ongoing',
    scope: ['clean'],
    category: 'Road',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 14,
    volunteersRequired: 25,
    startDate: '2026-02-08',
    endDate: '2026-04-27',
    images: [
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80',
    ],
    tags: ['road', 'free', 'weekly', 'clean'],
    ownerName: 'Ravi K.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=62',
    ownerStats: { completed: 7, rating: 4.6 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v17',
    name: 'Bhopal Upper Lake Drive',
    location: 'Upper Lake, Bhopal',
    coordinates: { lat: 23.2599, lng: 77.4126 },
    description: 'Upper Lake is Bhopal\'s lifeline but is being polluted by idol immersion waste and plastic. This funded venture is cleaning the ghats and installing floating trash barriers.',
    status: 'ongoing',
    scope: ['clean', 'beautify'],
    category: 'Waterway',
    isFree: false,
    budget: 16000,
    currentFunding: 11200,
    eac: 550,
    volunteersJoined: 17,
    volunteersRequired: 30,
    startDate: '2026-02-18',
    endDate: '2026-03-30',
    images: [
      'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600&q=80',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    ],
    tags: ['waterway', 'clean', 'beautify'],
    ownerName: 'Shweta P.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=29',
    ownerStats: { completed: 8, rating: 4.7 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v18',
    name: 'Amritsar Golden Temple Periphery',
    location: 'Golden Temple Road, Amritsar',
    coordinates: { lat: 31.6200, lng: 74.8765 },
    description: 'The streets surrounding the Golden Temple are heavily littered by pilgrims and vendors. This ongoing venture cleans the 1km radius around the temple every morning at 6am.',
    status: 'ongoing',
    scope: ['clean'],
    category: 'Neighbourhood',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 31,
    volunteersRequired: 40,
    startDate: '2026-02-01',
    endDate: '2026-05-31',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    ],
    tags: ['neighbourhood', 'free', 'daily', 'clean'],
    ownerName: 'Gurpreet B.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=68',
    ownerStats: { completed: 12, rating: 4.9 },
    myRole: undefined,
    myPrivilege: undefined,
  },

  // ── FINISHED ──────────────────────────────────────────────────────────────
  {
    id: 'v4',
    name: 'Surat Canal Restoration',
    location: 'Tapi Riverfront, Surat',
    coordinates: { lat: 21.1702, lng: 72.8311 },
    description: 'The canal near the textile market was choked with plastic. We removed all floating waste, set up proper disposal, and worked with local businesses to prevent future dumping.',
    status: 'finished',
    scope: ['clean'],
    category: 'Waterway',
    isFree: false,
    budget: 8000,
    currentFunding: 8000,
    eac: 400,
    volunteersJoined: 18,
    volunteersRequired: 18,
    startDate: '2026-01-15',
    endDate: '2026-01-15',
    images: [
      'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600&q=80',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    ],
    tags: ['waterway', 'clean', 'plastic'],
    ownerName: 'Meera K.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=9',
    ownerStats: { completed: 15, rating: 5.0 },
    myRole: 'contributing_volunteer',
    myPrivilege: 'buyer',
  },
  {
    id: 'v10',
    name: 'Kolkata Maidan Sweep',
    location: 'Maidan, Kolkata',
    coordinates: { lat: 22.5448, lng: 88.3426 },
    description: 'After a major festival, the Maidan grounds were covered in plastic and food waste. 40 volunteers completed a full sweep in one day, collecting over 800 kg of waste.',
    status: 'finished',
    scope: ['clean'],
    category: 'Park',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 40,
    volunteersRequired: 40,
    startDate: '2026-01-28',
    endDate: '2026-01-28',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    ],
    tags: ['park', 'free', 'post-event', 'clean'],
    ownerName: 'Debashish R.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=32',
    ownerStats: { completed: 8, rating: 4.8 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v11',
    name: 'Jaipur Pink City Wall Clean',
    location: 'Tripolia Bazaar, Jaipur',
    coordinates: { lat: 26.9124, lng: 75.7873 },
    description: 'The iconic pink walls of Jaipur\'s old city were defaced with graffiti and stained with paan. Volunteers cleaned and restored the heritage facades, working with the ASI.',
    status: 'finished',
    scope: ['clean', 'beautify'],
    category: 'Neighbourhood',
    isFree: false,
    budget: 15000,
    currentFunding: 15000,
    eac: 750,
    volunteersJoined: 20,
    volunteersRequired: 20,
    startDate: '2026-01-05',
    endDate: '2026-01-06',
    images: [
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80',
      'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=80',
    ],
    tags: ['heritage', 'clean', 'beautify', 'neighbourhood'],
    ownerName: 'Kavya S.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=38',
    ownerStats: { completed: 10, rating: 4.9 },
    myRole: undefined,
    myPrivilege: undefined,
  },
  {
    id: 'v12',
    name: 'Goa Palolem Shore Restore',
    location: 'Palolem Beach, Goa',
    coordinates: { lat: 15.0100, lng: 74.0232 },
    description: 'Post-season cleanup of Palolem Beach. Shack owners and local volunteers teamed up to remove 600 kg of plastic, fishing nets, and debris from the shoreline.',
    status: 'finished',
    scope: ['clean'],
    category: 'Beach',
    isFree: true,
    budget: 0,
    currentFunding: 0,
    eac: 0,
    volunteersJoined: 25,
    volunteersRequired: 25,
    startDate: '2026-01-20',
    endDate: '2026-01-20',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80',
    ],
    tags: ['beach', 'free', 'coastal', 'clean'],
    ownerName: 'Marco F.',
    ownerAvatar: 'https://i.pravatar.cc/150?img=55',
    ownerStats: { completed: 4, rating: 4.6 },
    myRole: undefined,
    myPrivilege: undefined,
  },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const MOCK_TASKS: Task[] = [
  { id: 't1', ventureId: 'v1', title: 'Procure gloves and masks', description: 'Order 20 pairs of heavy-duty gloves and N95 masks from the marketplace. Budget: ₹800.', tag: 'procurement' },
  { id: 't2', ventureId: 'v1', title: 'Coordinate with park authority', description: 'Contact Vadodara Municipal Corporation to get a permission letter for the cleanup event.', tag: 'coordination' },
  { id: 't3', ventureId: 'v1', title: 'Arrange trash disposal truck', description: 'Book a trash pickup service for the afternoon of March 10th.', tag: 'logistics' },
  { id: 't4', ventureId: 'v2', title: 'Map the affected stretch', description: 'Walk the 800m stretch and mark the worst spots on the map.', tag: 'survey' },
  { id: 't5', ventureId: 'v2', title: 'Set up waste segregation stations', description: 'Place 3 segregation stations (dry/wet/hazardous) at equal intervals.', tag: 'setup' },
  { id: 't6', ventureId: 'v8', title: 'Arrange Saturday volunteer transport', description: 'Coordinate a shared bus from Navrangpura to the riverfront for 20 volunteers.', tag: 'logistics' },
  { id: 't7', ventureId: 'v9', title: 'Corporate volunteer sign-up sheet', description: 'Share the Google Form with 5 IT companies on the corridor for volunteer registration.', tag: 'coordination' },
];

// ─── Join Requests ────────────────────────────────────────────────────────────

export const MOCK_JOIN_REQUESTS: JoinRequest[] = [
  // jr1: priya requesting to join v1 (Sayaji Park) as contributing volunteer with ₹300 pledge
  { id: 'jr1', ventureId: 'v1', username: 'Priya M.', authUsername: 'priya', avatar: 'https://i.pravatar.cc/150?img=5', rating: 4.6, role: 'contributing_volunteer', privilege: 'buyer', pitch: 300, message: 'I have done 4 cleanups before and can also help with procurement.' },
  // jr2: rahul requesting to join v1 as volunteer (no pledge)
  { id: 'jr2', ventureId: 'v1', username: 'Rahul D.', authUsername: 'rahul', avatar: 'https://i.pravatar.cc/150?img=33', rating: 4.2, role: 'volunteer', privilege: null, pitch: 0, message: 'Happy to show up and help however I can!' },
  { id: 'jr3', ventureId: 'v1', username: 'GreenCorp Ltd.', avatar: 'https://i.pravatar.cc/150?img=60', rating: 4.9, role: 'sponsor', privilege: null, pitch: 2000, message: 'We would like to sponsor this initiative as part of our CSR program.' },
  { id: 'jr4', ventureId: 'v6', username: 'Arjun T.', avatar: 'https://i.pravatar.cc/150?img=41', rating: 4.4, role: 'volunteer', privilege: null, pitch: 0, message: 'I visit Lodhi Garden every morning. Would love to help restore it.' },
];

// ─── Transactions ─────────────────────────────────────────────────────────────

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx1', ventureId: 'v1', type: 'contribution', username: 'Abhijeet P.', amount: 500, description: 'Owner initial contribution', timestamp: '2026-02-15T10:00:00Z' },
  { id: 'tx2', ventureId: 'v1', type: 'contribution', username: 'Priya M.', amount: 300, description: 'Contributing volunteer joined', timestamp: '2026-02-16T14:30:00Z' },
  { id: 'tx3', ventureId: 'v1', type: 'contribution', username: 'TechCorp Sponsor', amount: 2000, description: 'Sponsor contribution', timestamp: '2026-02-17T09:00:00Z' },
  { id: 'tx4', ventureId: 'v1', type: 'purchase', username: 'Abhijeet P.', amount: -450, description: 'Ordered 20 pairs of gloves + masks', timestamp: '2026-02-18T11:00:00Z' },
  { id: 'tx5', ventureId: 'v1', type: 'contribution', username: 'Rohan S.', amount: 400, description: 'Contributing volunteer joined', timestamp: '2026-02-19T16:00:00Z' },
  { id: 'tx6', ventureId: 'v8', type: 'contribution', username: 'Farhan A.', amount: 700, description: 'Owner initial contribution', timestamp: '2026-02-01T08:00:00Z' },
  { id: 'tx7', ventureId: 'v8', type: 'contribution', username: 'Priya M.', amount: 350, description: 'Contributing volunteer', timestamp: '2026-02-03T10:00:00Z' },
];

// ─── Products ─────────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Heavy Duty Gloves',
    description: 'Thick rubber gloves for safe waste handling. One size fits most.',
    price: 45,
    canRent: false,
    category: 'Safety',
    image: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400&q=80',
    inStock: true,
  },
  {
    id: 'p2',
    name: 'N95 Mask (Pack of 5)',
    description: 'Certified N95 respirator masks for dust and fine particles.',
    price: 120,
    canRent: false,
    category: 'Safety',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
    inStock: true,
  },
  {
    id: 'p3',
    name: 'Trash Picker Tool',
    description: 'Ergonomic grabber tool for picking up litter without bending.',
    price: 180,
    rentPrice: 30,
    canRent: true,
    category: 'Tools',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    inStock: true,
  },
  {
    id: 'p4',
    name: 'Safety Vest (Reflective)',
    description: 'High-visibility reflective vest for roadside cleanup safety.',
    price: 95,
    rentPrice: 20,
    canRent: true,
    category: 'Safety',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80',
    inStock: true,
  },
  {
    id: 'p5',
    name: 'Trash Bags (Pack of 20)',
    description: 'Heavy-duty 60L garbage bags. Tear-resistant and leak-proof.',
    price: 80,
    canRent: false,
    category: 'Disposal',
    image: 'https://images.unsplash.com/photo-1542601906897-ecd5e2b5b8b0?w=400&q=80',
    inStock: true,
  },
  {
    id: 'p6',
    name: 'Disinfectant Spray (1L)',
    description: 'Hospital-grade disinfectant for post-cleanup sanitization.',
    price: 95,
    canRent: false,
    category: 'Sanitation',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
    inStock: false,
  },
  {
    id: 'p7',
    name: 'Sapling (Native Plant)',
    description: 'Locally sourced native plant saplings for beautification.',
    price: 35,
    canRent: false,
    category: 'Beautify',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
    inStock: true,
  },
  {
    id: 'p8',
    name: 'Eco Paint (1L)',
    description: 'Low-VOC exterior paint for wall murals and beautification.',
    price: 220,
    canRent: false,
    category: 'Beautify',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80',
    inStock: true,
  },
];

// ─── Services ─────────────────────────────────────────────────────────────────

export const MOCK_SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Trash Pickup & Disposal',
    description: 'A truck will arrive at your location to collect and properly dispose of all collected waste.',
    price: 500,
    unit: 'per trip',
    category: 'Disposal',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80',
    available: true,
  },
  {
    id: 's2',
    name: 'Product Delivery to Site',
    description: 'Get all your ordered products delivered directly to the cleanup site.',
    price: 50,
    unit: 'per order',
    category: 'Delivery',
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&q=80',
    available: true,
  },
  {
    id: 's3',
    name: 'Recycling Pickup',
    description: 'Specialized collection for recyclable materials — plastic, paper, metal.',
    price: 300,
    unit: 'per trip',
    category: 'Recycling',
    image: 'https://images.unsplash.com/photo-1542601906897-ecd5e2b5b8b0?w=400&q=80',
    available: true,
  },
  {
    id: 's4',
    name: 'Equipment Rental Return',
    description: 'Schedule a pickup for rented tools and equipment after the cleanup.',
    price: 80,
    unit: 'per pickup',
    category: 'Delivery',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    available: false,
  },
];

// ─── Chats ────────────────────────────────────────────────────────────────────

export const MOCK_CHATS: ChatGroup[] = [
  { id: 'c1', ventureId: 'v2', ventureName: 'LBS Road Cleanup', avatar: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&q=80', lastMessage: 'Priya: Don\'t forget to bring extra bags tomorrow!', lastMessageTime: '10:42 AM', unreadCount: 3, participants: 12 },
  { id: 'c2', ventureId: 'v5', ventureName: 'Hubli Old Town Revival', avatar: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=100&q=80', lastMessage: 'Kiran: The paint has arrived at the depot.', lastMessageTime: 'Yesterday', unreadCount: 0, participants: 22 },
  { id: 'c3', ventureId: 'v4', ventureName: 'Surat Canal Restoration', avatar: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=100&q=80', lastMessage: 'Meera: Great work everyone! Final report coming soon.', lastMessageTime: 'Jan 16', unreadCount: 0, participants: 18 },
  { id: 'c4', ventureId: 'v8', ventureName: 'Sabarmati Riverfront Drive', avatar: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=100&q=80', lastMessage: 'Farhan: See you all Saturday at 6:30 AM!', lastMessageTime: 'Yesterday', unreadCount: 5, participants: 19 },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  // c1 — LBS Road Cleanup
  { id: 'm1', chatId: 'c1', senderId: 'u2', senderName: 'Priya M.', senderAvatar: 'https://i.pravatar.cc/150?img=5', text: 'Hey team! Reminder that we start at 7 AM sharp tomorrow.', timestamp: '9:00 AM', isMe: false },
  { id: 'm2', chatId: 'c1', senderId: 'u3', senderName: 'Raj K.', senderAvatar: 'https://i.pravatar.cc/150?img=12', text: 'Got it. Should I bring my own gloves or are they provided?', timestamp: '9:15 AM', isMe: false },
  { id: 'm3', chatId: 'c1', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'Gloves are in the order — should arrive by tonight.', timestamp: '9:22 AM', isMe: true },
  { id: 'm4', chatId: 'c1', senderId: 'u2', senderName: 'Priya M.', senderAvatar: 'https://i.pravatar.cc/150?img=5', text: 'Perfect! Also, the municipality confirmed a bin placement at the north end.', timestamp: '9:45 AM', isMe: false },
  { id: 'm5', chatId: 'c1', senderId: 'u4', senderName: 'Anita S.', senderAvatar: 'https://i.pravatar.cc/150?img=25', text: 'That\'s great news! See everyone tomorrow morning.', timestamp: '10:01 AM', isMe: false },
  { id: 'm6', chatId: 'c1', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'Looking forward to it! Let\'s make this count.', timestamp: '10:15 AM', isMe: true },
  { id: 'm7', chatId: 'c1', senderId: 'u2', senderName: 'Priya M.', senderAvatar: 'https://i.pravatar.cc/150?img=5', text: 'Don\'t forget to bring extra bags tomorrow!', timestamp: '10:42 AM', isMe: false },

  // c2 — Hubli Old Town Revival
  { id: 'm8', chatId: 'c2', senderId: 'u5', senderName: 'Kiran B.', senderAvatar: 'https://i.pravatar.cc/150?img=33', text: 'The paint has arrived at the depot. 20 cans of forest green and 10 white.', timestamp: 'Yesterday 2:10 PM', isMe: false },
  { id: 'm9', chatId: 'c2', senderId: 'u6', senderName: 'Meera T.', senderAvatar: 'https://i.pravatar.cc/150?img=47', text: 'Excellent! Who is picking it up?', timestamp: 'Yesterday 2:25 PM', isMe: false },
  { id: 'm10', chatId: 'c2', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'I can arrange a pickup tomorrow morning with my vehicle.', timestamp: 'Yesterday 2:40 PM', isMe: true },
  { id: 'm11', chatId: 'c2', senderId: 'u5', senderName: 'Kiran B.', senderAvatar: 'https://i.pravatar.cc/150?img=33', text: 'Perfect. The depot opens at 8 AM. I will send you the address.', timestamp: 'Yesterday 3:00 PM', isMe: false },
  { id: 'm12', chatId: 'c2', senderId: 'u7', senderName: 'Suresh P.', senderAvatar: 'https://i.pravatar.cc/150?img=60', text: 'Also reminder — we need 5 more volunteers for Saturday. Please share the venture link.', timestamp: 'Yesterday 4:15 PM', isMe: false },
  { id: 'm13', chatId: 'c2', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'Shared on WhatsApp and Instagram. Should get more sign-ups by tonight.', timestamp: 'Yesterday 4:30 PM', isMe: true },

  // c3 — Sayaji Park Cleanup
  { id: 'm14', chatId: 'c3', senderId: 'u8', senderName: 'Deepa R.', senderAvatar: 'https://i.pravatar.cc/150?img=9', text: 'Welcome everyone to the Sayaji Park Cleanup group! Excited to have 18 volunteers on board.', timestamp: 'Mon 10:00 AM', isMe: false },
  { id: 'm15', chatId: 'c3', senderId: 'u9', senderName: 'Amit V.', senderAvatar: 'https://i.pravatar.cc/150?img=15', text: 'Happy to be here. What section of the park are we starting with?', timestamp: 'Mon 10:12 AM', isMe: false },
  { id: 'm16', chatId: 'c3', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'We start at the east entrance near the fountain and work our way to the lake.', timestamp: 'Mon 10:20 AM', isMe: true },
  { id: 'm17', chatId: 'c3', senderId: 'u8', senderName: 'Deepa R.', senderAvatar: 'https://i.pravatar.cc/150?img=9', text: 'Trash bags and gloves will be distributed at the gate. Please be on time!', timestamp: 'Mon 11:00 AM', isMe: false },
  { id: 'm18', chatId: 'c3', senderId: 'u10', senderName: 'Nisha K.', senderAvatar: 'https://i.pravatar.cc/150?img=44', text: 'Can we bring our kids? They want to participate too.', timestamp: 'Mon 11:30 AM', isMe: false },
  { id: 'm19', chatId: 'c3', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'Absolutely! Kids are welcome. We have a safe zone near the benches for younger ones.', timestamp: 'Mon 11:45 AM', isMe: true },

  // c4 — Vizag Beach Drive
  { id: 'm20', chatId: 'c4', senderId: 'u11', senderName: 'Arjun S.', senderAvatar: 'https://i.pravatar.cc/150?img=52', text: 'Team, the beach cleanup is confirmed for this Sunday at 6 AM. Sunrise session!', timestamp: 'Tue 8:00 AM', isMe: false },
  { id: 'm21', chatId: 'c4', senderId: 'u12', senderName: 'Lakshmi D.', senderAvatar: 'https://i.pravatar.cc/150?img=37', text: 'Love the early morning timing. The beach will be quieter and cooler.', timestamp: 'Tue 8:15 AM', isMe: false },
  { id: 'm22', chatId: 'c4', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'I have confirmed the truck for waste disposal. It will be at the north end by 9 AM.', timestamp: 'Tue 8:30 AM', isMe: true },
  { id: 'm23', chatId: 'c4', senderId: 'u11', senderName: 'Arjun S.', senderAvatar: 'https://i.pravatar.cc/150?img=52', text: 'Great coordination! Also the local news channel wants to cover us. Is everyone okay with that?', timestamp: 'Tue 9:00 AM', isMe: false },
  { id: 'm24', chatId: 'c4', senderId: 'u13', senderName: 'Pradeep M.', senderAvatar: 'https://i.pravatar.cc/150?img=68', text: 'Fine by me. More visibility means more volunteers next time!', timestamp: 'Tue 9:10 AM', isMe: false },
  { id: 'm25', chatId: 'c4', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?img=11', text: 'Agreed. Let them cover it. See everyone Sunday!', timestamp: 'Tue 9:20 AM', isMe: true },
];

// ─── User Profile ─────────────────────────────────────────────────────────────

export const MOCK_USER: UserProfile = {
  id: 'me',
  name: 'Abhijeet Purkar',
  handle: '@abhijeet_cv',
  avatar: 'https://i.pravatar.cc/150?img=11',
  bio: 'Civic enthusiast. Cleaning one city at a time. 🌿',
  city: 'Vadodara, Gujarat',
  venturesCompleted: 7,
  kgCollected: 342,
  badgesEarned: 5,
  badges: [
    { id: 'b1', name: 'Top Cleaner', icon: '🧹', color: '#2D7D46' },
    { id: 'b2', name: 'Trusted Owner', icon: '🏆', color: '#F5A623' },
    { id: 'b3', name: 'Eco Warrior', icon: '🌿', color: '#22C55E' },
    { id: 'b4', name: 'Community Builder', icon: '🤝', color: '#3B82F6' },
    { id: 'b5', name: 'First Venture', icon: '🌱', color: '#8B5CF6' },
  ],
  joinedDate: 'October 2025',
  personalWalletBalance: 1250,
};

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  type: 'product' | 'service';
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  isRent?: boolean;
  scheduledDate?: string;
}

export const MOCK_CART_ITEMS: CartItem[] = [
  { id: 'ci1', type: 'product', itemId: 'p1', name: 'Heavy Duty Gloves', price: 45, quantity: 4 },
  { id: 'ci2', type: 'product', itemId: 'p5', name: 'Trash Bags (Pack of 20)', price: 80, quantity: 2 },
  { id: 'ci3', type: 'service', itemId: 's1', name: 'Trash Pickup & Disposal', price: 500, quantity: 1, scheduledDate: 'Mar 10, 2026' },
];
