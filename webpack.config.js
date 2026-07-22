const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
    ...defaultConfig,
   entry: {
  
    'admin-bookings': path.resolve( __dirname, 'src/admin/bookings', 'index.tsx' ),
    'admin-services': path.resolve( __dirname, 'src/admin/services', 'index.tsx' ),
    'admin-staff': path.resolve( __dirname, 'src/admin/staff', 'index.tsx' ),
    'public-widget': path.resolve( __dirname, 'src/public-widget', 'index.tsx' ),
    'customer-portal': path.resolve( __dirname, 'src/customer-portal', 'index.tsx' ),
},
    output: {
        ...defaultConfig.output,
        path: path.resolve( process.cwd(), 'build' ),
    },
};