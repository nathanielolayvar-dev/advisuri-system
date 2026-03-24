/**
 * RBAC (Role-Based Access Control) Utilities for Frontend
 *
 * This module provides role-checking utilities for the React frontend.
 * Unlike Express middleware, these are designed to work with React components
 * and Supabase user data.
 *
 * Roles:
 * - 'admin'   : Full access to all features
 * - 'teacher' : Can manage groups, create/grade tasks, view all members
 * - 'student' : Can access only their own groups, submit work, chat
 */

import { SupabaseUser } from '../shared/types';

// =============================================================================
// Type Definitions
// =============================================================================

/** User roles in the system */
export type UserRole = 'admin' | 'teacher' | 'student';

/** Permission levels */
export type Permission =
  | 'view:dashboard'
  | 'view:analytics'
  | 'view:groups'
  | 'create:group'
  | 'manage:group'
  | 'view:tasks'
  | 'create:task'
  | 'manage:task'
  | 'grade:task'
  | 'view:members'
  | 'manage:members'
  | 'view:admin'
  | 'manage:admin'
  | 'chat:send'
  | 'chat:receive'
  | 'view:announcements'
  | 'create:announcement'
  | 'view:documents'
  | 'upload:document';

/** Role to permissions mapping */
export type RolePermissions = Record<UserRole, Permission[]>;

// =============================================================================
// Permission Configuration
// =============================================================================

/**
 * Maps each role to its allowed permissions.
 * This defines the access rights for each user role.
 */
export const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    'view:dashboard',
    'view:analytics',
    'view:groups',
    'create:group',
    'manage:group',
    'view:tasks',
    'create:task',
    'manage:task',
    'grade:task',
    'view:members',
    'manage:members',
    'view:admin',
    'manage:admin',
    'chat:send',
    'chat:receive',
    'view:announcements',
    'create:announcement',
    'view:documents',
    'upload:document',
  ],
  teacher: [
    'view:dashboard',
    'view:analytics',
    'view:groups',
    'create:group',
    'manage:group',
    'view:tasks',
    'create:task',
    'manage:task',
    'grade:task',
    'view:members',
    'chat:send',
    'chat:receive',
    'view:announcements',
    'create:announcement',
    'view:documents',
    'upload:document',
  ],
  student: [
    'view:dashboard',
    'view:groups',
    'view:tasks',
    'create:task',
    'chat:send',
    'chat:receive',
    'view:announcements',
    'view:documents',
  ],
};

// =============================================================================
// RBAC Utility Functions
// =============================================================================

/**
 * Checks if a user has a specific role.
 *
 * @param user - The Supabase user object or null
 * @param role - The role to check for
 * @returns true if the user has the specified role, false otherwise
 */
export function hasRole(user: SupabaseUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Checks if a user has any of the specified roles.
 *
 * @param user - The Supabase user object or null
 * @param roles - Array of roles to check for
 * @returns true if the user has any of the specified roles, false otherwise
 */
export function hasAnyRole(
  user: SupabaseUser | null,
  roles: UserRole[]
): boolean {
  if (!user) return false;
  return roles.includes(user.role as UserRole);
}

/**
 * Checks if a user has a specific permission.
 *
 * @param user - The Supabase user object or null
 * @param permission - The permission to check for
 * @returns true if the user has the permission, false otherwise
 */
export function hasPermission(
  user: SupabaseUser | null,
  permission: Permission
): boolean {
  if (!user) return false;

  const userRole = user.role as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole];

  return permissions?.includes(permission) ?? false;
}

/**
 * Checks if a user has any of the specified permissions.
 *
 * @param user - The Supabase user object or null
 * @param permissions - Array of permissions to check for
 * @returns true if the user has any of the specified permissions, false otherwise
 */
export function hasAnyPermission(
  user: SupabaseUser | null,
  permissions: Permission[]
): boolean {
  if (!user) return false;

  const userRole = user.role as UserRole;
  const userPermissions = ROLE_PERMISSIONS[userRole];

  return permissions.some((permission) =>
    userPermissions?.includes(permission)
  );
}

/**
 * Checks if a user has all of the specified permissions.
 *
 * @param user - The Supabase user object or null
 * @param permissions - Array of permissions to check for
 * @returns true if the user has all of the specified permissions, false otherwise
 */
export function hasAllPermissions(
  user: SupabaseUser | null,
  permissions: Permission[]
): boolean {
  if (!user) return false;

  const userRole = user.role as UserRole;
  const userPermissions = ROLE_PERMISSIONS[userRole];

  return permissions.every((permission) =>
    userPermissions?.includes(permission)
  );
}

/**
 * Gets all permissions for a user's role.
 *
 * @param user - The Supabase user object or null
 * @returns Array of permissions, or empty array if user is null
 */
export function getPermissions(user: SupabaseUser | null): Permission[] {
  if (!user) return [];

  const userRole = user.role as UserRole;
  return ROLE_PERMISSIONS[userRole] ?? [];
}

/**
 * Checks if the user is at least a specific role level.
 * Admin > Teacher > Student
 *
 * @param user - The Supabase user object or null
 * @param minimumRole - The minimum required role level
 * @returns true if user's role is >= the minimum role
 */
export function hasMinimumRole(
  user: SupabaseUser | null,
  minimumRole: UserRole
): boolean {
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    student: 1,
    teacher: 2,
    admin: 3,
  };

  const userRoleLevel = roleHierarchy[user.role as UserRole] ?? 0;
  const minimumRoleLevel = roleHierarchy[minimumRole];

  return userRoleLevel >= minimumRoleLevel;
}

// =============================================================================
// React Hook for RBAC
// =============================================================================

/**
 * Custom hook for easy role and permission checks in components.
 *
 * @example
 * ```tsx
 * const { isAdmin, can, canAny } = useRBAC(user);
 *
 * if (isAdmin) {
 *   return <AdminPanel />;
 * }
 *
 * if (can('view:analytics')) {
 *   return <Analytics />;
 * }
 * ```
 */
export function createRBACHook() {
  return {
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissions,
    hasMinimumRole,
  };
}

// =============================================================================
// Higher-Order Component for Route Protection
// =============================================================================

/**
 * Checks if a user can access a route based on required roles or permissions.
 *
 * @param user - The Supabase user object or null
 * @param options - Configuration options
 * @returns true if access is allowed, false otherwise
 */
export function checkRouteAccess(
  user: SupabaseUser | null,
  options: {
    requiredRoles?: UserRole[];
    requiredPermissions?: Permission[];
    requireAllPermissions?: boolean;
  } = {}
): boolean {
  const {
    requiredRoles,
    requiredPermissions,
    requireAllPermissions = false,
  } = options;

  // Check if user is authenticated
  if (!user) return false;

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(user, requiredRoles)) {
      return false;
    }
  }

  // Check permission requirements
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (requireAllPermissions) {
      if (!hasAllPermissions(user, requiredPermissions)) {
        return false;
      }
    } else {
      if (!hasAnyPermission(user, requiredPermissions)) {
        return false;
      }
    }
  }

  return true;
}

// =============================================================================
// Export all types and utilities
// =============================================================================

export default {
  hasRole,
  hasAnyRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissions,
  hasMinimumRole,
  checkRouteAccess,
  ROLE_PERMISSIONS,
};
