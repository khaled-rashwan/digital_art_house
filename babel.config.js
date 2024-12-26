module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-runtime',
      ['@babel/plugin-proposal-class-properties', { loose: true }], // Pf91d
      ['@babel/plugin-proposal-private-methods', { loose: true }], // P33b0
      ['@babel/plugin-proposal-private-property-in-object', { loose: true }], // P2fb7
      '@babel/plugin-proposal-object-rest-spread'
    ]
  };
};
