'use strict';

const path = require('path');
const Package = require('@antipasjiajia-cli-dev/package');
const log = require('@antipasjiajia-cli-dev/log');
const { spawn } = require('@antipasjiajia-cli-dev/utils');

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
  const packageVersion = 'latest';

  let pkg;

  if (!targetPath) {
    // 缓存路径
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
    // 本地路径
    log.verbose('targetPath', targetPath);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    });
  }

  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    try {
      // * 在当前进程中调用
      // require(rootFile)(...args);
      // * 在子进程中调用
      // 参数瘦身
      const cmd = args.slice(-1)[0];
      const filteredCmd = Object.create(null);
      Object.keys(args.slice(-1)[0]).forEach((key) => {
        if (key.startsWith('_') || key === 'parent') return;
        filteredCmd[key] = cmd[key];
      });
      args[args.length - 1] = filteredCmd;

      // 拼接代码
      const code = `require('${rootFile}')(...${JSON.stringify(args)})`;

      // 将子进程与父进程绑定，子进程输出流直接输入到主进程中（i.e. 打印合体）
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit' // 默认 'pipe'
      });

      // 监听
      child.on('error', (e) => {
        log.error(e.message);
        process.exit(1);
      });
      child.on('exit', (e) => {
        log.verbose('命令执行成功: ' + e);
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;
