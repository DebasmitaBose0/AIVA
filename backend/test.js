const cmd = require('./services/commandService');
cmd.processCommand('hi.').then(res => console.log('res:', res)).catch(console.error);
