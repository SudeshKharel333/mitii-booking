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

const PER_PAGE = 20;

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
    const [ error, setError ] = useState( '' );

    const [ page, setPage ] = useState( 1 );
    const [ totalPages, setTotalPages ] = useState( 1 );
    const [ totalCount, setTotalCount ] = useState( 0 );

    const loadBookings = ( pageToLoad: number ) => {
        setLoading( true );
        fetch( `/wp-json/mitii/v1/bookings?page=${ pageToLoad }&per_page=${ PER_PAGE }`, {
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => {
                setTotalCount( parseInt( res.headers.get( 'X-WP-Total' ) || '0', 10 ) );
                setTotalPages( parseInt( res.headers.get( 'X-WP-TotalPages' ) || '1', 10 ) );
                return res.json();
            } )
            .then( ( data ) => {
                setBookings( Array.isArray( data ) ? data : [] );
                setLoading( false );
            } );
    };

    useEffect( () => {
        loadBookings( page );
    }, [ page ] );

    const handleStatusChange = ( id: number, newStatus: string ) => {
        // Update the UI immediately, so the dropdown feels instant —
        // if the request fails, we just reload to get the real state back.
        setBookings( ( current ) =>
            current.map( ( b ) => ( b.id === id ? { ...b, status: newStatus } : b ) )
        );

        fetch( `/wp-json/mitii/v1/bookings/${ id }/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce,
            },
            body: JSON.stringify( { status: newStatus } ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                if ( data.code ) {
                    setError( data.message || 'Could not update status.' );
                    loadBookings( page ); // revert to the real server state
                }
            } )
            .catch( () => {
                setError( 'Network error. Please try again.' );
                loadBookings( page );
            } );
    };

    if ( loading && bookings.length === 0 ) {
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
    const revenueThisPage = activeBookings.reduce(
        ( sum, b ) => sum + ( b.service_price ? parseFloat( b.service_price ) : 0 ),
        0
    );

    return (
        <div className="mitii-admin">
            <NavPills active="bookings" />
            <h1>Bookings</h1>
            <p className="mitii-subtitle">All appointments booked by customers.</p>
            { error && <p className="mitii-error">{ error }</p> }

            <div className="mitii-stat-grid">
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">{ totalCount }</div>
                    <div className="mitii-stat-label">Total Bookings</div>
                </div>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">{ todaysBookings.length }</div>
                    <div className="mitii-stat-label">Today (this page)</div>
                </div>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">${ revenueThisPage.toFixed( 2 ) }</div>
                    <div className="mitii-stat-label">Revenue (this page)</div>
                </div>
            </div>

            { bookings.length === 0 && (
                <div className="mitii-empty-state">No bookings yet.</div>
            ) }

            { bookings.length > 0 && (
                <>
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
                                            <select
                                                className={ `mitii-status-select mitii-badge mitii-badge-${ b.status }` }
                                                value={ b.status }
                                                onChange={ ( e ) => handleStatusChange( b.id, e.target.value ) }
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>

                    { totalPages > 1 && (
                        <div className="mitii-btn-row" style={ { marginTop: '14px', alignItems: 'center' } }>
                            <button
                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                onClick={ () => setPage( ( p ) => p - 1 ) }
                                disabled={ page <= 1 }
                            >
                                ← Previous
                            </button>
                            <span className="mitii-hint" style={ { margin: '0 8px' } }>
                                Page { page } of { totalPages }
                            </span>
                            <button
                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                onClick={ () => setPage( ( p ) => p + 1 ) }
                                disabled={ page >= totalPages }
                            >
                                Next →
                            </button>
                        </div>
                    ) }
                </>
            ) }
        </div>
    );
}