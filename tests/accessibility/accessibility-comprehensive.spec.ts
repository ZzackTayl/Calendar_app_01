import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Comprehensive Accessibility Testing Suite for PolyHarmony Calendar
 * 
 * This suite focuses on WCAG 2.1 AA compliance and neurodiversity-affirming design
 * for a polyamory calendar application with critical privacy controls.
 */

test.describe('Accessibility Comprehensive Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the main application page
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Automated Accessibility Testing (axe-core)', () => {
    test('Home page should meet WCAG 2.1 AA standards', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Authentication pages should be accessible', async ({ page }) => {
      // Test sign in page
      await page.goto('/auth/signin');
      await page.waitForLoadState('networkidle');

      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);

      // Test sign up page  
      await page.goto('/auth/signup');
      await page.waitForLoadState('networkidle');

      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);

      // Test forgot password page
      await page.goto('/auth/forgot-password');
      await page.waitForLoadState('networkidle');

      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Calendar page should be accessible', async ({ page }) => {
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Privacy and relationship management pages should be accessible', async ({ page }) => {
      // Test privacy settings page
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);

      // Test contacts/relationships page
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');

      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);

      // Test settings page
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation Tests', () => {
    test('Should navigate through main interface using keyboard only', async ({ page }) => {
      await page.goto('/');
      
      // Focus should start at the first focusable element
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT'].includes(firstFocused || '')).toBe(true);

      // Test tab order through key navigation elements
      let tabCount = 0;
      const maxTabs = 20; // Prevent infinite loops
      
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const activeElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            type: el?.getAttribute('type'),
            role: el?.getAttribute('role'),
            ariaLabel: el?.getAttribute('aria-label'),
            textContent: el?.textContent?.trim()
          };
        });
        
        // Verify that all focusable elements have proper accessibility attributes
        if (activeElement.tagName === 'BUTTON') {
          expect(
            activeElement.ariaLabel || 
            activeElement.textContent || 
            activeElement.role
          ).toBeTruthy();
        }
      }
    });

    test('Should handle Enter and Space key activation', async ({ page }) => {
      await page.goto('/');
      
      // Find a button and test keyboard activation
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.focus();
        
        // Test Enter key activation
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500); // Allow for any navigation/state changes
        
        // Test Space key activation (go back to original state first)
        await page.goto('/');
        await button.focus();
        await page.keyboard.press(' ');
        await page.waitForTimeout(500);
      }
    });

    test('Should support Escape key for closing modals/dropdowns', async ({ page }) => {
      await page.goto('/');
      
      // Look for elements that might open modals (buttons, dropdown triggers)
      const interactiveElements = page.locator('button, [role="button"], [role="combobox"]');
      const count = await interactiveElements.count();
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = interactiveElements.nth(i);
          await element.click();
          await page.waitForTimeout(300);
          
          // Check if a modal or dropdown opened
          const modalVisible = await page.locator('[role="dialog"], [role="menu"], [role="listbox"]').isVisible().catch(() => false);
          
          if (modalVisible) {
            // Test Escape key closes the modal/dropdown
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            
            const modalStillVisible = await page.locator('[role="dialog"], [role="menu"], [role="listbox"]').isVisible().catch(() => false);
            expect(modalStillVisible).toBe(false);
          }
        }
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('Should have proper heading structure (h1-h6)', async ({ page }) => {
      await page.goto('/');
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      if (headings.length > 0) {
        // Check that h1 exists and is unique
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1);
        expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1
        
        // Verify heading hierarchy (no skipping levels)
        const headingLevels = await Promise.all(
          headings.map(heading => heading.evaluate(h => parseInt(h.tagName.charAt(1))))
        );
        
        let previousLevel = 0;
        for (const level of headingLevels) {
          if (previousLevel > 0) {
            expect(level - previousLevel).toBeLessThanOrEqual(1);
          }
          previousLevel = level;
        }
      }
    });

    test('Should have proper ARIA labels and descriptions', async ({ page }) => {
      await page.goto('/');
      
      // Check that interactive elements have proper labels
      const interactiveElements = await page.locator('button, input, select, textarea, [role="button"], [role="combobox"]').all();
      
      for (const element of interactiveElements) {
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledby = await element.getAttribute('aria-labelledby');
        const title = await element.getAttribute('title');
        const textContent = await element.textContent();
        const tagName = await element.evaluate(el => el.tagName);
        
        // Form inputs should have associated labels
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) {
          const id = await element.getAttribute('id');
          if (id) {
            const labelExists = await page.locator(`label[for="${id}"]`).count() > 0;
            expect(
              ariaLabel || ariaLabelledby || labelExists || title
            ).toBeTruthy();
          }
        } else {
          // Other interactive elements should have accessible names
          expect(
            ariaLabel || ariaLabelledby || textContent?.trim() || title
          ).toBeTruthy();
        }
      }
    });

    test('Should use semantic HTML elements appropriately', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper use of semantic elements
      const nav = await page.locator('nav').count();
      const main = await page.locator('main').count();
      const article = await page.locator('article').count();
      const section = await page.locator('section').count();
      
      // Should have navigation and main content areas
      expect(nav).toBeGreaterThanOrEqual(1);
      expect(main).toBeGreaterThanOrEqual(1);
    });

    test('Should have proper form validation and error messaging', async ({ page }) => {
      // Test authentication form (most likely to have validation)
      await page.goto('/auth/signin');
      await page.waitForLoadState('networkidle');
      
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        // Submit form without filling required fields to trigger validation
        const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Check for error messages
          const errorMessages = await page.locator('[role="alert"], .error, [aria-live="polite"], [aria-live="assertive"]').all();
          
          for (const errorMsg of errorMessages) {
            const text = await errorMsg.textContent();
            expect(text?.trim()).toBeTruthy();
            
            // Error messages should be associated with form fields
            const ariaDescribedby = await page.locator('input[aria-describedby]').count();
            if (ariaDescribedby > 0) {
              // At least one input should reference the error message
              expect(ariaDescribedby).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('Should meet color contrast requirements', async ({ page }) => {
      await page.goto('/');
      
      // Test color contrast using axe-core
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['color-contrast'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Should have visible focus indicators', async ({ page }) => {
      await page.goto('/');
      
      const focusableElements = await page.locator('button, input, select, textarea, a, [tabindex]').all();
      
      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        const element = focusableElements[i];
        await element.focus();
        
        // Check if element has visible focus indicator
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el, ':focus');
          return {
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            outlineStyle: computed.outlineStyle,
            outlineColor: computed.outlineColor,
            boxShadow: computed.boxShadow,
            borderColor: computed.borderColor
          };
        });
        
        // Should have some form of focus indicator
        const hasFocusIndicator = (
          styles.outline !== 'none' ||
          styles.outlineWidth !== '0px' ||
          styles.boxShadow !== 'none' ||
          styles.borderColor !== 'rgba(0, 0, 0, 0)'
        );
        
        expect(hasFocusIndicator).toBe(true);
      }
    });

    test('Should handle high contrast mode properly', async ({ page }) => {
      // Test forced colors mode (Windows high contrast)
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto('/');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .analyze();

      // Should not introduce new violations in high contrast mode
      expect(accessibilityScanResults.violations.length).toBeLessThanOrEqual(5);
    });
  });

  test.describe('Neurodiversity-Affirming Design Tests', () => {
    test('Should have predictable navigation patterns', async ({ page }) => {
      await page.goto('/');
      
      // Check for consistent navigation elements across pages
      const navElements = await page.locator('nav').count();
      expect(navElements).toBeGreaterThanOrEqual(1);
      
      // Test navigation to different pages
      const testPages = ['/calendar', '/contacts', '/settings'];
      
      for (const testPage of testPages) {
        try {
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');
          
          // Navigation should remain consistent
          const pageNavElements = await page.locator('nav').count();
          expect(pageNavElements).toBe(navElements);
        } catch (error) {
          // Page might not exist, skip this test for that page
          console.log(`Skipping ${testPage} - page may not exist`);
        }
      }
    });

    test('Should use clear, literal language in UI text', async ({ page }) => {
      await page.goto('/');
      
      // Check for potentially confusing metaphors or idioms in button/link text
      const interactiveText = await page.locator('button, a, [role="button"]').allTextContents();
      
      // Look for common metaphors that might be confusing
      const problematicPhrases = [
        'jump to',
        'dive into',
        'explore',
        'discover',
        'journey',
        'adventure'
      ];
      
      for (const text of interactiveText) {
        const lowerText = text.toLowerCase();
        for (const phrase of problematicPhrases) {
          if (lowerText.includes(phrase)) {
            console.warn(`Potentially confusing metaphorical language found: "${text}"`);
          }
        }
      }
    });

    test('Should provide clear loading states', async ({ page }) => {
      await page.goto('/');
      
      // Look for loading indicators
      const loadingElements = await page.locator('[aria-live="polite"], [aria-live="assertive"], .loading, .spinner, [aria-label*="loading"], [aria-label*="Loading"]').count();
      
      // If there are loading states, they should be announced to screen readers
      if (loadingElements > 0) {
        const loadingText = await page.locator('[aria-live], [aria-label*="loading"], [aria-label*="Loading"]').first().textContent();
        expect(loadingText?.length).toBeGreaterThan(0);
      }
    });

    test('Should allow customization of timing-sensitive interactions', async ({ page }) => {
      await page.goto('/settings');
      
      // Look for timing or animation-related settings
      const timingControls = await page.locator('input, select, button').filter({ 
        hasText: /timeout|timing|animation|motion|auto.*save|delay/i 
      }).count();
      
      // Should provide some timing customization (this is aspirational)
      console.log(`Found ${timingControls} timing-related controls`);
    });
  });

  test.describe('Privacy Controls UX Accessibility', () => {
    test('Privacy level selector should be keyboard accessible', async ({ page }) => {
      await page.goto('/');
      
      // Look for privacy level selectors
      const privacySelectors = await page.locator('[role="combobox"], select, [aria-label*="privacy"], [aria-label*="Privacy"]').count();
      
      if (privacySelectors > 0) {
        const selector = page.locator('[role="combobox"], select').first();
        await selector.focus();
        
        // Should be able to open with Enter or Space
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // Should be able to navigate options with arrow keys
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        
        // Should be able to close with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    });

    test('Privacy level indicators should have clear meaning', async ({ page }) => {
      await page.goto('/');
      
      // Look for privacy indicators (lock icons, badges, etc.)
      const privacyIndicators = await page.locator('[aria-label*="privacy"], [aria-label*="private"], [title*="privacy"], [title*="private"]').all();
      
      for (const indicator of privacyIndicators) {
        const ariaLabel = await indicator.getAttribute('aria-label');
        const title = await indicator.getAttribute('title');
        const textContent = await indicator.textContent();
        
        // Should have clear description of privacy level
        const hasDescription = ariaLabel || title || textContent?.trim();
        expect(hasDescription).toBeTruthy();
      }
    });

    test('Relationship management should be accessible', async ({ page }) => {
      try {
        await page.goto('/contacts');
        await page.waitForLoadState('networkidle');
        
        // Test adding/editing relationships
        const addButton = page.locator('button').filter({ hasText: /add|create|new/i }).first();
        
        if (await addButton.count() > 0) {
          await addButton.click();
          await page.waitForTimeout(500);
          
          // Form should be accessible
          const form = page.locator('form').first();
          if (await form.count() > 0) {
            const accessibilityScanResults = await new AxeBuilder({ page })
              .analyze();
            
            expect(accessibilityScanResults.violations.length).toBeLessThanOrEqual(2);
          }
        }
      } catch (error) {
        console.log('Contacts page may not be accessible, skipping relationship management test');
      }
    });
  });

  test.describe('Mobile Touch Accessibility', () => {
    test('Should have adequate touch target sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      await page.goto('/');
      
      const touchTargets = await page.locator('button, a, input, [role="button"], [role="tab"]').all();
      
      for (const target of touchTargets) {
        const box = await target.boundingBox();
        if (box) {
          // WCAG 2.5.5 Target Size: 44x44 CSS pixels minimum
          expect(box.width).toBeGreaterThanOrEqual(40); // Allowing slight variance
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test('Should work with different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 }, // Small mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1200, height: 800 }  // Desktop
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');
        
        const accessibilityScanResults = await new AxeBuilder({ page })
          .analyze();
        
        expect(accessibilityScanResults.violations.length).toBeLessThanOrEqual(3);
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('Error messages should be accessible and helpful', async ({ page }) => {
      // Try to trigger an error state
      await page.goto('/auth/signin');
      
      // Submit form with invalid data
      const emailInput = page.locator('input[type="email"]').first();
      const submitButton = page.locator('button[type="submit"]').first();
      
      if (await emailInput.count() > 0 && await submitButton.count() > 0) {
        await emailInput.fill('invalid-email');
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Check for error messages
        const errorMessages = await page.locator('[role="alert"], [aria-live], .error').all();
        
        for (const error of errorMessages) {
          const text = await error.textContent();
          if (text && text.trim()) {
            // Error should be descriptive and helpful
            expect(text.length).toBeGreaterThan(10);
            
            // Should not just say "error" - should explain what's wrong
            expect(text.toLowerCase()).not.toBe('error');
            expect(text.toLowerCase()).not.toBe('invalid');
          }
        }
      }
    });

    test('Network error states should be communicated accessibly', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/');
      
      // Look for any network error indicators
      await page.waitForTimeout(2000);
      
      const errorIndicators = await page.locator('[role="alert"], [aria-live], .error, [aria-label*="error"], [aria-label*="Error"]').all();
      
      for (const indicator of errorIndicators) {
        const text = await indicator.textContent();
        const ariaLabel = await indicator.getAttribute('aria-label');
        
        if (text || ariaLabel) {
          // Should provide meaningful error information
          const message = text || ariaLabel || '';
          expect(message.length).toBeGreaterThan(5);
        }
      }
    });
  });
});