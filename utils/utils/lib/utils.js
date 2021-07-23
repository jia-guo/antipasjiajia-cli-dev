"use strict";

function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function sleepAsync(ms = 1000) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

// 操作系统兼容
function spawn(command, args, options = {}) {
  const isWin32 = process.platform === "win32";

  const cmd = isWin32 ? "cmd" : command;
  const cmdArgs = isWin32 ? ["/c"].concat(command, args) : args;

  return require("child_process").spawn(cmd, cmdArgs, options);
}

function spawnAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args, options);
    p.on("error", (e) => reject(e));
    p.on("exit", (r) => resolve(r));
  });
}

module.exports = { isObject, sleep, sleepAsync, spawn, spawnAsync };
