const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/matching_results.json', 'utf8'));
const unmatched = data.results.filter(r => r.status === 'UNMATCHED');
console.log('Total unmatched:', unmatched.length);
console.log('Listing unmatched 36-121:');
unmatched.slice(35).forEach((u, i) => {
  console.log(`${i+36}. [${u.item.topicName} / ${u.item.subFolder}] "${u.item.cleanTitle}"`);
});
