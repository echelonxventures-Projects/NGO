import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES } from './permissions';

describe('RBAC permission catalog', () => {
  it('ALL_PERMISSIONS contains every catalog entry with no duplicates', () => {
    const values = Object.values(PERMISSIONS);
    expect(ALL_PERMISSIONS).toEqual(values);
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  describe('SYSTEM_ROLES', () => {
    it('grants admin every permission', () => {
      expect(SYSTEM_ROLES.admin.permissions).toEqual(ALL_PERMISSIONS);
      expect(SYSTEM_ROLES.admin.permissions).toContain(PERMISSIONS.TENANT_ADMIN);
    });

    it('limits the student role to read-only course/content access', () => {
      expect(SYSTEM_ROLES.student.permissions).toEqual([
        PERMISSIONS.COURSE_READ,
        PERMISSIONS.CONTENT_READ,
      ]);
    });

    it('does not grant the editor donation or admin permissions', () => {
      const editor = SYSTEM_ROLES.editor.permissions;
      expect(editor).toContain(PERMISSIONS.CONTENT_WRITE);
      expect(editor).not.toContain(PERMISSIONS.DONATION_WRITE);
      expect(editor).not.toContain(PERMISSIONS.TENANT_ADMIN);
    });

    it('scopes the merchant role to products and orders only', () => {
      expect(SYSTEM_ROLES.merchant.permissions.sort()).toEqual(
        [
          PERMISSIONS.PRODUCT_READ,
          PERMISSIONS.PRODUCT_WRITE,
          PERMISSIONS.ORDER_READ,
          PERMISSIONS.ORDER_WRITE,
        ].sort(),
      );
    });

    it('only the admin role holds tenant:admin', () => {
      const rolesWithAdmin = Object.entries(SYSTEM_ROLES)
        .filter(([, r]) => r.permissions.includes(PERMISSIONS.TENANT_ADMIN))
        .map(([key]) => key);
      expect(rolesWithAdmin).toEqual(['admin']);
    });
  });
});
