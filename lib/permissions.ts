/**
 * CleanVentures Permission Matrix
 *
 * Roles (what the user IS in the venture):
 *   - volunteer             : Standard cleanup participant
 *   - contributing_volunteer: Volunteer who also contributes funds
 *   - sponsor               : External funder (may not physically participate)
 *
 * Privileges (what level of control the user has):
 *   - co-owner  : Full control, second only to the owner
 *   - admin     : Can create/manage tasks and members; cannot change venture status
 *   - buyer     : Can purchase supplies on behalf of the venture
 *   - viewer    : Read-only access to venture details
 *   - null      : Not a member (public viewer)
 *
 * isOwner flag: The venture creator. Has all permissions unconditionally.
 *
 * Permission keys (VENTURE_PERMISSIONS):
 *   VIEW_VENTURE          : See the venture detail page
 *   VIEW_MEMBERS          : See the Members tab
 *   VIEW_WALLET           : See the Wallet tab and transaction history
 *   VIEW_REQUESTS         : See the Requests tab
 *   VIEW_TASKS            : See the Tasks tab
 *   VIEW_SUPPLIES         : See the Supplies tab
 *   CREATE_TASK           : Create a new task
 *   COMPLETE_TASK         : Mark a task as done
 *   ASSIGN_TASK           : Assign a task to a member
 *   CONTRIBUTE_FUNDS      : Transfer personal wallet funds to venture
 *   PURCHASE_SUPPLIES     : Add items to venture cart / checkout
 *   MANAGE_REQUESTS       : Accept or decline join requests
 *   REMOVE_MEMBER         : Remove a member from the venture
 *   CHANGE_MEMBER_ROLE    : Change a member's role or privilege (co-owner only)
 *   CHANGE_VENTURE_STATUS : Activate or mark the venture as complete
 *   UPLOAD_PHOTO          : Upload photos to the venture gallery
 *   SET_COVER_PHOTO       : Set a photo as the venture cover
 *   REMOVE_PHOTO          : Remove a photo from the gallery
 */

import type { UserPrivilege, UserRole } from "@/lib/mock-data";

export type Permission =
  | 'VIEW_VENTURE'
  | 'VIEW_MEMBERS'
  | 'VIEW_WALLET'
  | 'VIEW_REQUESTS'
  | 'VIEW_TASKS'
  | 'VIEW_SUPPLIES'
  | 'CREATE_TASK'
  | 'COMPLETE_TASK'
  | 'ASSIGN_TASK'
  | 'CONTRIBUTE_FUNDS'
  | 'PURCHASE_SUPPLIES'
  | 'MANAGE_REQUESTS'
  | 'REMOVE_MEMBER'
  | 'CHANGE_MEMBER_ROLE'
  | 'CHANGE_VENTURE_STATUS'
  | 'UPLOAD_PHOTO'
  | 'SET_COVER_PHOTO'
  | 'REMOVE_PHOTO';

/**
 * Privilege → allowed permissions.
 * null means "not a member" — only public read access.
 */
const PRIVILEGE_PERMISSIONS: Record<NonNullable<UserPrivilege> | 'none', Permission[]> = {
  'co-owner': [
    'VIEW_VENTURE', 'VIEW_MEMBERS', 'VIEW_WALLET', 'VIEW_REQUESTS',
    'VIEW_TASKS', 'VIEW_SUPPLIES',
    'CREATE_TASK', 'COMPLETE_TASK', 'ASSIGN_TASK',
    'CONTRIBUTE_FUNDS', 'PURCHASE_SUPPLIES',
    'MANAGE_REQUESTS', 'REMOVE_MEMBER', 'CHANGE_MEMBER_ROLE', 'CHANGE_VENTURE_STATUS',
    'UPLOAD_PHOTO', 'SET_COVER_PHOTO', 'REMOVE_PHOTO',
  ],
  'admin': [
    'VIEW_VENTURE', 'VIEW_MEMBERS', 'VIEW_WALLET', 'VIEW_REQUESTS',
    'VIEW_TASKS', 'VIEW_SUPPLIES',
    'CREATE_TASK', 'COMPLETE_TASK', 'ASSIGN_TASK',
    'CONTRIBUTE_FUNDS',
    'MANAGE_REQUESTS',
    'UPLOAD_PHOTO',
  ],
  'buyer': [
    'VIEW_VENTURE', 'VIEW_MEMBERS', 'VIEW_WALLET',
    'VIEW_TASKS', 'VIEW_SUPPLIES',
    'CONTRIBUTE_FUNDS', 'PURCHASE_SUPPLIES',
    'UPLOAD_PHOTO',
  ],
  'viewer': [
    'VIEW_VENTURE', 'VIEW_MEMBERS', 'VIEW_WALLET',
    'VIEW_TASKS', 'VIEW_SUPPLIES',
    // Viewers can see everything but cannot take any action until approved as a member
  ],
  'none': [
    'VIEW_VENTURE',
  ],
};

/**
 * Check if a user has a specific permission.
 *
 * @param privilege  The user's privilege level in this venture (null = not a member)
 * @param permission The permission to check
 * @param isOwner    Whether the user is the venture owner (bypasses all checks)
 */
export function can(
  privilege: UserPrivilege | null,
  permission: Permission,
  isOwner = false,
): boolean {
  if (isOwner) return true;
  const key = (privilege ?? 'none') as NonNullable<UserPrivilege> | 'none';
  return PRIVILEGE_PERMISSIONS[key]?.includes(permission) ?? false;
}

/**
 * Returns a human-readable label for a privilege level.
 */
export function privilegeLabel(privilege: UserPrivilege | null): string {
  switch (privilege) {
    case 'co-owner': return 'Co-Owner';
    case 'admin':    return 'Admin';
    case 'buyer':    return 'Buyer';
    case 'viewer':   return 'Viewer';
    default:         return 'Not a Member';
  }
}

/**
 * Returns a human-readable label for a role.
 */
export function roleLabel(role: string): string {
  switch (role) {
    case 'volunteer':              return 'Volunteer';
    case 'contributing_volunteer': return 'Contributing Volunteer';
    case 'sponsor':                return 'Sponsor';
    default:                       return role;
  }
}

/**
 * All privilege levels in display order (excluding owner).
 */
export const ALL_PRIVILEGES: NonNullable<UserPrivilege>[] = ['co-owner', 'admin', 'buyer', 'viewer'];

/**
 * All role options.
 */
export const ALL_ROLES: UserRole[] = ['volunteer', 'contributing_volunteer', 'sponsor'];
