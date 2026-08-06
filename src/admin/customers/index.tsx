import { createRoot } from 'react-dom/client';
import CustomersPage from './CustomersPage';

const container = document.getElementById( 'mitii-customers-root' );
if ( container ) {
    createRoot( container ).render( <CustomersPage /> );
}