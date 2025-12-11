const isTest = String(process.env.NODE_ENV) === 'test' // Jest sets this
const isDevelopment = String(process.env.NODE_ENV) === 'development'

const toExport = {
  plugins: [
    isDevelopment && require.resolve('react-refresh/babel'),
    '@babel/plugin-proposal-class-properties',
    'babel-plugin-dynamic-import-node'
  ].filter(Boolean),
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }],
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'entry',
        corejs: 3,
        modules: isTest ? 'commonjs' : false,
        targets: {
          browsers: ['last 1 version', 'not ie > 0']
        }
      }
    ]
  ]
}

module.exports = toExport
