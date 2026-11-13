const fs = require('fs');

const extracted = JSON.parse(fs.readFileSync('scripts/extracted_strivers.json', 'utf8'));
const faang = JSON.parse(fs.readFileSync('scripts/faang_striver_parsed.json', 'utf8'));

function normalize(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build index of faang problems by normalized title and slug
const faangByNormTitle = new Map();
const faangBySlug = new Map();

for (const p of faang) {
  const norm = normalize(p.title);
  faangByNormTitle.set(norm, p);
  const m = p.leetcodeUrl.match(/leetcode\.com\/problems\/([^/]+)/);
  if (m) {
    const slug = m[1];
    faangBySlug.set(slug, p);
    faangBySlug.set(normalize(slug), p);
  }
}

let directTitleMatches = 0;
let slugMatches = 0;
let unmatched = [];
let matchedList = [];

for (const item of extracted) {
  const normTitle = normalize(item.cleanTitle);
  const normRaw = normalize(item.rawFileName.replace(/^\d+\.\s*/, ''));

  let match = faangByNormTitle.get(normTitle) || faangByNormTitle.get(normRaw);
  if (!match) {
    // Check slug matches
    const possibleSlug = item.cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    match = faangBySlug.get(possibleSlug);
  }

  if (match) {
    directTitleMatches++;
    matchedList.push({
      item,
      leetcodeUrl: match.leetcodeUrl,
      leetcodeTitle: match.title,
      difficulty: match.difficulty || item.difficulty
    });
  } else {
    unmatched.push(item);
  }
}

console.log('Total extracted:', extracted.length);
console.log('Direct matches from faang dataset:', directTitleMatches);
console.log('Unmatched count:', unmatched.length);

console.log('\nSample unmatched 15:');
unmatched.slice(0, 15).forEach(u => {
  console.log(`[${u.topicName}] ${u.cleanTitle} | Preview: ${u.questionTextPreview.slice(0, 80)}`);
});
