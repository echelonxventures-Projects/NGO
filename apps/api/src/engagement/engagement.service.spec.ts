import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EngagementService } from './engagement.service';

/**
 * Exercises the non-trivial public-registration logic: tenant scoping, capacity checks,
 * and idempotent de-duplication by email. Prisma's scoped client is fully mocked.
 */
describe('EngagementService', () => {
  const tenantContext = { requireTenantId: jest.fn().mockReturnValue('t1') } as any;

  function build(db: Record<string, any>) {
    const prisma = { scoped: jest.fn().mockReturnValue(db) } as any;
    return new EngagementService(prisma, tenantContext);
  }

  describe('registerForEvent', () => {
    it('throws NotFound when the event is missing or unpublished', async () => {
      const db = { event: { findFirst: jest.fn().mockResolvedValue(null) } };
      await expect(
        build(db).registerForEvent('e1', { email: 'a@b.org' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is idempotent: returns the existing registration for a duplicate email', async () => {
      const existing = { id: 'r1', email: 'a@b.org' };
      const create = jest.fn();
      const db = {
        event: { findFirst: jest.fn().mockResolvedValue({ id: 'e1', status: 'PUBLISHED', capacity: 10 }) },
        eventRegistration: {
          findFirst: jest.fn().mockResolvedValue(existing),
          count: jest.fn(),
          create,
        },
      };
      const result = await build(db).registerForEvent('e1', { email: 'A@B.org' } as any);
      expect(result).toBe(existing);
      expect(create).not.toHaveBeenCalled();
      // email is normalised before the duplicate lookup
      expect(db.eventRegistration.findFirst).toHaveBeenCalledWith({
        where: { eventId: 'e1', email: 'a@b.org' },
      });
    });

    it('rejects registration when the event is at capacity', async () => {
      const db = {
        event: { findFirst: jest.fn().mockResolvedValue({ id: 'e1', status: 'PUBLISHED', capacity: 2 }) },
        eventRegistration: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(2),
          create: jest.fn(),
        },
      };
      await expect(
        build(db).registerForEvent('e1', { email: 'new@b.org' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      // capacity count excludes cancelled registrations
      expect(db.eventRegistration.count).toHaveBeenCalledWith({
        where: { eventId: 'e1', status: { not: 'CANCELLED' } },
      });
    });

    it('creates a registration with a ticket code when capacity remains', async () => {
      const create = jest.fn().mockImplementation(({ data }) => ({ id: 'r9', ...data }));
      const db = {
        event: { findFirst: jest.fn().mockResolvedValue({ id: 'e1', status: 'PUBLISHED', capacity: 5 }) },
        eventRegistration: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(1),
          create,
        },
      };
      const result = await build(db).registerForEvent('e1', { email: 'new@b.org', name: 'New' } as any, 'u1');
      expect(create).toHaveBeenCalledTimes(1);
      expect(result.tenantId).toBe('t1');
      expect(result.userId).toBe('u1');
      expect(result.email).toBe('new@b.org');
      expect(result.ticketCode).toMatch(/^TKT-[0-9A-F]{8}$/);
    });

    it('skips the capacity check when the event has no capacity limit', async () => {
      const db = {
        event: { findFirst: jest.fn().mockResolvedValue({ id: 'e1', status: 'PUBLISHED', capacity: null }) },
        eventRegistration: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn(),
          create: jest.fn().mockImplementation(({ data }) => data),
        },
      };
      await build(db).registerForEvent('e1', { email: 'x@b.org' } as any);
      expect(db.eventRegistration.count).not.toHaveBeenCalled();
    });
  });

  describe('signupVolunteer', () => {
    it('rejects when no slots remain (excluding rejected signups)', async () => {
      const db = {
        volunteerOpportunity: { findFirst: jest.fn().mockResolvedValue({ id: 'o1', active: true, slots: 1 }) },
        volunteerSignup: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(1),
          create: jest.fn(),
        },
      };
      await expect(
        build(db).signupVolunteer('o1', { email: 'v@b.org' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.volunteerSignup.count).toHaveBeenCalledWith({
        where: { opportunityId: 'o1', status: { not: 'REJECTED' } },
      });
    });

    it('is idempotent for a duplicate volunteer email', async () => {
      const existing = { id: 's1' };
      const create = jest.fn();
      const db = {
        volunteerOpportunity: { findFirst: jest.fn().mockResolvedValue({ id: 'o1', active: true, slots: null }) },
        volunteerSignup: { findFirst: jest.fn().mockResolvedValue(existing), count: jest.fn(), create },
      };
      const result = await build(db).signupVolunteer('o1', { email: 'v@b.org' } as any);
      expect(result).toBe(existing);
      expect(create).not.toHaveBeenCalled();
    });
  });
});
