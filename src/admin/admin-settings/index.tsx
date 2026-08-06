import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById( 'mitii-settings-root' );
if ( container ) {
    createRoot( container ).render( <App /> );
}