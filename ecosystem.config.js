module.exports = {
  apps: [
    {
      name: "mcc-inventory",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};