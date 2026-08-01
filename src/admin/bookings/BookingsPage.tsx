import { useEffect, useState } from 'react';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

type Booking = {
    id: number;
    service_id: number;
    staff_id: number;
    service_name: string | null;
    service_price: string | null;
    staff_name: string | null;
    customer_name: string;
    customer_email: string;
    booking_date: string;
    booking_time: string;
    status: string;
};

function NavPills( { active }: { active: 'bookings' | 'services' | 'staff' } ) {
    return (
        <div className="mitii-nav-pills">
            <a href="admin.php?page=mitii-bookings" className={ `mitii-nav-pill${ active === 'bookings' ? ' is-active' : '' }` }>
                Bookings
            </a>
            <a href="admin.php?page=mitii-services" className={ `mitii-nav-pill${ active === 'services' ? ' is-active' : '' }` }>
                Services
            </a>
            <a href="admin.php?page=mitii-staff" className={ `mitii-nav-pill${ active === 'staff' ? ' is-active' : '' }` }>
                Staff
            </a>
        </div>
    );
}

export default function BookingsPage() {
    const [ bookings, setBookings ] = useState<Booking[]>( [] );
    const [ loading, setLoading ] = useState( true );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/bookings', {
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setBookings( Array.isArray( data ) ? data : [] );
                setLoading( false );
            } );
    }, [] );

    if ( loading ) {
        return (
            <div className="mitii-admin">
                <NavPills active="bookings" />
                <h1>Bookings</h1>
                <p className="mitii-subtitle">Loading...</p>
            </div>
        );
    }

    const activeBookings = bookings.filter( ( b ) => b.status !== 'cancelled' );
    const today = new Date().toISOString().slice( 0, 10 );
    const todaysBookings = activeBookings.filter( ( b ) => b.booking_date === today );
    const totalRevenue = activeBookings.reduce(
        ( sum, b ) => sum + ( b.service_price ? parseFloat( b.service_price ) : 0 ),
        0
    );

    return (
        <div className="mitii-admin">
            <NavPills active="bookings" />
            <h1>Bookings</h1>
            <p className="mitii-subtitle">All appointments booked by customers.</p>

            <div className="mitii-stat-grid">
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">{ bookings.length }</div>
                    <div className="mitii-stat-label">Total Bookings</div>
                </div>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">{ todaysBookings.length }</div>
                    <div className="mitii-stat-label">Today</div>
                </div>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">${ totalRevenue.toFixed( 2 ) }</div>
                    <div className="mitii-stat-label">Total Revenue</div>
                </div>
            </div>

            { bookings.length === 0 && (
                <div className="mitii-empty-state">No bookings yet.</div>
            ) }

            { bookings.length > 0 && (
                <div className="mitii-table-wrap">
                    <table className="mitii-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Service</th>
                                <th>Staff</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Price</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            { bookings.map( ( b ) => (
                                <tr key={ b.id }>
                                    <td>
                                        { b.customer_name }
                                        <div className="mitii-hint">{ b.customer_email }</div>
                                    </td>
                                    <td>{ b.service_name || '—' }</td>
                                    <td>{ b.staff_name || '—' }</td>
                                    <td>{ b.booking_date }</td>
                                    <td>{ b.booking_time }</td>
                                    <td>{ b.service_price ? `$${ b.service_price }` : '—' }</td>
                                    <td>
                                        <span className={ `mitii-badge mitii-badge-${ b.status }` }>{ b.status }</span>
                                    </td>
                                </tr>
                            ) ) }
                        </tbody>
                    </table>
                </div>
            ) }
        </div>
    );
}