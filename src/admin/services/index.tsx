import { createRoot } from 'react-dom/client';
import ServicesPage from './ServicesPage';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

const container = document.getElementById( 'mitii-services-root' );
if ( container ) {
    createRoot( container ).render( <ServicesPage /> );
}