/**
 * Seeds two demo tenants so multi-tenancy and isolation can be demonstrated/tested:
 *   - vashundhara (reference NGO tenant)
 *   - demo        (second tenant to prove isolation)
 *
 * Idempotent: safe to run repeatedly.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ALL_PERMISSIONS, SYSTEM_ROLES } from '../src/auth/rbac/permissions';

const prisma = new PrismaClient();

async function ensurePermissions() {
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key },
      update: {},
    });
  }
}

async function seedTenant(opts: {
  slug: string;
  name: string;
  hostname: string;
  primaryColor: string;
  adminEmail: string;
}) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: opts.slug },
    create: { slug: opts.slug, name: opts.name, status: 'ACTIVE' },
    update: { name: opts.name },
  });

  await prisma.domain.upsert({
    where: { hostname: opts.hostname },
    create: { tenantId: tenant.id, hostname: opts.hostname, isPrimary: true, status: 'VERIFIED' },
    update: { tenantId: tenant.id, status: 'VERIFIED' },
  });

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      shortName: opts.name,
      tagline: `${opts.name} — making an impact`,
      primaryColor: opts.primaryColor,
      socialLinks: {},
    },
    update: { primaryColor: opts.primaryColor },
  });

  await prisma.tenantConfig.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      features: { donations: true, cms: true, lms: false, commerce: false },
      defaultLocale: 'en',
    },
    update: {},
  });

  // Roles + permissions
  const roleIdByKey: Record<string, string> = {};
  for (const [key, def] of Object.entries(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      create: { tenantId: tenant.id, key, name: def.name, isSystem: true },
      update: { name: def.name },
    });
    roleIdByKey[key] = role.id;

    for (const permKey of def.permissions) {
      const perm = await prisma.permission.findUnique({ where: { key: permKey } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  // Admin user
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: opts.adminEmail } },
    create: {
      tenantId: tenant.id,
      email: opts.adminEmail,
      name: 'Administrator',
      passwordHash,
      status: 'ACTIVE',
    },
    update: { passwordHash },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roleIdByKey['admin'] } },
    create: { userId: admin.id, roleId: roleIdByKey['admin'] },
    update: {},
  });

  // Sample content
  await prisma.content.upsert({
    where: {
      tenantId_type_slug_locale: {
        tenantId: tenant.id,
        type: 'page',
        slug: 'home',
        locale: 'en',
      },
    },
    create: {
      tenantId: tenant.id,
      type: 'page',
      slug: 'home',
      title: `Welcome to ${opts.name}`,
      excerpt: 'Homepage',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      body: { blocks: [{ type: 'hero', text: `Welcome to ${opts.name}` }] },
    },
    update: {},
  });

  console.log(`Seeded tenant '${opts.slug}' (admin: ${opts.adminEmail} / Password123!)`);
}

async function main() {
  await ensurePermissions();
  await seedTenant({
    slug: 'vashundhara',
    name: 'Vashundhara Foundation',
    hostname: 'vashundhara.platform.local',
    primaryColor: '#1B5E20',
    adminEmail: 'admin@vashundhara.org',
  });
  await seedTenant({
    slug: 'demo',
    name: 'Demo Organization',
    hostname: 'demo.platform.local',
    primaryColor: '#0D47A1',
    adminEmail: 'admin@demo.org',
  });
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
