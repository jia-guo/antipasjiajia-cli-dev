'use strict';

const Command = require('@antipasjiajia-cli-dev/command');
const log = require('@antipasjiajia-cli-dev/log');

class InitCommand extends Command {
  // 每一个command的具体参数不同
  init() {
    this.projectName = this._argv[0] || '';
    this.force = this._argv[1].force || false;
    log.verbose('projectName', this.projectName);
    log.verbose('force', this.force);
  }

  // 具体业务逻辑
  exec() {
    console.log('init业务');
  }
}

function init(...args) {
  new InitCommand(...args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
