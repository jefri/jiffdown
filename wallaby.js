module.exports = function () {
  return {
    files: ["src/**/*.mjs"],

    tests: ["test/**/*.mjs"],

    env: {
      type: "node",
      runner: "node",
    },
  };
};
