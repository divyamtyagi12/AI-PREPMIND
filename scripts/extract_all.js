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

const files = walk('strivers-repo').sort();

const extracted = files.map((filePath, index) => {
  const rel = path.relative('strivers-repo', filePath);
  const parts = rel.split(path.sep);
  const topFolder = parts[0]; // e.g. "01.Arrays"
  const subFolder = parts.length > 2 ? parts[1] : '';
  const rawFileName = path.basename(filePath, '.cpp');

  // Clean topFolder name: "01.Arrays" -> "Arrays"
  const topicName = topFolder.replace(/^\d+\.\s*/, '').trim();

  // Clean rawFileName: "01.Largest_element_in_array" -> "Largest Element in Array"
  let cleanTitle = rawFileName
    .replace(/^\d+\.\s*/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const content = fs.readFileSync(filePath, 'utf8');
  let questionText = '';
  const qMatch = content.match(/QUESTION:-?\s*([\s\S]*?)(?=\*\/|APPROACH|CODE)/i);
  if (qMatch) {
    questionText = qMatch[1].trim();
  }

  // Infer difficulty from subFolder or topFolder
  let difficulty = 'Medium';
  const lowerSub = (subFolder + ' ' + topFolder + ' ' + cleanTitle).toLowerCase();
  if (lowerSub.includes('easy') || lowerSub.includes('1.easy') || lowerSub.includes('traversals') || lowerSub.includes('learning') || lowerSub.includes('1. single linked list') || lowerSub.includes('concept') || lowerSub.includes('theory')) {
    difficulty = 'Easy';
  } else if (lowerSub.includes('hard') || lowerSub.includes('3.hard') || lowerSub.includes('strings (hard)')) {
    difficulty = 'Hard';
  }

  return {
    index: index + 1,
    filePath,
    relPath: rel,
    topicName,
    subFolder,
    rawFileName,
    cleanTitle,
    difficulty,
    questionTextPreview: questionText.slice(0, 200).replace(/\n+/g, ' '),
    fullQuestionText: questionText
  };
});

console.log('Extracted', extracted.length, 'questions');
console.log('Sample extracted 5:');
console.log(JSON.stringify(extracted.slice(0, 5), null, 2));

fs.writeFileSync('scripts/extracted_strivers.json', JSON.stringify(extracted, null, 2));
