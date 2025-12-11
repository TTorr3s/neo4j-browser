const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'e2e_tests/integration/**/*.{js,jsx,ts,tsx}',
    supportFile: 'e2e_tests/support/index.ts',
    fixturesFolder: 'e2e_tests/fixtures',
    screenshotsFolder: 'e2e_tests/screenshots',
    videosFolder: 'e2e_tests/videos',
    video: true,
    videoCompression: false,
    videoUploadOnPasses: false,
    trashAssetsBeforeRuns: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    waitForAnimations: true,
    animationDistanceThreshold: 1,
    defaultCommandTimeout: 10000,
    execTimeout: 60000,
    pageLoadTimeout: 60000,
    requestTimeout: 5000,
    responseTimeout: 30000,
    chromeWebSecurity: false,
    numTestsKeptInMemory: 2,
    retries: {
      runMode: 1,
      openMode: 0
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      return require('./e2e_tests/plugins/index.ts')(on, config)
    }
  }
})
