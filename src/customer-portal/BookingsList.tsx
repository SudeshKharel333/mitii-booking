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
            <div style={ { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' } }>
                <div style={ statCardStyle }>
                    <div style={ statLabelStyle }>Total Spent</div>
                    <div style={ statValueStyle }>${ totalSpent.toFixed( 2 ) }</div>
                </div>
                <div style={ statCardStyle }>
                    <div style={ statLabelStyle }>Next Appointment</div>
                    <div style={ statValueStyle }>
                        { nextBooking
                            ? `${ nextBooking.booking_date } at ${ nextBooking.booking_time }`
                            : 'None scheduled' }
                    </div>
                    { nextBooking?.service_name && (
                        <div style={ { fontSize: '13px', color: '#6B6862', marginTop: '2px' } }>
                            { nextBooking.service_name }
                        </div>
                    ) }
                </div>
            </div>

            <h3>Your Bookings</h3>

            { bookings.length === 0 && <p>You have no bookings yet.</p> }

            { bookings.map( ( b ) => (
                <div key={ b.id } style={ { border: '1px solid #E2DFD5', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' } }>
                    <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } }>
                        <div>
                            <div style={ { fontWeight: 600 } }>{ b.service_name || 'Service unavailable' }</div>
                            <div style={ { fontSize: '13px', color: '#6B6862', marginTop: '2px' } }>
                                { b.booking_date } at { b.booking_time }
                                { b.staff_name && ` · with ${ b.staff_name }` }
                            </div>
                            { b.service_price && (
                                <div style={ { fontSize: '13px', marginTop: '4px' } }>${ b.service_price }</div>
                            ) }
                        </div>
                        <span style={ statusBadgeStyle( b.status ) }>{ b.status }</span>
                    </div>

                    { b.status !== 'cancelled' && (
                        <button style={ { marginTop: '10px' } } onClick={ () => handleCancel( b.id ) }>
                            Cancel this booking
                        </button>
                    ) }
                </div>
            ) ) }
        </div>
    );
}

const statCardStyle: React.CSSProperties = {
    background: '#FAF9F6',
    border: '1px solid #E2DFD5',
    borderRadius: '10px',
    padding: '14px 18px',
    flex: '1',
    minWidth: '160px',
};

const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#6B6862',
    marginBottom: '4px',
};

const statValueStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1F4D44',
};

function statusBadgeStyle( status: string ): React.CSSProperties {
    const colors: Record<string, { bg: string; fg: string }> = {
        pending: { bg: '#FBF0DA', fg: '#96721F' },
        confirmed: { bg: '#E8F1EF', fg: '#1F4D44' },
        cancelled: { bg: '#F7E7E7', fg: '#B84C4C' },
    };
    const c = colors[ status ] || colors.pending;
    return {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'capitalize',
        background: c.bg,
        color: c.fg,
    };
}