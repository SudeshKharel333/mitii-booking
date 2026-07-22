import { createRoot } from 'react-dom/client';
import ServicesPage from './ServicesPage';

const container = document.getElementById( 'mitii-services-root' );
if ( container ) {
    createRoot( container ).render( <ServicesPage /> );
}