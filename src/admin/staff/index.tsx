import { createRoot } from 'react-dom/client';
import StaffPage from './StaffPage';
import '../admin-styles.css';

const container = document.getElementById( 'mitii-staff-root' );
if ( container ) {
    createRoot( container ).render( <StaffPage /> );
}