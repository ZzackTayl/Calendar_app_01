#!/usr/bin/env node

const puppeteer = require('puppeteer');
const AxeBuilder = require('@axe-core/puppeteer').default;

async function auditAccessibility() {
  console.log('🚀 Starting Accessibility Audit...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Test homepage
    console.log('📄 Auditing Homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    console.log(`\n🏠 Homepage Results:`);
    console.log(`   Violations found: ${results.violations.length}`);

    if (results.violations.length > 0) {
      results.violations.forEach((violation, index) => {
        console.log(`\n   ${index + 1}. ${violation.description}`);
        console.log(`      Impact: ${violation.impact}`);
        console.log(`      Elements affected: ${violation.nodes.length}`);
        console.log(`      WCAG Rule: ${violation.id}`);
        console.log(`      Help: ${violation.helpUrl}`);
      });
    } else {
      console.log('   ✅ No violations found!');
    }

    // Test signin page
    console.log('\n📄 Auditing Sign-in Page...');
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle2' });

    const signinResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    console.log(`   Violations found: ${signinResults.violations.length}`);

    if (signinResults.violations.length > 0) {
      signinResults.violations.forEach((violation, index) => {
        console.log(`\n   ${index + 1}. ${violation.description}`);
        console.log(`      Impact: ${violation.impact}`);
        console.log(`      Elements affected: ${violation.nodes.length}`);
        console.log(`      WCAG Rule: ${violation.id}`);
      });
    } else {
      console.log('   ✅ No violations found!');
    }

    // Test signup page
    console.log('\n📄 Auditing Sign-up Page...');
    await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'networkidle2' });

    const signupResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    console.log(`   Violations found: ${signupResults.violations.length}`);

    if (signupResults.violations.length > 0) {
      signupResults.violations.forEach((violation, index) => {
        console.log(`\n   ${index + 1}. ${violation.description}`);
        console.log(`      Impact: ${violation.impact}`);
        console.log(`      Elements affected: ${violation.nodes.length}`);
        console.log(`      WCAG Rule: ${violation.id}`);
      });
    } else {
      console.log('   ✅ No violations found!');
    }

    // Test calendar page (this might redirect if not authenticated)
    console.log('\n📄 Auditing Calendar Page...');
    try {
      await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle2' });

      const calendarResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      console.log(`   Violations found: ${calendarResults.violations.length}`);

      if (calendarResults.violations.length > 0) {
        calendarResults.violations.forEach((violation, index) => {
          console.log(`\n   ${index + 1}. ${violation.description}`);
          console.log(`      Impact: ${violation.impact}`);
          console.log(`      Elements affected: ${violation.nodes.length}`);
          console.log(`      WCAG Rule: ${violation.id}`);
        });
      } else {
        console.log('   ✅ No violations found!');
      }
    } catch (error) {
      console.log('   ⚠️  Calendar page not accessible (likely requires authentication)');
    }

  } catch (error) {
    console.error('❌ Error during audit:', error.message);
  } finally {
    await browser.close();
    console.log('\n✨ Accessibility audit completed!');
  }
}

auditAccessibility().catch(console.error);
