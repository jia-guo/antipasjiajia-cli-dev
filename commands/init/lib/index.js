'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const inquirer = require('inquirer');
const semver = require('semver');
const ora = require('ora');
const ejs = require('ejs');
const Command = require('@antipasjiajia-cli-dev/command');
const log = require('@antipasjiajia-cli-dev/log');
const Package = require('@antipasjiajia-cli-dev/package');
const { sleep, sleepAsync, spawnAsync } = require('@antipasjiajia-cli-dev/utils');

const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENCT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const WHITE_COMMANDS = ['npm', 'yarn'];

class InitCommand extends Command {
  // 每一个command的具体参数不同
  init() {
    this.projectName = this._argv[0] || '';
    this.force = this._argv[1].force || false;
    log.verbose('projectName', this.projectName);
    log.verbose('force', this.force);
  }

  // 具体业务逻辑
  async exec() {
    try {
      // 1. 准备阶段
      // 请求模板数据
      // 准备缓存目录
      // 取得项目基本信息
      await this.prepare();
      // 检查判断项目信息
      log.verbose('project info', this.projectInfo);
      if (
        !this.projectInfo ||
        Object.keys(this.projectInfo).length === 0 ||
        !this.projectInfo.projectTemplate
      ) {
        throw new Error('项目信息不完整');
      }
      // 2. 下载模板
      await this.downloadTemplate();
      // 3. 安装模板
      await this.installTemplate();
    } catch (e) {
      log.error(e.message);
    }
  }

  async installTemplate() {
    const { type = TEMPLATE_TYPE_NORMAL } = this.projectInfo.projectTemplate;
    if (type === TEMPLATE_TYPE_NORMAL) {
      await this.installNormalTemplate();
    } else if (type === TEMPLATE_TYPE_CUSTOM) {
      await this.installCustomTemplate();
    } else {
      throw new Error('项目模板类型不存在');
    }
  }

  async installNormalTemplate() {
    // 1. 拷贝模板至当前目录
    this.copyTemplateToCurrentDir();

    // 2. ejs组装package.json
    await this.ejsRender();

    const { installCommand, startCommand } = this.projectInfo.projectTemplate;

    // 3. 依赖安装
    if (!installCommand) return;
    await this.installDependencies(installCommand);

    // 4. 启动命令执行
    if (!startCommand) return;
    await this.startTheProject(startCommand);
  }

  async installCustomTemplate() {}

  copyTemplateToCurrentDir() {
    const spinner = ora({ text: `正在安装模板至当前目录`, spinner: 'monkey' }).start();
    // 获取from to目录的绝对路径
    const templatePath = path.resolve(this.templatePkg.cacheFilePath, './template');
    const currentPath = path.resolve('.');
    // 确保路径存在（若不存在，会进行创建）
    fse.ensureDirSync(templatePath);
    fse.ensureDirSync(currentPath);
    // 拷贝
    fse.copySync(templatePath, currentPath);
    spinner.succeed(`模板安装成功`);
  }

  async ejsRender() {
    const baseDir = process.cwd();
    const tmplData = { ...this.projectInfo, version: this.projectInfo.projectVersion };
    return new Promise((resolve, reject) => {
      require('glob')(
        '**',
        {
          cwd: baseDir,
          ignore: ['node_modules/**', 'public/**'],
          nodir: true
        },
        (err, files) => {
          if (err) reject(err);
          Promise.all(
            files.map((fileName) => {
              const filePath = path.join(baseDir, fileName);
              return new Promise((resolve, reject) => {
                ejs.renderFile(filePath, tmplData, {}, (err, result) => {
                  if (err) reject(err);
                  fse.writeFileSync(filePath, result);
                  resolve();
                });
              });
            })
          )
            .then(() => {
              resolve();
            })
            .catch((err) => reject(err));
        }
      );
    });
  }

  async installDependencies(installCommand) {
    const [cmd, ...args] = installCommand.split(' ');
    if (!this.isCmdAllowed(cmd, WHITE_COMMANDS)) {
      log.info(`非法命令：${cmd}`);
      return;
    }
    log.info('正在安装依赖');
    const result = await spawnAsync(cmd, args, {
      // 子进程输出流绑定到当前
      stdio: 'inherit',
      cwd: process.cwd()
    });
    if (result === 0) {
      log.info('依赖安装成功');
    } else {
      log.error('依赖安装失败');
    }
  }

  async startTheProject(startCommand) {
    const [cmd, ...args] = startCommand.split(' ');
    if (!this.isCmdAllowed(cmd, WHITE_COMMANDS)) {
      log.info(`非法命令：${cmd}`);
      return;
    }
    log.info('正在启动项目');
    const result = await spawnAsync(cmd, args, {
      // 子进程输出流绑定到当前
      stdio: 'inherit',
      cwd: process.cwd()
    });
    if (result === 0) {
      log.info('启动项目成功');
    } else {
      log.error('启动项目失败');
    }
  }

  isCmdAllowed(cmd, whiteList) {
    return whiteList.includes(cmd);
  }

  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 egg.js搭建后端系统，提供API
    // 1.2 通过npm项目存储项目模板
    // 1.3 将项目信息存储到MongoDB中
    // 1.4 egg.js后端获取MongoDB中的数据，通过API返回
    // 2. 下载/更新至缓存目录的template/node_modules文件夹下
    const {
      projectTemplate: { npmName: packageName, version: packageVersion }
    } = this.projectInfo;
    const targetPath = path.resolve(process.env.CLI_HOME_PATH, 'template');
    const storePath = path.resolve(targetPath, 'node_modules');
    this.templatePkg = new Package({
      targetPath,
      storePath,
      packageName,
      packageVersion
    });
    if (!(await this.templatePkg.exists())) {
      await this.downloadHandler('install');
    } else {
      await this.downloadHandler('update');
    }
  }

  async downloadHandler(mode = 'install') {
    const feedback = mode === 'install' ? '下载' : '更新';
    const action = mode === 'install' ? 'install' : 'update';
    const spinner = ora({ text: `正在${feedback}模板`, spinner: 'monkey' }).start();
    // await sleepAsync(200);
    try {
      await this.templatePkg[action]();
      spinner.succeed(`模板${feedback}成功，版本号${this.templatePkg.packageVersion}`);
    } catch (e) {
      spinner.fail(`模板${feedback}失败: ${e.message}`);
      throw e;
    }
  }

  async prepare() {
    // 0. fetch模板数据 判断是否有数据
    this.projectTemplates = await getProjectTemplate();
    if (!this.projectTemplates || this.projectTemplates.length === 0) {
      throw new Error('项目模板不存在');
    }
    // 1. 判断当前目录是否为空
    // 2. 是否启动强制更新 --force
    // 返回isReady - 标记是否bail out
    const isReady = await this.prepareDir();
    if (!isReady) return null;
    // 3. 选择创建项目/组件
    // 4. 获取项目的基本信息
    // 取得项目信息
    this.projectInfo = await this.getProjectInfo();
  }

  async prepareDir() {
    // 当前目录 - 执行命令的terminal所在目录
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      // --force时跳过第一次询问
      if (!this.force) {
        // 询问是否继续创建
        const { toContinue } = await inquirer.prompt({
          type: 'confirm',
          name: 'toContinue',
          default: false,
          message: '当前文件夹不为空，是否清空所有当前文件'
        });
        if (!toContinue) {
          return false;
        }
      }
      // 清空文件前最后确认
      const { confirmDelete } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirmDelete',
        default: false,
        message: '确认清空所有当前文件'
      });
      // 清空当前目录中的所有内容
      if (confirmDelete) {
        const spinner = ora({ text: `正在清空目录`, spinner: 'monkey' }).start();
        fse.emptyDirSync(localPath);
        spinner.succeed('清空目录成功');
      }
    }

    return true;
  }

  async getProjectInfo() {
    let projectInfo = {};

    // 3. 选择创建项目/组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [
        { name: '项目', value: TYPE_PROJECT },
        { name: '组件', value: TYPE_COMPONENCT }
      ]
    });
    projectInfo.type = type;

    // 4. 获取项目的基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目名称',
          default: this.projectName,
          validate: function (v) {
            const done = this.async();
            setTimeout(() => {
              if (!/^[a-zA-Z]+[\w-]*[a-zA-Z0-9]$/.test(v)) {
                done('请输入合法的项目名称');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => v
        },
        {
          type: 'input',
          name: 'projectVersion',
          message: '请输入项目版本号',
          default: '1.0.0',
          validate: function (v) {
            const done = this.async();

            setTimeout(() => {
              if (!semver.valid(v)) {
                done('请输入合法的版本号');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => (!!semver.valid(v) ? semver.valid(v) : v)
        },
        {
          type: 'list',
          name: 'projectTemplate',
          message: '请选择项目模板',
          choices: this.projectTemplates.map((tmpl) => ({
            value: tmpl,
            name: tmpl.name
          }))
        }
      ]);
      projectInfo = {
        ...projectInfo,
        ...project,
        packageName: require('kebab-case')(project.projectName).replace(/^-/, '')
      };
    } else {
    }
    return projectInfo;
  }

  isDirEmpty(localPath) {
    // 读取当前目录下的所有文件
    const fileList = fs
      .readdirSync(localPath)
      .filter((file) => !file.startsWith('.') && !['node_modules'].includes(file));
    log.verbose('存在文件: ', fileList.join(', '));
    return fileList && fileList.length === 0;
  }
}

function init(...args) {
  new InitCommand(...args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
