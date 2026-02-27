import { describe, it, expect } from 'vitest';
import {
  MOCK_VENTURES,
  MOCK_TASKS,
  MOCK_JOIN_REQUESTS,
  MOCK_TRANSACTIONS,
  MOCK_PRODUCTS,
  MOCK_SERVICES,
  MOCK_CHATS,
  MOCK_MESSAGES,
  MOCK_USER,
  MOCK_CART_ITEMS,
} from '../lib/mock-data';

describe('Mock Data Integrity', () => {
  it('should have at least 5 ventures', () => {
    expect(MOCK_VENTURES.length).toBeGreaterThanOrEqual(5);
  });

  it('each venture should have required fields', () => {
    for (const v of MOCK_VENTURES) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.location).toBeTruthy();
      expect(['proposed', 'ongoing', 'finished']).toContain(v.status);
      expect(v.volunteersJoined).toBeGreaterThanOrEqual(0);
      expect(v.volunteersRequired).toBeGreaterThan(0);
      expect(v.images.length).toBeGreaterThan(0);
    }
  });

  it('free ventures should have zero budget and eac', () => {
    const freeVentures = MOCK_VENTURES.filter(v => v.isFree);
    for (const v of freeVentures) {
      expect(v.budget).toBe(0);
      expect(v.eac).toBe(0);
    }
  });

  it('paid ventures should have non-zero budget', () => {
    const paidVentures = MOCK_VENTURES.filter(v => !v.isFree);
    for (const v of paidVentures) {
      expect(v.budget).toBeGreaterThan(0);
    }
  });

  it('should have tasks linked to valid ventures', () => {
    const ventureIds = MOCK_VENTURES.map(v => v.id);
    for (const t of MOCK_TASKS) {
      expect(ventureIds).toContain(t.ventureId);
    }
  });

  it('should have join requests linked to valid ventures', () => {
    const ventureIds = MOCK_VENTURES.map(v => v.id);
    for (const r of MOCK_JOIN_REQUESTS) {
      expect(ventureIds).toContain(r.ventureId);
    }
  });

  it('should have transactions linked to valid ventures', () => {
    const ventureIds = MOCK_VENTURES.map(v => v.id);
    for (const tx of MOCK_TRANSACTIONS) {
      expect(ventureIds).toContain(tx.ventureId);
    }
  });

  it('should have at least 8 products', () => {
    expect(MOCK_PRODUCTS.length).toBeGreaterThanOrEqual(8);
  });

  it('each product should have valid price', () => {
    for (const p of MOCK_PRODUCTS) {
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('should have at least 4 services', () => {
    expect(MOCK_SERVICES.length).toBeGreaterThanOrEqual(4);
  });

  it('should have chat groups', () => {
    expect(MOCK_CHATS.length).toBeGreaterThan(0);
  });

  it('should have messages linked to valid chats', () => {
    const chatIds = MOCK_CHATS.map(c => c.id);
    for (const m of MOCK_MESSAGES) {
      expect(chatIds).toContain(m.chatId);
    }
  });

  it('user profile should have required fields', () => {
    expect(MOCK_USER.id).toBeTruthy();
    expect(MOCK_USER.name).toBeTruthy();
    expect(MOCK_USER.handle).toBeTruthy();
    expect(MOCK_USER.badges.length).toBeGreaterThan(0);
  });

  it('cart items should have valid types', () => {
    for (const item of MOCK_CART_ITEMS) {
      expect(['product', 'service']).toContain(item.type);
      expect(item.price).toBeGreaterThan(0);
      expect(item.quantity).toBeGreaterThan(0);
    }
  });

  it('ventures with myRole should have valid role values', () => {
    const venturesWithRole = MOCK_VENTURES.filter(v => v.myRole !== undefined);
    expect(venturesWithRole.length).toBeGreaterThan(0);
    for (const v of venturesWithRole) {
      expect(['volunteer', 'contributing_volunteer', 'sponsor']).toContain(v.myRole);
    }
  });
});
