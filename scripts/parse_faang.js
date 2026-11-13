const fs = require('fs');

const content = fs.readFileSync('scripts/striver-a2z.md', 'utf8');
const lines = content.split('\n');

const problems = [];
let currentSection = '';

for (const line of lines) {
  if (line.startsWith('## ')) {
    currentSection = line.replace('## ', '').trim();
    continue;
  }
  if (!line.includes('|')) continue;
  if (line.includes('---') || line.includes('Problem | Difficulty')) continue;

  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const title = parts[0];
    const difficulty = parts[1];
    const leetcodeUrl = parts[2];
    const pattern = parts[3] || '';
    const companies = parts[4] || '';

    if (leetcodeUrl && leetcodeUrl.includes('leetcode.com')) {
      problems.push({
        section: currentSection,
        title,
        difficulty,
        leetcodeUrl,
        pattern,
        companies
      });
    }
  }
}

console.log('Total LeetCode problems parsed from striver-a2z.md:', problems.length);
console.log('Sample 5:');
console.log(JSON.stringify(problems.slice(0, 5), null, 2));

fs.writeFileSync('scripts/faang_striver_parsed.json', JSON.stringify(problems, null, 2));
