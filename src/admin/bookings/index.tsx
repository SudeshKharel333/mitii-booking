import { createRoot } from 'react-dom/client';
import BookingsPage from './BookingsPage';
// @ts-ignore: CSS side-effect import handled by build tooling
import '../admin-styles.css';

const container = document.getElementById( 'mitii-bookings-root' );
if ( container ) {
    createRoot( container ).render( <BookingsPage /> );
}