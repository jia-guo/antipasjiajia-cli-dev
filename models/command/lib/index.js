'use strict';

const semver = require('semver');
const colors = require('colors/safe');
const log = require('@antipasjiajia-cli-dev/log');

const LOWEST_NODE_VERSION = '12.0.0';

class Command {
  constructor(...args) {
    if (!args || !Array.isArray(args) || !args.length) {
      throw new Error('参数必须为非空数组');
    }
    this._argv = args;

    new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }

  // 参数初步解析
  initArgs() {
    this._cmd = this._argv.slice(-1)[0];
    this._argv = this._argv.slice(0, -1);
  }

  checkNodeVersion() {
    // get the current version
    const curVersion = process.version;
    // check with the required version
    const reqVersion = LOWEST_NODE_VERSION;
    if (!semver.gte(curVersion, reqVersion)) {
      throw new Error(colors.red(`antipasjiajia-cli requires a node version >= ${reqVersion}`));
    }
  }

  init() {
    throw new Error('init必须实现');
  }

  exec() {
    throw new Error('exec必须实现');
  }
}

module.exports = Command;
