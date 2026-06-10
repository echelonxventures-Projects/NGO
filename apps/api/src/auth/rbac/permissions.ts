/**
 * Global permission catalog (resource:action). Roles (per-tenant) compose these.
 * Extend as modules are added; keep keys stable since they are persisted.
 */
export const PERMISSIONS = {
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  CONTENT_PUBLISH: 'content:publish',
  DONATION_READ: 'donation:read',
  DONATION_WRITE: 'donation:write',
  BRANDING_READ: 'branding:read',
  BRANDING_WRITE: 'branding:write',
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  COURSE_READ: 'course:read',
  COURSE_WRITE: 'course:write',
  COURSE_PUBLISH: 'course:publish',
  PRODUCT_READ: 'product:read',
  PRODUCT_WRITE: 'product:write',
  ORDER_READ: 'order:read',
  ORDER_WRITE: 'order:write',
  EVENT_READ: 'event:read',
  EVENT_WRITE: 'event:write',
  VOLUNTEER_READ: 'volunteer:read',
  VOLUNTEER_WRITE: 'volunteer:write',
  MEMBERSHIP_READ: 'membership:read',
  MEMBERSHIP_WRITE: 'membership:write',
  COMMUNITY_READ: 'community:read',
  COMMUNITY_MODERATE: 'community:moderate',
  TENANT_ADMIN: 'tenant:admin',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

/** Default system roles seeded per tenant, mapped to permission sets. */
export const SYSTEM_ROLES: Record<string, { name: string; permissions: PermissionKey[] }> = {
  admin: { name: 'Administrator', permissions: ALL_PERMISSIONS },
  editor: {
    name: 'Editor',
    permissions: [
      PERMISSIONS.CONTENT_READ,
      PERMISSIONS.CONTENT_WRITE,
      PERMISSIONS.CONTENT_PUBLISH,
      PERMISSIONS.BRANDING_READ,
    ],
  },
  teacher: {
    name: 'Teacher',
    permissions: [
      PERMISSIONS.COURSE_READ,
      PERMISSIONS.COURSE_WRITE,
      PERMISSIONS.COURSE_PUBLISH,
      PERMISSIONS.CONTENT_READ,
    ],
  },
  student: {
    name: 'Student',
    permissions: [PERMISSIONS.COURSE_READ, PERMISSIONS.CONTENT_READ],
  },
  merchant: {
    name: 'Merchant',
    permissions: [
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.PRODUCT_WRITE,
      PERMISSIONS.ORDER_READ,
      PERMISSIONS.ORDER_WRITE,
    ],
  },
  donor: {
    name: 'Donor',
    permissions: [PERMISSIONS.CONTENT_READ, PERMISSIONS.DONATION_READ],
  },
};
