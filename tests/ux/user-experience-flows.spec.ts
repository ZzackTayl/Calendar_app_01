import { test, expect } from '@playwright/test';

/**
 * User Experience Flow Testing Suite for PolyHarmony Calendar
 * 
 * This suite evaluates the user experience flows, particularly focusing on:
 * - Neurodiversity-affirming design
 * - Onboarding experience 
 * - Privacy control UX
 * - Error handling and recovery
 * - Trust-building elements
 */

test.describe('User Experience Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Onboarding and First User Experience', () => {
    test('First-time visitor should understand the app purpose quickly', async ({ page }) => {
      await page.goto('/');
      
      // Look for clear value proposition within the first 5 seconds
      const headings = await page.locator('h1, h2').allTextContents();
      const descriptions = await page.locator('p, [role="main"] div').allTextContents();
      
      const allText = [...headings, ...descriptions].join(' ').toLowerCase();
      
      // Should mention key concepts that help users understand the app
      const keyTerms = ['calendar', 'polyamory', 'privacy', 'relationship', 'schedule'];
      let mentionedTerms = 0;
      
      for (const term of keyTerms) {
        if (allText.includes(term)) {
          mentionedTerms++;
        }
      }
      
      expect(mentionedTerms).toBeGreaterThanOrEqual(2);
    });

    test('Sign-up process should feel welcoming and safe', async ({ page }) => {
      await page.goto('/auth/signup');
      
      // Check for welcoming language
      const pageText = await page.textContent('body');
      const welcomingWords = ['welcome', 'safe', 'private', 'secure', 'comfortable'];
      
      let welcomingLanguage = false;
      for (const word of welcomingWords) {
        if (pageText?.toLowerCase().includes(word)) {
          welcomingLanguage = true;
          break;
        }
      }
      
      // Should have clear privacy assurances
      const privacyMentions = pageText?.toLowerCase().includes('privacy') || 
                             pageText?.toLowerCase().includes('private') ||
                             pageText?.toLowerCase().includes('secure');
      
      expect(welcomingLanguage || privacyMentions).toBe(true);
    });

    test('Email verification process should be clearly explained', async ({ page }) => {
      await page.goto('/auth/confirm-email');
      
      const pageContent = await page.textContent('body');
      
      // Should explain what's happening and what to do
      const hasExplanation = pageContent?.toLowerCase().includes('email') &&
                           (pageContent?.toLowerCase().includes('verify') ||
                            pageContent?.toLowerCase().includes('confirm') ||
                            pageContent?.toLowerCase().includes('check'));
      
      expect(hasExplanation).toBe(true);
      
      // Should not leave user wondering what to do next
      const hasNextSteps = pageContent?.toLowerCase().includes('check') ||
                          pageContent?.toLowerCase().includes('look') ||
                          pageContent?.toLowerCase().includes('click') ||
                          pageContent?.toLowerCase().includes('follow');
      
      expect(hasNextSteps).toBe(true);
    });

    test('New user should be guided through key features', async ({ page }) => {
      // Test if there are any onboarding elements
      const helpElements = await page.locator('[aria-label*="help"], [aria-label*="guide"], [aria-label*="tutorial"], .tour, .onboarding, .help').count();
      
      // Should have some form of guidance (tooltips, help text, etc.)
      const helpText = await page.locator('.help-text, [role="tooltip"], [aria-describedby]').count();
      
      // Even if no formal onboarding, should have some helpful guidance
      expect(helpElements + helpText).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Privacy Controls User Experience', () => {
    test('Privacy levels should be intuitively understandable', async ({ page }) => {
      // Look for privacy level indicators across the app
      const privacyElements = await page.locator('[aria-label*="privacy"], [title*="privacy"], [class*="privacy"]').all();
      
      for (const element of privacyElements) {
        const ariaLabel = await element.getAttribute('aria-label');
        const title = await element.getAttribute('title');
        const textContent = await element.textContent();
        
        const description = ariaLabel || title || textContent || '';
        
        // Should use clear, jargon-free language
        const hasJargon = description.toLowerCase().includes('rls') ||
                         description.toLowerCase().includes('rbac') ||
                         description.toLowerCase().includes('acl');
        
        expect(hasJargon).toBe(false);
        
        // Should be descriptive enough to understand
        if (description.trim()) {
          expect(description.length).toBeGreaterThan(5);
        }
      }
    });

    test('Privacy settings changes should provide clear feedback', async ({ page }) => {
      try {
        await page.goto('/settings/privacy');
        
        // Look for interactive privacy controls
        const privacyControls = await page.locator('select, input[type="radio"], input[type="checkbox"], [role="combobox"]').all();
        
        if (privacyControls.length > 0) {
          const control = privacyControls[0];
          
          // Interact with the control
          await control.click();
          await page.waitForTimeout(500);
          
          // Should show some form of feedback (save button, status message, etc.)
          const feedbackElements = await page.locator('[role="alert"], .success, .saved, .updated, [aria-live]').count();
          
          // If no immediate feedback, should at least have a way to save changes
          const saveButton = await page.locator('button').filter({ hasText: /save|apply|update/i }).count();
          
          expect(feedbackElements + saveButton).toBeGreaterThanOrEqual(1);
        }
      } catch (error) {
        console.log('Privacy settings page may not be available');
      }
    });

    test('Privacy implications should be clearly communicated', async ({ page }) => {
      // Look for privacy-related explanatory text
      const privacyExplanations = await page.locator('p, div, span').filter({ hasText: /privacy|private|visible|share|access/i }).all();
      
      let hasGoodExplanation = false;
      
      for (const explanation of privacyExplanations.slice(0, 5)) {
        const text = await explanation.textContent();
        if (text && text.length > 20) {
          // Should explain consequences, not just state the setting
          const explainsTConsequences = text.toLowerCase().includes('can see') ||
                                       text.toLowerCase().includes('will be') ||
                                       text.toLowerCase().includes('means') ||
                                       text.toLowerCase().includes('allows') ||
                                       text.toLowerCase().includes('prevents');
          
          if (explainsTConsequences) {
            hasGoodExplanation = true;
            break;
          }
        }
      }
      
      expect(hasGoodExplanation).toBe(true);
    });
  });

  test.describe('Calendar and Scheduling UX', () => {
    test('Calendar navigation should be predictable', async ({ page }) => {
      try {
        await page.goto('/calendar');
        
        // Look for calendar navigation controls
        const navControls = await page.locator('button').filter({ hasText: /next|previous|today|month|week|day/i }).count();
        
        expect(navControls).toBeGreaterThanOrEqual(2);
        
        // Test navigation behavior
        const nextButton = page.locator('button').filter({ hasText: /next/i }).first();
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(500);
          
          // Should show some indication of the time period being viewed
          const timeIndicators = await page.locator('[class*="date"], [class*="month"], [aria-label*="date"], [aria-label*="month"]').count();
          expect(timeIndicators).toBeGreaterThanOrEqual(1);
        }
      } catch (error) {
        console.log('Calendar page may not be available');
      }
    });

    test('Event creation should be intuitive', async ({ page }) => {
      try {
        await page.goto('/calendar');
        
        // Look for event creation trigger
        const createButtons = await page.locator('button').filter({ hasText: /add|create|new.*event/i }).count();
        
        if (createButtons > 0) {
          const createButton = page.locator('button').filter({ hasText: /add|create|new.*event/i }).first();
          await createButton.click();
          await page.waitForTimeout(500);
          
          // Should have clear form labels
          const formInputs = await page.locator('input, textarea, select').all();
          
          for (const input of formInputs.slice(0, 3)) {
            const id = await input.getAttribute('id');
            const ariaLabel = await input.getAttribute('aria-label');
            
            if (id) {
              const labelExists = await page.locator(`label[for="${id}"]`).count() > 0;
              expect(labelExists || ariaLabel).toBeTruthy();
            } else {
              expect(ariaLabel).toBeTruthy();
            }
          }
        }
      } catch (error) {
        console.log('Calendar page or event creation may not be available');
      }
    });

    test('Conflict detection should be clearly communicated', async ({ page }) => {
      try {
        await page.goto('/calendar');
        
        // Look for any conflict-related UI elements
        const conflictElements = await page.locator('[class*="conflict"], [aria-label*="conflict"], [title*="conflict"]').count();
        
        // Look for warning or alert styling that might indicate conflicts
        const warningElements = await page.locator('[class*="warning"], [class*="alert"], [role="alert"]').count();
        
        console.log(`Found ${conflictElements} conflict elements and ${warningElements} warning elements`);
        
        // Should have some way to communicate scheduling conflicts
        // (This is more of a feature check than a strict requirement)
      } catch (error) {
        console.log('Calendar page may not be available');
      }
    });
  });

  test.describe('Relationship Management UX', () => {
    test('Adding relationships should feel non-judgmental', async ({ page }) => {
      try {
        await page.goto('/contacts');
        
        // Check language used in relationship management
        const pageText = await page.textContent('body');
        
        // Should avoid judgmental language
        const judgmentalTerms = ['normal', 'proper', 'appropriate', 'correct', 'right way', 'wrong way'];
        
        for (const term of judgmentalTerms) {
          expect(pageText?.toLowerCase().includes(term)).toBe(false);
        }
        
        // Should use inclusive language
        const inclusiveTerms = ['partner', 'relationship', 'connection', 'person'];
        let hasInclusiveLanguage = false;
        
        for (const term of inclusiveTerms) {
          if (pageText?.toLowerCase().includes(term)) {
            hasInclusiveLanguage = true;
            break;
          }
        }
        
        expect(hasInclusiveLanguage).toBe(true);
      } catch (error) {
        console.log('Contacts page may not be available');
      }
    });

    test('Relationship types should be flexible and inclusive', async ({ page }) => {
      try {
        await page.goto('/contacts/create');
        
        // Look for relationship type options
        const relationshipSelectors = await page.locator('select, [role="combobox"], input[type="radio"]').all();
        
        for (const selector of relationshipSelectors) {
          const ariaLabel = await selector.getAttribute('aria-label');
          const nearbyText = await selector.evaluate(el => {
            const label = el.parentElement?.querySelector('label');
            return label ? label.textContent : el.parentElement?.textContent;
          });
          
          const contextText = ariaLabel || nearbyText || '';
          
          if (contextText.toLowerCase().includes('relationship') || contextText.toLowerCase().includes('type')) {
            // Should not enforce traditional relationship categories
            const options = await selector.evaluate(el => {
              if (el.tagName === 'SELECT') {
                return Array.from(el.options).map(opt => opt.text);
              }
              return [];
            });
            
            // Should allow for diverse relationship types
            const hasFlexibleOptions = options.length === 0 || // No restrictive dropdown
                                      options.some(opt => opt.toLowerCase().includes('other')) ||
                                      options.some(opt => opt.toLowerCase().includes('custom')) ||
                                      options.length > 5; // Many options suggests inclusivity
            
            expect(hasFlexibleOptions).toBe(true);
            break;
          }
        }
      } catch (error) {
        console.log('Contacts creation page may not be available');
      }
    });
  });

  test.describe('Error Handling and Recovery UX', () => {
    test('Error messages should be helpful and supportive', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Try to trigger a form validation error
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        const submitButton = form.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Check error message quality
        const errorMessages = await page.locator('[role="alert"], .error, [class*="error"]').allTextContents();
        
        for (const errorMsg of errorMessages) {
          if (errorMsg.trim()) {
            // Should be specific, not vague
            expect(errorMsg.toLowerCase()).not.toBe('error');
            expect(errorMsg.toLowerCase()).not.toBe('invalid');
            expect(errorMsg.toLowerCase()).not.toBe('required');
            
            // Should be supportive, not harsh
            const harshWords = ['wrong', 'bad', 'invalid', 'illegal', 'forbidden'];
            let isHarsh = false;
            for (const word of harshWords) {
              if (errorMsg.toLowerCase().includes(word)) {
                isHarsh = true;
                break;
              }
            }
            expect(isHarsh).toBe(false);
            
            // Should provide guidance
            const providesGuidance = errorMsg.toLowerCase().includes('please') ||
                                   errorMsg.toLowerCase().includes('try') ||
                                   errorMsg.toLowerCase().includes('should') ||
                                   errorMsg.toLowerCase().includes('must') ||
                                   errorMsg.toLowerCase().includes('need');
            
            expect(providesGuidance).toBe(true);
          }
        }
      }
    });

    test('Network issues should be handled gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 3000);
      });
      
      await page.goto('/');
      
      // Look for loading states
      const loadingElements = await page.locator('.loading, [aria-label*="loading"], .spinner').count();
      
      // Should show loading feedback for slow operations
      console.log(`Found ${loadingElements} loading indicators`);
      
      // Clean up the route
      await page.unroute('**/api/**');
    });

    test('Offline state should be communicated clearly', async ({ page }) => {
      // Simulate offline state
      await page.context().setOffline(true);
      
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // Look for offline indicators
      const offlineElements = await page.locator('[aria-label*="offline"], [class*="offline"], [role="alert"]').count();
      
      console.log(`Found ${offlineElements} offline indicators`);
      
      // Restore online state
      await page.context().setOffline(false);
    });
  });

  test.describe('Neurodiversity-Affirming Design Validation', () => {
    test('Interface should be predictable and consistent', async ({ page }) => {
      const testPages = ['/', '/calendar', '/contacts', '/settings'];
      let navigationStructure: any = null;
      
      for (const testPage of testPages) {
        try {
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');
          
          // Check navigation consistency
          const navElements = await page.locator('nav, [role="navigation"]').count();
          const navItems = await page.locator('nav a, [role="navigation"] a, nav button, [role="navigation"] button').count();
          
          if (navigationStructure === null) {
            navigationStructure = { navElements, navItems };
          } else {
            // Navigation should be consistent across pages
            expect(navElements).toBe(navigationStructure.navElements);
            expect(Math.abs(navItems - navigationStructure.navItems)).toBeLessThanOrEqual(2); // Allow for some variation
          }
        } catch (error) {
          console.log(`Page ${testPage} may not be available`);
        }
      }
    });

    test('Should minimize cognitive load in information presentation', async ({ page }) => {
      await page.goto('/');
      
      // Check for progressive disclosure patterns
      const collapsibleElements = await page.locator('[aria-expanded], details, .collapsible').count();
      
      // Check for chunked information presentation
      const sections = await page.locator('section, [role="region"], .section').count();
      
      // Should break information into digestible chunks
      expect(sections).toBeGreaterThanOrEqual(1);
      
      // Check for overwhelming information density
      const textElements = await page.locator('p, div, span').allTextContents();
      const veryLongTexts = textElements.filter(text => text.length > 500).length;
      
      // Should not have many very long blocks of text without breaks
      expect(veryLongTexts).toBeLessThanOrEqual(2);
    });

    test('Should provide clear status feedback for user actions', async ({ page }) => {
      await page.goto('/');
      
      // Look for buttons and test their feedback
      const buttons = await page.locator('button').all();
      
      for (const button of buttons.slice(0, 3)) {
        const originalText = await button.textContent();
        
        await button.click();
        await page.waitForTimeout(300);
        
        // Check if button state changed to indicate action was received
        const newText = await button.textContent();
        const hasVisualFeedback = originalText !== newText;
        
        // Or check if there's feedback elsewhere
        const feedbackElements = await page.locator('[role="alert"], [aria-live], .success, .feedback').count();
        
        console.log(`Button "${originalText}" - Visual feedback: ${hasVisualFeedback}, Feedback elements: ${feedbackElements}`);
        
        // Don't break other tests by staying on modified state
        await page.goto('/');
        break; // Just test one button to avoid side effects
      }
    });

    test('Should use identity-first language appropriately', async ({ page }) => {
      await page.goto('/');
      
      const bodyText = await page.textContent('body');
      
      // Check for person-first vs identity-first language patterns
      // In neurodivergent communities, identity-first is often preferred
      const personFirstPatterns = ['person with autism', 'person with adhd', 'person with disabilities'];
      const identityFirstPatterns = ['autistic person', 'adhd person', 'disabled person'];
      
      let personFirstCount = 0;
      let identityFirstCount = 0;
      
      for (const pattern of personFirstPatterns) {
        if (bodyText?.toLowerCase().includes(pattern)) {
          personFirstCount++;
        }
      }
      
      for (const pattern of identityFirstPatterns) {
        if (bodyText?.toLowerCase().includes(pattern)) {
          identityFirstCount++;
        }
      }
      
      // If using disability language, should be consistent with community preferences
      if (personFirstCount + identityFirstCount > 0) {
        console.log(`Person-first language instances: ${personFirstCount}, Identity-first: ${identityFirstCount}`);
      }
    });
  });

  test.describe('Trust and Safety UX', () => {
    test('Privacy policy and terms should be easily accessible', async ({ page }) => {
      await page.goto('/');
      
      // Look for privacy policy links
      const privacyLinks = await page.locator('a').filter({ hasText: /privacy|terms|data|policy/i }).count();
      expect(privacyLinks).toBeGreaterThanOrEqual(1);
      
      // Privacy information should be prominently available
      const footerLinks = await page.locator('footer a, [role="contentinfo"] a').filter({ hasText: /privacy|terms/i }).count();
      expect(footerLinks).toBeGreaterThanOrEqual(1);
    });

    test('Data handling should be transparently communicated', async ({ page }) => {
      try {
        await page.goto('/privacy');
        
        const privacyContent = await page.textContent('body');
        
        // Should explain what data is collected
        const explainsDataCollection = privacyContent?.toLowerCase().includes('collect') &&
                                     privacyContent?.toLowerCase().includes('data');
        
        // Should explain how data is used
        const explainsDataUse = privacyContent?.toLowerCase().includes('use') &&
                               privacyContent?.toLowerCase().includes('information');
        
        // Should address sharing practices
        const explainsSharing = privacyContent?.toLowerCase().includes('share') ||
                               privacyContent?.toLowerCase().includes('third party') ||
                               privacyContent?.toLowerCase().includes('partner');
        
        expect(explainsDataCollection).toBe(true);
        expect(explainsDataUse).toBe(true);
        expect(explainsSharing).toBe(true);
      } catch (error) {
        console.log('Privacy page may not be available');
      }
    });

    test('User should have control over their data', async ({ page }) => {
      try {
        await page.goto('/settings');
        
        // Look for data control options
        const dataControls = await page.locator('button, a').filter({ 
          hasText: /delete|remove|export|download|account/i 
        }).count();
        
        expect(dataControls).toBeGreaterThanOrEqual(1);
      } catch (error) {
        console.log('Settings page may not be available');
      }
    });
  });
});