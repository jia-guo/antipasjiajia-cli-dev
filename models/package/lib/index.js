'use strict';

const path = require('path');
const fse = require('fs-extra');
const pkgdir = require('pkg-dir').sync;
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync;
const { isObject } = require('@antipasjiajia-cli-dev/utils');
const { getLatestVersion } = require('@antipasjiajia-cli-dev/get-npm-info');
const formatPath = require('@antipasjiajia-cli-dev/format-path');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package options不能为空');
    }
    if (!isObject(options)) {
      throw new Error('Package options必须是对象');
    }

    this.packageName = options.packageName;
    this.packageVersion = options.packageVersion;

    // 本地package路径
    this.targetPath = options.targetPath;
    // 缓存package的路径
    this.storePath = options.storePath;
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }

  async prepare() {
    // 创建缓存dir
    if (this.storePath && !pathExists(this.storePath)) {
      // 创建出路径上所有没有的dir
      fse.mkdirpSync(this.storePath);
    }
    // 换算版本号
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    // @imooc-cli/init 1.1.2
    // _@imooc-cli_init@1.1.2@@imooc-cli/init
    return path.resolve(
      this.storePath,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  getCacheFilePathSpecVersion(version) {
    return path.resolve(
      this.storePath,
      `_${this.cacheFilePathPrefix}@${version}@${this.packageName}`
    );
  }

  // 判断当前package是否存在
  async exists() {
    if (this.storePath) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }

  async npminstallVersion(version) {
    return await npminstall({
      root: this.targetPath,
      storeDir: this.storePath,
      pkgs: [{ name: this.packageName, version }]
    });
  }

  // 安装pacakge
  async install() {
    await this.prepare();
    await this.npminstallVersion(this.packageVersion);
  }

  // 更新package
  async update() {
    await this.prepare();
    // 1. 获取最新版本号
    const latestVersion = await getLatestVersion(this.packageName);
    // 2. 查询版本号对应的路径是否存在
    const latestFilePath = this.getCacheFilePathSpecVersion(latestVersion);
    // 3. 如果不存在，则安装最新版本
    if (!pathExists(latestFilePath)) {
      await this.npminstallVersion(latestVersion);
    }
    this.packageVersion = latestVersion;
  }

  // 获取入口文件的路径
  getRootFilePath() {
    // 1. 获取package.json所在目录 - pkg-dir
    const dir = pkgdir(this.storePath ? this.cacheFilePath : this.targetPath);
    if (!dir) return null;
    // 2. 获取package.json
    const pkgJson = require(path.resolve(dir, 'package.json'));
    if (!pkgJson || (!pkgJson.main && !pkgJson.lib)) return null;
    // 3. 找到main/lib的path, 注意路径兼容os
    return formatPath(path.resolve(dir, pkgJson.main || pkgJson.lib));
  }
}

module.exports = Package;
