import { useState } from 'react';
import BookingsPage from './pages/BookingsPage';
import ServicesPage from './pages/ServicesPage';
import StaffPage from './pages/StaffPage';

type Tab = 'bookings' | 'services' | 'staff';

export default function App() {
    const [ tab, setTab ] = useState<Tab>( 'bookings' );

    return (
        <div>
            <h1>Mitii Booking Admin</h1>

            <div style={ { marginBottom: '16px', borderBottom: '1px solid #ccc' } }>
                <TabButton label="Bookings" active={ tab === 'bookings' } onClick={ () => setTab( 'bookings' ) } />
                <TabButton label="Services" active={ tab === 'services' } onClick={ () => setTab( 'services' ) } />
                <TabButton label="Staff" active={ tab === 'staff' } onClick={ () => setTab( 'staff' ) } />
            </div>

            { tab === 'bookings' && <BookingsPage /> }
            { tab === 'services' && <ServicesPage /> }
            { tab === 'staff' && <StaffPage /> }
        </div>
    );
}

function TabButton( { label, active, onClick }: { label: string; active: boolean; onClick: () => void } ) {
    return (
        <button
            onClick={ onClick }
            style={ {
                padding: '8px 16px',
                marginRight: '4px',
                border: 'none',
                borderBottom: active ? '2px solid #2F6F63' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: active ? 'bold' : 'normal',
            } }
        >
            { label }
        </button>
    );
}