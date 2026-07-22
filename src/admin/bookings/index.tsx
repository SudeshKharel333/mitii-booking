import { createRoot } from 'react-dom/client';
import BookingsPage from './BookingsPage';

const container = document.getElementById( 'mitii-bookings-root' );
if ( container ) {
    createRoot( container ).render( <BookingsPage /> );
}