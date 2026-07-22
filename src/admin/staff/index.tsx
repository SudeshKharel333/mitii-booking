import { createRoot } from 'react-dom/client';
import StaffPage from './StaffPage';

const container = document.getElementById( 'mitii-staff-root' );
if ( container ) {
    createRoot( container ).render( <StaffPage /> );
}