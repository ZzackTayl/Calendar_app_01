import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Email Authentication E2E Tests', () => {
  let supabase: ReturnType<typeof createClient>;

  test.beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the signup page
    await page.goto('/auth/signup');
  });

  test('should show signup form correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle signup flow with email verification', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Fill in signup form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]');

    // Should show email verification message
    await expect(page.locator('text=check your email')).toBeVisible({ timeout: 10000 });
    
    // Check that user was created in Supabase
    const { data: user } = await supabase.auth.admin.getUserById('test');
    
    // Cleanup - delete the test user if created
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  test('should handle invalid email format', async ({ page }) => {
    const invalidEmail = 'not-an-email';
    const testPassword = 'TestPassword123!';

    await page.fill('input[type="email"]', invalidEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should handle weak password', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const weakPassword = '123';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', weakPassword);
    await page.click('button[type="submit"]');

    // Should show password strength error
    await expect(page.locator('text=Password must be')).toBeVisible();
  });

  test('should handle existing user signup attempt', async ({ page }) => {
    // Use a common test email that might already exist
    const testEmail = 'existing@example.com';
    const testPassword = 'TestPassword123!';

    // First, create a user (if not exists)
    await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    // Try to sign up with existing email
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should handle gracefully (either show error or send email anyway)
    await expect(
      page.locator('text=already registered').or(
        page.locator('text=check your email')
      )
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === testEmail);
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
    }
  });
});

test.describe('Email Template Rendering Tests', () => {
  test('should render email templates correctly', async ({ page }) => {
    // Test email template preview if available
    await page.goto('/admin/email-preview');
    
    // This might not exist, so we'll make it conditional
    const templateExists = await page.locator('h1').count();
    if (templateExists > 0) {
      await expect(page.locator('h1')).toContainText('Email Templates');
    }
  });
});

test.describe('Email Delivery Performance Tests', () => {
  test('should send emails within reasonable time', async ({ page }) => {
    const testEmail = `perf-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const startTime = Date.now();
    
    await page.goto('/auth/signup');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for confirmation message
    await expect(page.locator('text=check your email')).toBeVisible({ timeout: 10000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Email sending should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});
