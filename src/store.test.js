// Standalone test for store.js — run with: node src/store.test.js
const store = require('./store.js');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log('  PASS:', label);
    passed++;
  } else {
    console.error('  FAIL:', label);
    failed++;
  }
}

function reset() {
  // Clear data between tests
  const fs = require('fs');
  const path = require('path');
  const dataDir = path.join(__dirname, '..', 'data');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

// --- Test Suite ---

console.log('\n=== store.js Unit Tests ===\n');

reset();

// 1. loadHistory returns empty array when no data
console.log('1. Empty history on first load:');
let history = store.getHistory();
assert(Array.isArray(history) && history.length === 0, 'getHistory returns empty array');

// 2. addItem for text
console.log('\n2. Add text item:');
const textItem = store.addItem({
  type: 'text',
  content: 'Hello, clipboard!'
});
assert(textItem.id && textItem.type === 'text', 'item has id and correct type');
assert(textItem.content === 'Hello, clipboard!', 'content is stored');
assert(typeof textItem.timestamp === 'number', 'timestamp is set');

// 3. getHistory returns 1 item
history = store.getHistory();
assert(history.length === 1, 'getHistory returns 1 item');

// 4. addItem for image
console.log('\n3. Add image item:');
const fakePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]); // minimal PNG header
const imgPath = store.saveImage(fakePng);
assert(imgPath.includes('images') && imgPath.endsWith('.png'), 'image saved with correct path');

const imgItem = store.addItem({
  type: 'image',
  imagePath: imgPath,
  timestamp: Date.now() - 1000 // 1 second earlier
});
assert(imgItem.type === 'image', 'image item has correct type');
history = store.getHistory();
assert(history.length === 2, 'getHistory returns 2 items');

// 5. Order: newest first (for unpinned items)
console.log('\n4. Time ordering (newest first):');
assert(history[0].id === textItem.id, 'newer text item is first');
assert(history[1].id === imgItem.id, 'older image item is second');

// 6. Pin the image item (older one)
console.log('\n5. Pin item:');
const pinned = store.pinItem(imgItem.id);
assert(pinned.pinned === true, 'item is now pinned');
history = store.getHistory();
assert(history[0].id === imgItem.id, 'pinned item is first regardless of time');
assert(history[1].id === textItem.id, 'unpinned item is second');

// 7. Unpin
console.log('\n6. Unpin item:');
const unpinned = store.pinItem(imgItem.id);
assert(unpinned.pinned === false, 'item is now unpinned');
history = store.getHistory();
assert(history[0].id === textItem.id, 'unpinned item back in time order');

// 8. Remove item
console.log('\n7. Remove item:');
const removed = store.removeItem(imgItem.id);
assert(removed !== null, 'item was removed');
assert(removed.id === imgItem.id, 'correct item removed');
history = store.getHistory();
assert(history.length === 1, 'only 1 item left');

// 9. Remove non-existent
console.log('\n8. Remove non-existent item:');
const notFound = store.removeItem('non-existent-id');
assert(notFound === null, 'returns null for non-existent id');

// 10. Settings
console.log('\n9. Settings:');
let settings = store.loadSettings();
assert(settings.retentionDays === 3, 'default retention is 3 days');

store.saveSettings({ retentionDays: 5 });
settings = store.loadSettings();
assert(settings.retentionDays === 5, 'retention updated to 5 days');

store.saveSettings({ retentionDays: 1 });
settings = store.loadSettings();
assert(settings.retentionDays === 1, 'retention updated to 1 day');

// 11. Cleanup by date
console.log('\n10. Cleanup by date:');
reset(); // fresh start
store.saveSettings({ retentionDays: 3 });

// Add an old item
store.addItem({
  type: 'text',
  content: 'old item',
  timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 // 4 days ago
});
// Add a recent item
store.addItem({
  type: 'text',
  content: 'recent item',
  timestamp: Date.now()
});

const result = store.cleanup(3, store.MAX_ITEMS);
assert(result.removed === 1, '1 old item removed');
history = store.getHistory();
assert(history.length === 1, 'only recent item remains');
assert(history[0].content === 'recent item', 'correct item kept');

// 12. Pinned items survive cleanup
console.log('\n11. Pinned items survive cleanup:');
reset();
store.saveSettings({ retentionDays: 1 });

store.addItem({
  type: 'text',
  content: 'pinned old item',
  timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
  pinned: true
});
store.addItem({
  type: 'text',
  content: 'unpinned old item',
  timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000 // 2 days ago
});

const result2 = store.cleanup(1, store.MAX_ITEMS);
assert(result2.removed === 1, '1 unpinned old item removed');
history = store.getHistory();
assert(history.length === 1, 'pinned item survived');
assert(history[0].content === 'pinned old item', 'correct item survived');

// 13. Max count enforcement
console.log('\n12. Max count enforcement:');
reset();
// Add 3 items
for (let i = 0; i < 3; i++) {
  store.addItem({
    type: 'text',
    content: 'item ' + i,
    timestamp: Date.now() - i * 1000
  });
}
const result3 = store.cleanup(365, 2); // max 2 items
assert(result3.removed === 1, '1 item removed for exceeding max');
assert(result3.total === 2, '2 items remain');

// 14. Pin an item, then max-count cleanup doesn't touch it
console.log('\n13. Pinned items excluded from max-count cleanup:');
reset();
// Add 4 items, pin the oldest
const items = [];
for (let i = 0; i < 4; i++) {
  const item = store.addItem({
    type: 'text',
    content: 'item ' + i,
    timestamp: Date.now() - i * 100000
  });
  items.push(item);
}
// Pin the oldest item (items[3] has smallest timestamp)
store.pinItem(items[3].id);

const result4 = store.cleanup(365, 2); // max 2 unpinned
assert(result4.removed === 1, 'only 1 removed (oldest unpinned)');
history = store.getHistory();
const stillPinned = history.find(item => item.id === items[3].id);
assert(stillPinned !== undefined, 'pinned oldest item survived despite max count');
assert(stillPinned.pinned === true, 'it is still pinned');

// --- Summary ---
console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
