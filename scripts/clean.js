const fs = require('fs-extra');

fs.removeSync('./build/node_modules');
fs.removeSync('./build/package-lock.json'); 