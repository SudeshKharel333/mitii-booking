const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
    ...defaultConfig,
    entry: {
        admin: path.resolve( process.cwd(), 'src/admin', 'index.tsx' ),
        'public-widget': path.resolve( __dirname, 'src/public-widget', 'index.tsx' ),

    },
    output: {
        ...defaultConfig.output,
        path: path.resolve( process.cwd(), 'build' ),
    },
};