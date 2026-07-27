import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById( 'mitii-widget-by-staff-root' );
if ( container ) {
    createRoot( container ).render( <App /> );
}