const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.cpp')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk('strivers-repo');

for (let i = 0; i < 15; i++) {
  const f = files[i * 20];
  const content = fs.readFileSync(f, 'utf8');
  console.log('====================================');
  console.log('PATH:', f);
  const qMatch = content.match(/QUESTION:-?\s*([\s\S]*?)(?=\*\/|APPROACH|CODE)/i);
  const questionText = qMatch ? qMatch[1].trim().slice(0, 150) : '(No question match)';
  console.log('QUESTION EXCERPT:', questionText.replace(/\n+/g, ' '));
  const cMatch = content.match(/CODE:-?\s*([\s\S]*?)(?=\/\*|\nclass|\nbool|\nint|\nvoid)/i);
  console.log('CODE HEADER:', content.split('CODE:-')[1]?.trim().slice(0, 100).replace(/\n+/g, ' '));
}
