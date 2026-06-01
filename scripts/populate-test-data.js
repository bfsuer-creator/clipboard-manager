// Populate store with test data for UI verification
const store = require('../src/store.js');
const fs = require('fs');
const path = require('path');

// Clear existing data
const dataDir = path.join(__dirname, '..', 'data');
if (fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true, force: true });
}

// Reset settings to default
store.saveSettings({ retentionDays: 3 });

// Add text items
store.addItem({ type: 'text', content: '这是一条正常的复制文字测试', timestamp: Date.now() - 1000 });
store.addItem({ type: 'text', content: 'Hello World! This is an English clipboard test.', timestamp: Date.now() - 5000 });
store.addItem({ type: 'text', content: '超长文字测试：' + 'A'.repeat(500), timestamp: Date.now() - 10000 });
store.addItem({ type: 'text', content: '特殊字符测试：<script>alert("xss")</script> & "quotes" \'single\'', timestamp: Date.now() - 15000 });
store.addItem({ type: 'text', content: '空白和换行测试：\n第一行\n第二行\n\n第三行', timestamp: Date.now() - 20000 });

// Add a pinned item
store.addItem({ type: 'text', content: '📌 这是置顶内容，应该排在列表最前面', timestamp: Date.now() - 50000, pinned: true });

// Add a pinned image
const fakePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
const imgPath = store.saveImage(fakePng);
store.addItem({ type: 'image', imagePath: imgPath, timestamp: Date.now() - 30000, pinned: true });

// Add a regular image
const imgPath2 = store.saveImage(fakePng);
store.addItem({ type: 'image', imagePath: imgPath2, timestamp: Date.now() - 2000 });

console.log('Test data populated:', store.getHistory().length, 'items');
console.log('Settings:', store.loadSettings());
console.log('History preview:');
store.getHistory().forEach((item, i) => {
  console.log(`  ${i + 1}. [${item.type}] ${item.pinned ? '📌' : ''} ${(item.content || '[image]').substring(0, 50)}`);
});
