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

export default function BookingsPage() {
    const [ bookings, setBookings ] = useState<Booking[]>( [] );
    const [ loading, setLoading ] = useState( true );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/bookings' )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setBookings( data );
                setLoading( false );
            } );
    }, [] );

    if ( loading ) return <p>Loading bookings...</p>;

    return (
        <div>
            { bookings.length === 0 && <p>No bookings yet.</p> }
            { bookings.length > 0 && (
                <table style={ { borderCollapse: 'collapse', width: '100%' } }>
                    <thead>
                        <tr>
                            <th style={ cellStyle }>Customer</th>
                            <th style={ cellStyle }>Email</th>
                            <th style={ cellStyle }>Date</th>
                            <th style={ cellStyle }>Time</th>
                            <th style={ cellStyle }>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        { bookings.map( ( b ) => (
                            <tr key={ b.id }>
                                <td style={ cellStyle }>{ b.customer_name }</td>
                                <td style={ cellStyle }>{ b.customer_email }</td>
                                <td style={ cellStyle }>{ b.booking_date }</td>
                                <td style={ cellStyle }>{ b.booking_time }</td>
                                <td style={ cellStyle }>{ b.status }</td>
                            </tr>
                        ) ) }
                    </tbody>
                </table>
            ) }
        </div>
    );
}

const cellStyle = { border: '1px solid #ccc', padding: '8px', textAlign: 'left' as const };