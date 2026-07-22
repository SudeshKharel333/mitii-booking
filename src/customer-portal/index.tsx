import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById( 'mitii-customer-portal-root' );
if ( container ) {
    createRoot( container ).render( <App /> );
}