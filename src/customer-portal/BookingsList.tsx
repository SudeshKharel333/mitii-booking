import { useEffect, useState } from 'react';

type Booking = {
    id: number;
    service_id: number;
    staff_id: number;
    booking_date: string;
    booking_time: string;
    status: string;
};

type Props = {
    onChanged: () => void;
};

export default function BookingsList( { onChanged }: Props ) {
    const [ bookings, setBookings ] = useState<Booking[]>( [] );
    const [ loading, setLoading ] = useState( true );

    const loadBookings = () => {
    setLoading( true );
    fetch( '/wp-json/mitii/v1/my-bookings', {
        headers: { 'X-WP-Nonce': ( window as any ).mitiiPortalData?.nonce },
    } )
        .then( ( res ) => res.json() )
        .then( ( data ) => {
            setBookings( data );
            setLoading( false );
        } );
};

const handleCancel = ( id: number ) => {
    if ( ! window.confirm( 'Cancel this booking?' ) ) return;

    fetch( `/wp-json/mitii/v1/my-bookings/${ id }/cancel`, {
        method: 'POST',
        headers: { 'X-WP-Nonce': ( window as any ).mitiiPortalData?.nonce },
    } )
        .then( ( res ) => res.json() )
        .then( () => {
            loadBookings();
            onChanged();
        } );
};

    if ( loading ) return <p>Loading your bookings...</p>;
    if ( bookings.length === 0 ) return <p>You have no bookings yet.</p>;

    return (
        <div>
            <h3>Your Bookings</h3>
            { bookings.map( ( b ) => (
                <div key={ b.id } style={ { border: '1px solid #ccc', padding: '10px', marginBottom: '8px' } }>
                    <p>Date: { b.booking_date } at { b.booking_time }</p>
                    <p>Status: { b.status }</p>
                    { b.status !== 'cancelled' && (
                        <button onClick={ () => handleCancel( b.id ) }>Cancel this booking</button>
                    ) }
                </div>
            ) ) }
        </div>
    );
}