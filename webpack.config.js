const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
    ...defaultConfig,
   entry: {
      'admin-dashboard': path.resolve( __dirname, 'src/admin/dashboard', 'index.tsx' ),
    'admin-bookings': path.resolve( __dirname, 'src/admin/bookings', 'index.tsx' ),
    'admin-services': path.resolve( __dirname, 'src/admin/services', 'index.tsx' ),
    'admin-staff': path.resolve( __dirname, 'src/admin/staff', 'index.tsx' ),
    'public-widget': path.resolve( __dirname, 'src/public-widget', 'index.tsx' ),
    'public-widget-by-staff': path.resolve( __dirname, 'src/public-widget-by-staff', 'index.tsx' ),
    'customer-portal': path.resolve( __dirname, 'src/customer-portal', 'index.tsx' ),
},
    output: {
        ...defaultConfig.output,
        path: path.resolve( process.cwd(), 'build' ),
    },
};