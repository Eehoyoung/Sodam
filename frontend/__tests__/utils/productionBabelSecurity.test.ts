const babelConfig = require('../../babel.config.js');
const {transformSync} = require('@babel/core');

describe('production Babel security policy', () => {
  test('removes every console level from release bundles', () => {
    const productionPlugins = babelConfig.env.production.plugins;

    expect(productionPlugins).toContain('transform-remove-console');
    expect(JSON.stringify(productionPlugins)).not.toContain('exclude');
  });

  test('strips an error call and its credentials from production output', () => {
    const result = transformSync(
      'console.error("secret-password", {Authorization: "Bearer secret-token"});',
      {
        configFile: require.resolve('../../babel.config.js'),
        envName: 'production',
        filename: 'security-fixture.js',
      },
    );

    expect(result.code).not.toContain('console.error');
    expect(result.code).not.toContain('secret-password');
    expect(result.code).not.toContain('secret-token');
  });
});
