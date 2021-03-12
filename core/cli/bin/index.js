#!/usr/bin/env node

const importLocal = require('import-local');

if (importLocal(__filename)) {
  require('npmlog').info('cli', 'using local verison of antipasjiajia-cli-dev');
} else {
  require('../lib')(process.argv.slice(2));
}
