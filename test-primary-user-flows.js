const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runTests() {
  try {
    await client.connect();
    console.log('Connected to the database');

    // Test 1: User Registration and Onboarding
    console.log('--- Running Test: User Registration and Onboarding ---');
    const user1 = await createUser('testuser1@example.com', 'password123');
    const household = await createHousehold('Test Household', user1.id);
    console.log('User and household created successfully');

    // Test 2: Event Creation and Management
    console.log('--- Running Test: Event Creation and Management ---');
    const event = await createEvent('Test Event', user1.id, household.id);
    console.log('Event created successfully');

    // Test 3: Relationship and Group Management
    console.log('--- Running Test: Relationship and Group Management ---');
    const user2 = await createUser('testuser2@example.com', 'password456');
    await createRelationship(user1.id, user2.id, 'romantic');
    console.log('Relationship created successfully');

    console.log('--- All tests passed! ---');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await client.end();
    console.log('Disconnected from the database');
  }
}

async function createUser(email, password) {
  const res = await client.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *', [email, password]);
  return res.rows[0];
}

async function createHousehold(name, ownerId) {
  const res = await client.query('INSERT INTO households (name, owner_id) VALUES ($1, $2) RETURNING *', [name, ownerId]);
  return res.rows[0];
}

async function createEvent(title, userId, householdId) {
    const res = await client.query(
        'INSERT INTO events (title, created_by, household_id, start_time, end_time) VALUES ($1, $2, $3, NOW(), NOW() + interval \'1 hour\') RETURNING *',
        [title, userId, householdId]
    );
    return res.rows[0];
}


async function createRelationship(user1Id, user2Id, type) {
  const res = await client.query('INSERT INTO relationships (user1_id, user2_id, type) VALUES ($1, $2, $3) RETURNING *', [user1Id, user2Id, type]);
  return res.rows[0];
}

runTests();
