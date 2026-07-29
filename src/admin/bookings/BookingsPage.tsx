import { useEffect, useState } from 'react';
type Booking = {
    id: number;
    service_id: number;
    staff_id: number;
    customer_name: string;
    customer_email: string;
    booking_date: string;
    booking_time: string;
    status: string;
};

declare const mitiiAdminData: {
    nonce: string;
};

export default function BookingsPage() {
    const [ bookings, setBookings ] = useState<Booking[]>( [] );
    const [ loading, setLoading ] = useState( true );

    const loadBookings = () => {
        setLoading( true );
        fetch( '/wp-json/mitii/v1/bookings', {
    method: 'GET',
    headers: {
        'X-WP-Nonce': mitiiAdminData.nonce, // Crucial for cookie authentication
        'Content-Type': 'application/json'
    }
} )
        
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setBookings( data );
                setLoading( false );
            } );
    };

    useEffect( () => {
        loadBookings();
    }, [] );

    return (
        <div className="mitii-admin">
            <h1>Bookings</h1>
            <p className="mitii-subtitle">All appointments booked by customers.</p>

            { loading && <p className="mitii-subtitle">Loading...</p> }

            { ! loading && bookings.length === 0 && (
                <div className="mitii-empty-state">No bookings yet.</div>
            ) }

            { ! loading && bookings.length > 0 && (
                <div className="mitii-table-wrap">
                    <table className="mitii-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Email</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            { bookings.map( ( b ) => (
                                <tr key={ b.id }>
                                    <td>{ b.customer_name }</td>
                                    <td>{ b.customer_email }</td>
                                    <td>{ b.booking_date }</td>
                                    <td>{ b.booking_time }</td>
                                    <td>
                                        <span className={ `mitii-badge mitii-badge-${ b.status }` }>
                                            { b.status }
                                        </span>
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