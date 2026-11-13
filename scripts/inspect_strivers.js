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
console.log('Total cpp files:', files.length);

let withUrls = 0;
let leetcodeUrls = 0;
let gfgUrls = 0;
let cnUrls = 0;
let urlSamples = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const urls = content.match(/https?:\/\/[^\s*)"']+/g) || [];
  if (urls.length > 0) {
    withUrls++;
    for (const u of urls) {
      if (u.includes('leetcode.com')) leetcodeUrls++;
      if (u.includes('geeksforgeeks.org')) gfgUrls++;
      if (u.includes('codingninjas.com') || u.includes('naukri.com')) cnUrls++;
      if (urlSamples.length < 10) urlSamples.push({ file: f, url: u });
    }
  }
}

console.log('Files with URLs:', withUrls);
console.log('LeetCode URLs:', leetcodeUrls);
console.log('GFG URLs:', gfgUrls);
console.log('CodingNinjas URLs:', cnUrls);
console.log('URL Samples:', urlSamples);
