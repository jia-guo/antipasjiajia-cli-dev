'use strict';

const path = require('path');
const Package = require('@antipasjiajia-cli-dev/package');
const log = require('@antipasjiajia-cli-dev/log');

// cmd -> package name
const SETTINGS = {
  //   init: '@antipasjiajia-cli-dev/init'
  init: '@imooc-cli/init'
};

const CACHE_DIR = 'dependencies';

// 1. targetPath -> modulePath
// 2. modulePath -> Package(a npm package)
// 3. 封装 -> 复用 Package.xxx e.g. .getRootFile 获取入口文件
async function exec(...args) {
  const homePath = process.env.CLI_HOME_PATH;
  log.verbose('homePath', homePath);
  let targetPath = process.env.CLI_TARGET_PATH;
  const packageName = SETTINGS[args.slice(-1)[0].name()];
  const packageVersion = '1.1.0';

  let pkg;

  if (!targetPath) {
    // default缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    log.verbose('targetPath', targetPath);
    const storePath = path.resolve(targetPath, 'node_modules');
    log.verbose('storePath', storePath);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storePath
    });

    if (await pkg.exists()) {
      console.log('更新package');
      // 更新package
      await pkg.update();
    } else {
      console.log('安装package');
      // 安装package
      await pkg.install();
    }
  } else {
    log.verbose('targetPath', targetPath);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    });
  }

  const rootFile = pkg.getRootFilePath();
  console.log('rootFile', rootFile);
  //   require(rootFile)(...args);
}

module.exports = exec;
