import { useEffect, useState } from 'react';

type Booking = {
    id: number;
    service_id: number;
    staff_id: number;
    service_name: string | null;
    service_price: string | null;
    staff_name: string | null;
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
        fetch( '/wp-json/mitii/v1/my-bookings', { credentials: 'same-origin' } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setBookings( Array.isArray( data ) ? data : [] );
                setLoading( false );
            } );
    };

    useEffect( () => {
        loadBookings();
    }, [] );

    const handleCancel = ( id: number ) => {
        if ( ! window.confirm( 'Cancel this booking?' ) ) return;

        fetch( `/wp-json/mitii/v1/my-bookings/${ id }/cancel`, {
            method: 'POST',
            credentials: 'same-origin',
        } )
            .then( ( res ) => res.json() )
            .then( () => {
                loadBookings();
                onChanged();
            } );
    };

    if ( loading ) return <p>Loading your bookings...</p>;

    const activeBookings = bookings.filter( ( b ) => b.status !== 'cancelled' );

    const totalSpent = activeBookings.reduce(
        ( sum, b ) => sum + ( b.service_price ? parseFloat( b.service_price ) : 0 ),
        0
    );

    const now = new Date();
    const upcoming = activeBookings
        .filter( ( b ) => new Date( `${ b.booking_date }T${ b.booking_time }` ) >= now )
        .sort( ( a, b ) =>
            new Date( `${ a.booking_date }T${ a.booking_time }` ).getTime() -
            new Date( `${ b.booking_date }T${ b.booking_time }` ).getTime()
        );

    const nextBooking = upcoming[ 0 ] || null;

    return (
        <div>
            <div className="mitii-stat-grid">
                <div className="mitii-stat-card">
                    <div className="mitii-stat-icon is-gold">$</div>
                    <div className="mitii-stat-value">${ totalSpent.toFixed( 2 ) }</div>
                    <div className="mitii-stat-label">Total Spent</div>
                </div>

                <div className="mitii-stat-card">
                    <div className="mitii-stat-icon">◷</div>
                    <div className="mitii-stat-value">
                        { nextBooking ? nextBooking.booking_date : '—' }
                    </div>
                    <div className="mitii-stat-label">Next Appointment</div>
                    { nextBooking && (
                        <div className="mitii-stat-sub">
                            { nextBooking.booking_time }{ nextBooking.service_name ? ` · ${ nextBooking.service_name }` : '' }
                        </div>
                    ) }
                </div>
            </div>

            <p className="mitii-portal-section-title">
                { bookings.length } Total Booking{ bookings.length !== 1 ? 's' : '' }
            </p>

            { bookings.length === 0 && (
                <div className="mitii-portal-empty">You have no bookings yet.</div>
            ) }

            { bookings.map( ( b ) => (
                <div key={ b.id } className="mitii-booking-card">
                    <div className="mitii-booking-top">
                        <div>
                            <div className="mitii-booking-service">{ b.service_name || 'Service unavailable' }</div>
                            <div className="mitii-booking-meta">
                                { b.booking_date } at { b.booking_time }
                                { b.staff_name && ` · with ${ b.staff_name }` }
                            </div>
                            { b.service_price && (
                                <div className="mitii-booking-price">${ b.service_price }</div>
                            ) }
                        </div>
                        <span className={ `mitii-chip mitii-chip-${ b.status }` }>{ b.status }</span>
                    </div>

                    { b.status !== 'cancelled' && (
                        <div>
                            <button className="mitii-portal-btn-text" onClick={ () => handleCancel( b.id ) }>
                                Cancel this booking
                            </button>
                        </div>
                    ) }
                </div>
            ) ) }
        </div>
    );
}