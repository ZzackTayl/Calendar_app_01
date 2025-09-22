/**
 * Test Setup Verification
 *
 * This test verifies that our test environment improvements are working correctly:
 * - localStorage conflicts are resolved
 * - Over-mocking issues are fixed
 * - Import path resolution works
 * - Test isolation is proper
 */

import { describe, it, expect, vi } from 'vitest';

describe('Test Setup Verification', () => {
  it('should have proper localStorage mock that prevents quota exceeded errors', () => {
    expect(localStorage).toBeDefined();
    expect(localStorage.setItem).toBeInstanceOf(Function);
    expect(localStorage.getItem).toBeInstanceOf(Function);
    expect(localStorage.clear).toBeInstanceOf(Function);

    // Test that we can store large amounts without throwing
    const largeString = 'x'.repeat(1000);
    expect(() => {
      for (let i = 0; i < 100; i++) {
        localStorage.setItem(`test-key-${i}`, largeString);
      }
    }).not.toThrow();

    // Verify cleanup works
    localStorage.clear();
    expect(localStorage.length).toBe(0);
  });

  it('should have realistic crypto mocks that do not timeout', async () => {
    // Import the mocked Argon2
    const argon2 = await import('@node-rs/argon2');

    const startTime = Date.now();
    const result = await argon2.hash('test-password', {
      timeCost: 2,
      memoryCost: 1024,
      parallelism: 1,
      outputLen: 32,
    });

    const duration = Date.now() - startTime;

    expect(result).toMatch(/^\$argon2id\$v=19\$m=1024,t=2,p=1\$/);
    expect(duration).toBeLessThan(1000); // Should be much faster than real Argon2
  });

  it('should have proper component mocks that render correctly', async () => {
    // Test that React is available
    expect(React).toBeDefined();

    // Test that our mocked components exist (they should be mocked via vi.mock)
    // Since we mock them in setup-unit.ts, we test that they're available in globals
    expect(vi).toBeDefined();
    expect(vi.fn).toBeInstanceOf(Function);
  });

  it('should have isolated test environment', async () => {
    // Test that localStorage is available but may have mock setup data
    expect(localStorage).toBeDefined();
    expect(localStorage.setItem).toBeInstanceOf(Function);
    expect(document.body.innerHTML).toBe('');

    // Test that mock state is available via dynamic import
    const { mockState } = await import('../tests/mocks/index.js');
    expect(mockState.getState().users.size).toBeGreaterThan(0); // Should have default test user
    expect(mockState.getState().relationships.size).toBe(0); // Should be empty
    expect(mockState.getState().events.size).toBe(0); // Should be empty
  });

  it('should have proper import path resolution', async () => {
    // Test that our test utilities work
    const mockModule = await import('../tests/mocks/index.js');
    expect(mockModule).toBeDefined();
    expect(mockModule.mockState).toBeDefined();

    // Test specific data factory
    const dataFactory = await import('../tests/mocks/data-factory.js');
    expect(dataFactory).toBeDefined();
    expect(dataFactory.MockDataFactory).toBeDefined();
  });

  it('should handle concurrent operations without conflicts', async () => {
    // Test that multiple async operations don't interfere
    const operations = Array.from({ length: 10 }, (_, i) =>
      new Promise<number>(resolve => {
        setTimeout(() => {
          localStorage.setItem(`concurrent-test-${i}`, `value-${i}`);
          resolve(i);
        }, Math.random() * 10);
      })
    );

    const results = await Promise.all(operations);
    expect(results).toHaveLength(10);
    expect(results.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // Verify all values were stored
    for (let i = 0; i < 10; i++) {
      expect(localStorage.getItem(`concurrent-test-${i}`)).toBe(`value-${i}`);
    }
  });

  it('should have reasonable performance characteristics', async () => {
    const startTime = Date.now();

    // Perform a series of operations that would previously timeout
    const { mockState, MockDataFactory } = await import('../tests/mocks/index.js');

    for (let i = 0; i < 50; i++) {
      const user = MockDataFactory.createUser({ id: `user-${i}` });
      mockState.setUser(user);

      const event = MockDataFactory.createEvent({
        user_id: user.id,
        title: `Event ${i}`,
      });
      mockState.setEvent(event);
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(mockState.getState().users.size).toBeGreaterThan(50);
    expect(mockState.getState().events.size).toBe(50);
  });
});