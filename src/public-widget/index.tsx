import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById( 'mitii-widget-root' );
if ( container ) {
    createRoot( container ).render( <App /> );
}