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

async function getLatestVersion(npmName) {
  const versions = await getNpmVersions(npmName);
  if (versions && versions.length > 0) {
    return versions.sort((a, b) => (semver.gt(a, b) ? -1 : 1))[0];
  } else {
    return null;
  }
}

module.exports = { getNpmInfo, getNpmVersions, getLatestVersion };
