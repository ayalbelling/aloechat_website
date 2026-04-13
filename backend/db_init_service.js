export async function initDb(pool, websiteUser, websitePassword) {
  const client = await pool.connect();
  try {
    // Ensure the website schema exists
    await client.query('CREATE SCHEMA IF NOT EXISTS website');
    console.log('website schema ensured to exist.');

    // Ensure the waitlist_emails table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS website.waitlist_emails (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('waitlist_emails table ensured to exist.');

    let roleExists = false;
    if (websiteUser && websitePassword) {
      const roleRes = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [websiteUser]);
      if (roleRes.rowCount === 0) {
        try {
          await client.query(`CREATE ROLE "${websiteUser}" WITH LOGIN ENCRYPTED PASSWORD '${websitePassword}'`);
          console.log(`Role ${websiteUser} created.`);
          roleExists = true;
        } catch (err) {
          console.warn(`[Warning] Could not create restricted role '${websiteUser}' (requires CREATEROLE privileges). Falling back to admin user connection.`);
        }
      } else {
        console.log(`Role ${websiteUser} already exists.`);
        roleExists = true;
      }

      if (roleExists) {
        await client.query(`REVOKE ALL ON SCHEMA public FROM "${websiteUser}"`);
        await client.query(`GRANT USAGE ON SCHEMA website TO "${websiteUser}"`);
        await client.query(`GRANT INSERT, SELECT ON website.waitlist_emails TO "${websiteUser}"`);
        await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA website TO "${websiteUser}"`);
        console.log(`Granted strict permissions to ${websiteUser} for website schema.`);
      }
    }
    
    return roleExists;
  } finally {
    client.release();
  }
}
