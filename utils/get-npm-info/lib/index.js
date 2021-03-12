'use strict';

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');

const npmRegistry = 'https://registry.npmjs.org';

async function getNpmInfo(npmName) {
  if (!npmName) return null;
  const npmInfoUrl = urlJoin(npmRegistry, npmName);
  const resp = await axios.get(npmInfoUrl);
  if (resp.status === 200) {
    return resp.data;
  }
  return null;
}

async function getNpmVersions(npmName) {
  const data = await getNpmInfo(npmName);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}

function getGreaterVersions(baseVersion, versions) {
  // 判断大于等于baseVersion，有很多不同写法
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => (semver.gt(a, b) ? -1 : 1));
}

async function getLatestVersion(baseVersion, npmName) {
  const versions = await getNpmVersions(npmName);
  const greaterVersions = getGreaterVersions(baseVersion, versions);
  if (greaterVersions && greaterVersions.length > 0) {
    return greaterVersions[0];
  } else {
    return null;
  }
}

module.exports = { getNpmInfo, getNpmVersions, getGreaterVersions, getLatestVersion };
