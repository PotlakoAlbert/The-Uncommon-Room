import { Pool, neonConfig } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Neon connection (same as db.ts)
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.poolQueryViaFetch = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

async function runMigration() {
  // Set up database connection
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🚀 Starting migration: optimize-custom-designs-images.sql');
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'optimize-custom-designs-images.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded, executing SQL...');
    
    // Split SQL into individual statements and execute them
    // Remove comments and empty lines first
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
      
    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`🔧 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`   ${i + 1}/${statements.length}: Creating index...`);
          await pool.query(statement);
          console.log(`   ✅ Success`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  Already exists, skipping`);
          } else {
            console.error(`❌ Failed on statement ${i + 1}:`, statement);
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added the following optimizations:');
    console.log('   • Performance indexes for status, created_at, user_id');
    console.log('   • Computed has_images column for fast filtering');
    console.log('   • Computed total_references column for statistics');
    console.log('   • Constraints for reasonable reference limits');
    console.log('   • Documentation comments for better understanding');
    
    // Test basic statistics
    console.log('\n🔍 Testing basic table statistics...');
    const testQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN json_array_length(reference_images) > 0 THEN 1 END) as requests_with_images
      FROM custom_design_requests;
    `;
    
    const result = await pool.query(testQuery);
    const stats = result.rows[0];
    
    console.log('📈 Current statistics:');
    console.log(`   • Total requests: ${stats.total_requests}`);
    console.log(`   • Requests with images: ${stats.requests_with_images}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
runMigration().catch(console.error);