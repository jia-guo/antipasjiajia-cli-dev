'use strict';

const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const commander = require('commander');
const pkg = require('../package.json');
const constants = require('./const');
const log = require('@antipasjiajia-cli-dev/log');
const init = require('@antipasjiajia-cli-dev/init');

const args = require('minimist')(process.argv.slice(2));

const program = new commander.Command();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

async function prepare() {
  checkPkgVersion();
  checkNodeVersion();
  checkRoot();
  checkUserHome();
  // checkInputArgs();
  checkEvn();
  await checkGlobalUpdate();
}

function checkPkgVersion() {
  log.notice('cli', pkg.version);
}

function checkNodeVersion() {
  // get the current version
  const curVersion = process.version;
  // check with the required version
  const reqVersion = constants.LOWEST_NODE_VERSION;
  if (!semver.gte(curVersion, reqVersion)) {
    throw new Error(colors.red(`antipasjiajia-cli requires a node version >= ${reqVersion}`));
  }
}

function checkRoot() {
  // root - 0; other user - 501 (不同操作系统不同)
  //   console.log(111, process.getuid());
  // check并自动downgrade
  const rootCheck = require('root-check');
  rootCheck();
  //   console.log(222, process.getuid());
}

// 检查用户主目录是否存在，用于之后的缓存等等
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('no home directory for the current user'));
  }
}

// 检查入参，若有debug/verbose等，需提前配置环境变量，调整log level
// function checkInputArgs() {
//   checkArgs();
// }

// // 修改环境变量需早于require log的操作，不然需要手动修改log设定
// function checkArgs() {
//   if (args.debug) {
//     process.env.LOG_LEVEL = 'verbose';
//   } else {
//     process.env.LOG_LEVEL = 'info';
//   }
//   log.level = process.env.LOG_LEVEL;
// }

// 获得缓存路径
function checkEvn() {
  // load .env file into process.env
  const dotenv = require('dotenv');
  const dotenvPath = path.resolve(userHome, '.env');
  if (pathExists(dotenvPath)) {
    //   dotenv去找env的路径
    dotenv.config({
      path: dotenvPath
    });
  }
  createDefaultConfig();
  log.verbose('env', process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome
  };
  if (process.env.CLI_HOME) {
    cliConfig.cliHome = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig.cliHome = path.join(userHome, constants.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

async function checkGlobalUpdate() {
  // 获取本地版本号和包名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 调用npm api（http://registry.npmjs.org/@<pkg-name>），获取最新版本号
  const { getLatestVersion } = require('@antipasjiajia-cli-dev/get-npm-info');
  const latestVersion = await getLatestVersion(currentVersion, npmName);
  // 比对，提示更新
  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    log.warn(
      colors.yellow(`Please update package ${npmName} from ${currentVersion} to ${latestVersion}`)
    );
  }
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .version(pkg.version)
    .usage('<command> [options]')
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否制定本地调试文件路径', '');

  program.command('init [projectName]').option('-f, --force', 'force init', false).action(init);

  // 监听：在执行业务命令之前执行
  // debug mode
  program.on('option:debug', () => {
    if (program.opts()?.debug) {
      process.env.LOG_LEVEL = 'verbose';
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 制定全局targetPath
  program.on('option:targetPath', () => {
    console.log(program.opts().targetPath);
    if (program.opts()?.targetPath) {
      process.env.CLI_TARGET_PATH = program.opts().targetPath;
    }
  });

  // 未知命令
  program.on('command:*', (obj) => {
    const availableCommands = program.commands.map((cmd) => cmd.name()).join(', ');
    log.warn(colors.red(`Unknown command '${obj[0]}', availalbe commands: ${availableCommands}`));
  });

  program.parse(process.argv);
  // 先进行参数解析，利用解析的结果判断有没有传入命令（光传option也命中）
  if (!program.args || program.args.length < 1) {
    // 未传参数，打印帮助文档
    program.outputHelp();
    // 打印一行空行
    console.log();
  }
}

module.exports = core;
