const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma/nisit-training-participants.json');
const content = fs.readFileSync(filePath, 'utf8');

// Remove brackets and split by comma or newline
const rawNumbers = content
    .replace(/[\[\]]/g, '')
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(s => s.length == 10);

// Format as JSON array of strings
const jsonContent = JSON.stringify(rawNumbers, null, 2);

fs.writeFileSync(filePath, jsonContent);
console.log(`Formatted ${rawNumbers.length} entries.`);
