const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'vrm-bundle': './src/js/vrm-bundle.js',
    'content': './src/js/content.js',
    'background': './src/js/background.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.js'],
  }
}; 