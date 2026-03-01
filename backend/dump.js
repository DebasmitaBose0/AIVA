const fs = require('fs');
const r = JSON.parse(fs.readFileSync('./data/responses.json', 'utf8'));
console.log("Greetings:", Object.keys(r.greetings || {}).slice(0, 30));
console.log("Smalltalk:", Object.keys(r.smalltalk || {}).slice(0, 30));
