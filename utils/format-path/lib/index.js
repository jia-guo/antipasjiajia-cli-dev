'use strict';

const path = require('path');

function formatPath(p) {
  if (!p || typeof p !== 'string') return p;
  const sep = path.sep;
  return sep === '/' ? p : p.replace(/\\/g, '/');
}

module.exports = formatPath;
