const files = require('@clubajax/node-file-managment');

files.updateBuildPackage('./scripts', './build');
files.copyFile('./README.md', './build/README.md');
files.copyFile('./src/on.js', './build/on.js');

files.swapJK('README.md')
