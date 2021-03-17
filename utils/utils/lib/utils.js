'use strict';

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepAsync(ms = 1000) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { isObject, sleep, sleepAsync };
