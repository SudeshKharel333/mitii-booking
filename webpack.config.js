const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
    ...defaultConfig,
    entry: {
        admin: __dirname + '/src/admin/index.tsx',
    },
    output: {
        ...defaultConfig.output,
        path: __dirname + '/build',
    },
};