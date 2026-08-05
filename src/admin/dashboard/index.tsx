import { createRoot } from 'react-dom/client';
import DashboardPage from './dashboardPage';

const container = document.getElementById( 'mitii-dashboard-root' );
if ( container ) {
    createRoot( container ).render( <DashboardPage /> );
}