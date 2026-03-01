const fs = require('fs');
const data = JSON.parse(fs.readFileSync('D:/Vs Code/PROJECT/AIVA/backend/data/responses.json'));
console.log('Greetings keys:', Object.keys(data.greetings).length);
console.log('Smalltalk keys:', Object.keys(data.smalltalk).length);
