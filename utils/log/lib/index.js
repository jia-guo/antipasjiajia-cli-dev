'use strict';

const log = require('npmlog');

// * 定制npmlog
// 大于log.level的才会被显示 - debug/verbose的实现原理
log.level = process.env.LOG_LEVEL || 'info';
// 修改前缀
log.heading = 'a++cli';
// 添加自定义命令
log.addLevel('success', 2000, { fg: 'green', bold: true });

module.exports = log;
