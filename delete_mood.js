const fs = require('fs');
const files = [
    'D:/Vs Code/PROJECT/AIVA/backend/services/visionService.js',
    'D:/Vs Code/PROJECT/AIVA/frontend/pages/api/voice/mood.js'
];
files.forEach(f => {
    try {
        if (fs.existsSync(f)) {
            fs.unlinkSync(f);
            console.log('Deleted:', f);
        } else {
            console.log('Not found:', f);
        }
    } catch (e) {
        console.error('Error deleting', f, e.message);
    }
});
