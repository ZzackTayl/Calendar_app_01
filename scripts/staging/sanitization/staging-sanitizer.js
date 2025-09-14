#!/usr/bin/env node
/**
 * PolyHarmony Staging Data Sanitizer
 * Sanitizes production data for safe use in staging environment
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    dryRun: process.env.DRY_RUN === 'true',
    preserveTestUsers: process.env.PRESERVE_TEST_USERS !== 'false',
    sanitizationMode: process.env.SANITIZATION_MODE || 'staging',
    batchSize: 100,
};

// Initialize database connection
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Logging utility
 */
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

/**
 * Generate fake data
 */
function generateFakeData() {
    const domains = ['example.com', 'test.org', 'demo.net'];
    const firstNames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'River', 'Sage', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const cities = ['Test City', 'Demo Town', 'Sample Village', 'Example Heights'];
    const states = ['Test State', 'Demo Province', 'Sample Region'];

    return {
        email: () => `user_${crypto.randomBytes(4).toString('hex')}@${domains[Math.floor(Math.random() * domains.length)]}`,
        name: () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        phone: () => '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
        location: () => `${cities[Math.floor(Math.random() * cities.length)]}, ${states[Math.floor(Math.random() * states.length)]}`,
        bio: () => 'This is a sanitized test user bio for staging environment.',
        title: (id) => `Test Event ${id}`,
        description: () => 'This is a sanitized event description for staging testing.',
        url: (id) => `https://example.com/test_file_${id}`,
    };
}

const fake = generateFakeData();

/**
 * Sanitize user profiles
 */
async function sanitizeProfiles() {
    log('Starting profile sanitization...');

    try {
        // Get all profiles except test users
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone, avatar_url, bio, location')
            .not('email', 'like', '%@example.com');

        if (error) throw error;

        log(`Found ${profiles.length} profiles to sanitize`);

        for (let i = 0; i < profiles.length; i += CONFIG.batchSize) {
            const batch = profiles.slice(i, i + CONFIG.batchSize);

            const updates = batch.map(profile => ({
                id: profile.id,
                email: fake.email(),
                full_name: fake.name(),
                phone: Math.random() > 0.5 ? fake.phone() : null,
                avatar_url: null,
                bio: profile.bio ? fake.bio() : null,
                location: profile.location ? fake.location() : null,
            }));

            if (!CONFIG.dryRun) {
                for (const update of updates) {
                    const { error } = await supabase
                        .from('profiles')
                        .update(update)
                        .eq('id', update.id);

                    if (error) {
                        log(`Error updating profile ${update.id}: ${error.message}`, 'error');
                    }
                }
            }

            log(`Processed batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(profiles.length / CONFIG.batchSize)}`);
        }

        log(`Profile sanitization completed. ${profiles.length} profiles processed.`);

    } catch (error) {
        log(`Error sanitizing profiles: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Sanitize calendar events
 */
async function sanitizeEvents() {
    log('Starting event sanitization...');

    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('id, title, description, location, notes');

        if (error) throw error;

        log(`Found ${events.length} events to sanitize`);

        for (let i = 0; i < events.length; i += CONFIG.batchSize) {
            const batch = events.slice(i, i + CONFIG.batchSize);

            const updates = batch.map(event => ({
                id: event.id,
                title: event.title?.includes('private') || event.title?.includes('personal')
                    ? 'Private Event'
                    : fake.title(event.id),
                description: event.description ? fake.description() : null,
                location: event.location ? fake.location() : null,
                notes: event.notes ? 'Sanitized event notes for staging.' : null,
            }));

            if (!CONFIG.dryRun) {
                for (const update of updates) {
                    const { error } = await supabase
                        .from('events')
                        .update(update)
                        .eq('id', update.id);

                    if (error) {
                        log(`Error updating event ${update.id}: ${error.message}`, 'error');
                    }
                }
            }

            log(`Processed batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(events.length / CONFIG.batchSize)}`);
        }

        log(`Event sanitization completed. ${events.length} events processed.`);

    } catch (error) {
        log(`Error sanitizing events: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Sanitize relationships
 */
async function sanitizeRelationships() {
    log('Starting relationship sanitization...');

    try {
        const { data: relationships, error } = await supabase
            .from('relationships')
            .select('id, notes, anniversary_date');

        if (error) throw error;

        log(`Found ${relationships.length} relationships to sanitize`);

        for (let i = 0; i < relationships.length; i += CONFIG.batchSize) {
            const batch = relationships.slice(i, i + CONFIG.batchSize);

            const updates = batch.map(relationship => ({
                id: relationship.id,
                notes: relationship.notes ? 'Sanitized relationship notes for staging testing.' : null,
                anniversary_date: null, // Remove sensitive anniversary dates
            }));

            if (!CONFIG.dryRun) {
                for (const update of updates) {
                    const { error } = await supabase
                        .from('relationships')
                        .update(update)
                        .eq('id', update.id);

                    if (error) {
                        log(`Error updating relationship ${update.id}: ${error.message}`, 'error');
                    }
                }
            }

            log(`Processed batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(relationships.length / CONFIG.batchSize)}`);
        }

        log(`Relationship sanitization completed. ${relationships.length} relationships processed.`);

    } catch (error) {
        log(`Error sanitizing relationships: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Sanitize attachments
 */
async function sanitizeAttachments() {
    log('Starting attachment sanitization...');

    try {
        const { data: attachments, error } = await supabase
            .from('attachments')
            .select('id, file_name, file_url, original_name');

        if (error) throw error;

        log(`Found ${attachments.length} attachments to sanitize`);

        for (let i = 0; i < attachments.length; i += CONFIG.batchSize) {
            const batch = attachments.slice(i, i + CONFIG.batchSize);

            const updates = batch.map(attachment => ({
                id: attachment.id,
                file_name: `test_file_${attachment.id}.txt`,
                file_url: fake.url(attachment.id),
                original_name: `test_file_${attachment.id}.txt`,
            }));

            if (!CONFIG.dryRun) {
                for (const update of updates) {
                    const { error } = await supabase
                        .from('attachments')
                        .update(update)
                        .eq('id', update.id);

                    if (error) {
                        log(`Error updating attachment ${update.id}: ${error.message}`, 'error');
                    }
                }
            }

            log(`Processed batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(attachments.length / CONFIG.batchSize)}`);
        }

        log(`Attachment sanitization completed. ${attachments.length} attachments processed.`);

    } catch (error) {
        log(`Error sanitizing attachments: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Sanitize invitations
 */
async function sanitizeInvitations() {
    log('Starting invitation sanitization...');

    try {
        const { data: invitations, error } = await supabase
            .from('invitations')
            .select('id, email, message')
            .not('email', 'like', '%@example.com');

        if (error) throw error;

        log(`Found ${invitations.length} invitations to sanitize`);

        for (let i = 0; i < invitations.length; i += CONFIG.batchSize) {
            const batch = invitations.slice(i, i + CONFIG.batchSize);

            const updates = batch.map(invitation => ({
                id: invitation.id,
                email: fake.email(),
                message: invitation.message ? 'This is a sanitized test invitation message for staging.' : null,
            }));

            if (!CONFIG.dryRun) {
                for (const update of updates) {
                    const { error } = await supabase
                        .from('invitations')
                        .update(update)
                        .eq('id', update.id);

                    if (error) {
                        log(`Error updating invitation ${update.id}: ${error.message}`, 'error');
                    }
                }
            }

            log(`Processed batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(invitations.length / CONFIG.batchSize)}`);
        }

        log(`Invitation sanitization completed. ${invitations.length} invitations processed.`);

    } catch (error) {
        log(`Error sanitizing invitations: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Generate sanitization report
 */
async function generateReport() {
    log('Generating sanitization report...');

    try {
        const tables = ['profiles', 'events', 'relationships', 'attachments', 'invitations'];
        const report = {
            timestamp: new Date().toISOString(),
            sanitizationMode: CONFIG.sanitizationMode,
            dryRun: CONFIG.dryRun,
            tables: {},
        };

        for (const table of tables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                log(`Error counting ${table}: ${error.message}`, 'error');
                report.tables[table] = { error: error.message };
            } else {
                report.tables[table] = { count };
            }
        }

        // Write report to file
        const fs = require('fs');
        const reportPath = '/app/logs/sanitization-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        log(`Sanitization report generated: ${reportPath}`);
        log(`Report summary: ${JSON.stringify(report.tables, null, 2)}`);

    } catch (error) {
        log(`Error generating report: ${error.message}`, 'error');
    }
}

/**
 * Main sanitization process
 */
async function main() {
    log('=== PolyHarmony Staging Data Sanitization ===');
    log(`Mode: ${CONFIG.sanitizationMode}`);
    log(`Dry run: ${CONFIG.dryRun}`);
    log(`Preserve test users: ${CONFIG.preserveTestUsers}`);

    try {
        // Verify database connection
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;

        log('Database connection verified');

        // Run sanitization tasks
        await sanitizeProfiles();
        await sanitizeEvents();
        await sanitizeRelationships();
        await sanitizeAttachments();
        await sanitizeInvitations();

        // Generate report
        await generateReport();

        log('=== Staging data sanitization completed successfully ===');

    } catch (error) {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        log(`Unhandled error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { main, sanitizeProfiles, sanitizeEvents, sanitizeRelationships };