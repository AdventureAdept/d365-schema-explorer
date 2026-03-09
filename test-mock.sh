#!/bin/bash

# Test script for D365 Schema Explorer using mock data
# This allows testing without a real Dataverse org

echo "========================================="
echo "D365 Schema Explorer - Mock Data Test"
echo "========================================="
echo ""

cd "$(dirname "$0")"

# Build first
echo "Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi
echo "✓ Build successful"
echo ""

# Create mock test script
cat > dist/test-mock.js << 'EOF'
const { MockDataverseClient } = require('./api/mock-client');
const { CacheManager } = require('./cache/manager');
const { ConfigManager } = require('./config/manager');
const fs = require('fs');
const path = require('path');

async function runMockTest() {
  console.log('🧪 Running mock Dataverse test...\n');

  // Setup mock client
  const mockClient = new MockDataverseClient();

  // Test connection
  console.log('1. Testing connection...');
  const connected = await mockClient.testConnection();
  console.log(`   ✓ Connected: ${connected}\n`);

  // Get entity definitions
  console.log('2. Fetching entity definitions...');
  const entities = await mockClient.getEntityDefinitions();
  console.log(`   ✓ Found ${entities.length} entities:`);
  entities.forEach(e => {
    const icon = e.IsCustomEntity ? '📦' : '📋';
    console.log(`     ${icon} ${e.LogicalName} (${e.DisplayName?.UserLocalizedLabel?.Label || 'N/A'})`);
  });
  console.log();

  // Get full metadata for account
  console.log('3. Fetching full metadata for "account"...');
  const account = await mockClient.getFullEntityMetadata('account');
  console.log(`   ✓ Entity: ${account.DisplayName?.UserLocalizedLabel?.Label}`);
  console.log(`   ✓ Attributes: ${account.Attributes?.length || 0}`);
  console.log(`   ✓ Relationships: ${(account.ManyToOneRelationships?.length || 0) + (account.OneToManyRelationships?.length || 0)}`);
  console.log();

  // Show account attributes
  console.log('4. Account attributes:');
  account.Attributes?.forEach(attr => {
    const type = attr.AttributeType || 'Unknown';
    const name = attr.LogicalName;
    const display = attr.DisplayName?.UserLocalizedLabel?.Label || name;
    console.log(`   • ${name} (${type}) - ${display}`);
  });
  console.log();

  // Search test
  console.log('5. Testing search for "contact"...');
  const searchResults = await mockClient.searchEntities('contact');
  console.log(`   ✓ Found ${searchResults.length} result(s):`);
  searchResults.forEach(e => {
    console.log(`     • ${e.LogicalName}`);
  });
  console.log();

  // Test cache
  console.log('6. Testing cache...');
  const testDir = path.join(__dirname, '..', '.test-cache');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const cache = new CacheManager(testDir, 'mock-test');
  cache.open();

  // Store entities
  for (const entity of entities) {
    cache.upsertEntity(entity);
  }

  // Store attributes for account
  if (account.Attributes) {
    cache.upsertAttributes('account', account.Attributes);
  }

  // Update cache metadata
  cache.updateCacheMetadata({
    lastSync: new Date().toISOString(),
    entityCount: entities.length,
    version: '1.0',
  });

  // Retrieve from cache
  const cachedEntities = cache.getAllEntities();
  console.log(`   ✓ Cached ${cachedEntities.length} entities`);

  const cachedAccount = cache.getEntity('account');
  console.log(`   ✓ Retrieved 'account' from cache: ${cachedAccount?.LogicalName}`);

  const searchCached = cache.searchEntities('project');
  console.log(`   ✓ Cache search for 'project': ${searchCached.length} result(s)`);

  cache.close();

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('   ✓ Cache test complete\n');

  console.log('=========================================');
  console.log('✅ All mock tests passed!');
  console.log('=========================================');
}

runMockTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
EOF

# Run the test
echo "Running mock tests..."
echo ""
node dist/test-mock.js

# Cleanup
rm -f dist/test-mock.js

echo ""
echo "Test complete!"
