import { useEffect, useState } from 'react';

type Booking = {
    id: number;
    service_name: string | null;
    service_price: string | null;
    staff_name: string | null;
    booking_date: string;
    booking_time: string;
    status: string;
};

type Props = {
    userName: string;
    onGoToBookings: () => void;
    serviceBookingUrl: string;
    staffBookingUrl: string;
};

export default function CustomerDashboard( { userName, onGoToBookings, serviceBookingUrl, staffBookingUrl }: Props ) {
    const [ bookings, setBookings ] = useState<Booking[]>( [] );
    const [ loading, setLoading ] = useState( true );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/my-bookings?per_page=100', { credentials: 'same-origin' } )
            .then( r => r.json() )
            .then( data => {
                setBookings( Array.isArray( data ) ? data : [] );
                setLoading( false );
            } )
            .catch( () => setLoading( false ) );
    }, [] );

    if ( loading ) return <p style={ { color: 'var(--mitii-ink-soft)', fontSize: 14 } }>Loading your summary…</p>;

    const now = new Date();

    const active    = bookings.filter( b => b.status !== 'cancelled' );
    const upcoming  = active
        .filter( b => new Date( `${ b.booking_date }T${ b.booking_time }` ) >= now )
        .sort( ( a, b ) =>
            new Date( `${ a.booking_date }T${ a.booking_time }` ).getTime() -
            new Date( `${ b.booking_date }T${ b.booking_time }` ).getTime()
        );
    const past      = active.filter( b => new Date( `${ b.booking_date }T${ b.booking_time }` ) < now );
    const cancelled = bookings.filter( b => b.status === 'cancelled' );

    const totalSpent = active.reduce(
        ( sum, b ) => sum + ( b.service_price ? parseFloat( b.service_price ) : 0 ), 0
    );

    const next = upcoming[ 0 ] || null;

    // Most-used service
    const serviceCounts: Record<string, number> = {};
    active.forEach( b => {
        const name = b.service_name || 'Unknown';
        serviceCounts[ name ] = ( serviceCounts[ name ] || 0 ) + 1;
    } );
    const favouriteService = Object.entries( serviceCounts ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ]?.[0] || null;

    // Days until next appointment
    let daysUntil: number | null = null;
    if ( next ) {
        const diff = new Date( `${ next.booking_date }T${ next.booking_time }` ).getTime() - now.getTime();
        daysUntil = Math.ceil( diff / ( 1000 * 60 * 60 * 24 ) );
    }

    const greeting = ( () => {
        const h = now.getHours();
        if ( h < 12 ) return 'Good morning';
        if ( h < 17 ) return 'Good afternoon';
        return 'Good evening';
    } )();

    const firstName = userName.split( ' ' )[ 0 ];

    const hasBookingLinks = serviceBookingUrl || staffBookingUrl;

    return (
        <div>
            {/* ── Greeting ── */}
            <div style={ { marginBottom: 22 } }>
                <p style={ { margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--mitii-teal-dark)' } }>
                    { greeting }, { firstName }! 👋
                </p>
                <p style={ { margin: '4px 0 0', fontSize: 13, color: 'var(--mitii-ink-soft)' } }>
                    Here's a summary of your appointments.
                </p>
            </div>

            {/* ── Book Now buttons ── */}
            { hasBookingLinks && (
                <div style={ {
                    display: 'grid',
                    gridTemplateColumns: serviceBookingUrl && staffBookingUrl ? 'repeat(2, 1fr)' : '1fr',
                    gap: 12,
                    marginBottom: 20,
                } }>
                    { serviceBookingUrl && (
                        <a
                            href={ serviceBookingUrl }
                            style={ {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                background: 'linear-gradient(135deg, var(--mitii-teal-dark) 0%, var(--mitii-teal) 100%)',
                                color: '#fff',
                                textDecoration: 'none',
                                borderRadius: 14,
                                padding: '14px 16px',
                                fontSize: 14,
                                fontWeight: 700,
                                boxShadow: 'var(--elevation-1)',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            } }
                            onMouseEnter={ e => {
                                ( e.currentTarget as HTMLElement ).style.transform = 'translateY(-2px)';
                                ( e.currentTarget as HTMLElement ).style.boxShadow = 'var(--elevation-2)';
                            } }
                            onMouseLeave={ e => {
                                ( e.currentTarget as HTMLElement ).style.transform = 'translateY(0)';
                                ( e.currentTarget as HTMLElement ).style.boxShadow = 'var(--elevation-1)';
                            } }
                        >
                            <span>Book by Service</span>
                        </a>
                    ) }
                    { staffBookingUrl && (
                        <a
                            href={ staffBookingUrl }
                            style={ {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                background: '#fff',
                                color: 'var(--mitii-teal-dark)',
                                textDecoration: 'none',
                                borderRadius: 14,
                                padding: '14px 16px',
                                fontSize: 14,
                                fontWeight: 700,
                                boxShadow: 'var(--elevation-1)',
                                border: '2px solid var(--mitii-teal)',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            } }
                            onMouseEnter={ e => {
                                ( e.currentTarget as HTMLElement ).style.transform = 'translateY(-2px)';
                                ( e.currentTarget as HTMLElement ).style.boxShadow = 'var(--elevation-2)';
                            } }
                            onMouseLeave={ e => {
                                ( e.currentTarget as HTMLElement ).style.transform = 'translateY(0)';
                                ( e.currentTarget as HTMLElement ).style.boxShadow = 'var(--elevation-1)';
                            } }
                        >
                            <span>Book by Staff</span>
                        </a>
                    ) }
                </div>
            ) }

            {/* ── Next appointment highlight ── */}
            { next ? (
                <div style={ {
                    background: 'linear-gradient(135deg, var(--mitii-teal-dark) 0%, var(--mitii-teal) 100%)',
                    borderRadius: 16,
                    padding: '20px 22px',
                    color: '#fff',
                    marginBottom: 20,
                    position: 'relative',
                    overflow: 'hidden',
                } }>
                    <div style={ { position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' } } />
                    <div style={ { position: 'absolute', bottom: -30, right: 30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' } } />
                    <p style={ { margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75 } }>
                        Next Appointment
                    </p>
                    <p style={ { margin: '0 0 4px', fontSize: 19, fontWeight: 800 } }>
                        { next.service_name || 'Appointment' }
                    </p>
                    <p style={ { margin: 0, fontSize: 13, opacity: 0.85 } }>
                        { next.booking_date } at { next.booking_time.slice( 0, 5 ) }
                        { next.staff_name ? ` · with ${ next.staff_name }` : '' }
                    </p>
                    { daysUntil !== null && (
                        <div style={ {
                            display: 'inline-block',
                            marginTop: 12,
                            background: 'rgba(255,255,255,0.18)',
                            borderRadius: 999,
                            padding: '4px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                        } }>
                            { daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${ daysUntil } days` }
                        </div>
                    ) }
                </div>
            ) : (
                <div style={ {
                    background: 'var(--mitii-teal-light)',
                    borderRadius: 16,
                    padding: '20px 22px',
                    marginBottom: 20,
                    textAlign: 'center',
                } }>
                    <p style={ { margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--mitii-teal-dark)' } }>
                        No upcoming appointments
                    </p>
                    <p style={ { margin: '0 0 14px', fontSize: 13, color: 'var(--mitii-ink-soft)' } }>
                        Ready to book your next visit?
                    </p>
                </div>
            ) }

            {/* ── KPI row ── */}
            <div style={ {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 20,
            } }>
                <KpiCard  value={ String( bookings.length ) } label="Total" />
                <KpiCard  value={ String( upcoming.length ) } label="Upcoming" />
                <KpiCard  value={ `$${ totalSpent.toFixed(2) }` } label="Spent" />
            </div>

            {/* ── Status breakdown bar ── */}
            { bookings.length > 0 && (
                <div style={ { background: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 20, boxShadow: 'var(--elevation-1)' } }>
                    <p className="mitii-portal-section-title" style={ { marginBottom: 12 } }>Booking Breakdown</p>
                    <StatusBar completed={ past.length } upcoming={ upcoming.length } cancelled={ cancelled.length } />
                    <div style={ { display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' } }>
                        <Legend color="var(--mitii-teal)" label="Completed" count={ past.length } />
                        <Legend color="var(--mitii-gold)" label="Upcoming"  count={ upcoming.length } />
                        <Legend color="var(--mitii-danger)" label="Cancelled" count={ cancelled.length } />
                    </div>
                </div>
            ) }

            {/* ── Favourite service ── */}
            { favouriteService && active.length >= 2 && (
                <div style={ {
                    background: 'var(--mitii-gold-light)',
                    borderRadius: 14,
                    padding: '14px 18px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                } }>
                    <span style={ { fontSize: 26 } }>⭐</span>
                    <div>
                        <p style={ { margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a6a1f' } }>
                            Your favourite service
                        </p>
                        <p style={ { margin: '3px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--mitii-teal-dark)' } }>
                            { favouriteService }
                        </p>
                    </div>
                </div>
            ) }

            {/* ── Upcoming list (up to 3) ── */}
            { upcoming.length > 0 && (
                <div>
                    <p className="mitii-portal-section-title">Upcoming ({ upcoming.length })</p>
                    { upcoming.slice( 0, 3 ).map( ( b, i ) => (
                        <UpcomingRow key={ b.id } booking={ b } isFirst={ i === 0 } />
                    ) ) }
                    { upcoming.length > 3 && (
                        <button
                            className="mitii-portal-btn-text"
                            style={ { color: 'var(--mitii-teal)', marginTop: 4 } }
                            onClick={ onGoToBookings }
                        >
                            View all { upcoming.length } upcoming →
                        </button>
                    ) }
                </div>
            ) }
        </div>
    );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function KpiCard( { value, label }: { value: string; label: string } ) {
    return (
        <div style={ {
            background: '#fff',
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: 'var(--elevation-1)',
            textAlign: 'center',
        } }>
            <div style={ { fontSize: 18, fontWeight: 800, color: 'var(--mitii-teal-dark)', lineHeight: 1.1 } }>{ value }</div>
            <div style={ { fontSize: 11, color: 'var(--mitii-ink-soft)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' } }>{ label }</div>
        </div>
    );
}

function StatusBar( { completed, upcoming, cancelled }: { completed: number; upcoming: number; cancelled: number } ) {
    const total = completed + upcoming + cancelled;
    if ( total === 0 ) return null;
    const pCompleted = ( completed / total ) * 100;
    const pUpcoming  = ( upcoming  / total ) * 100;
    const pCancelled = ( cancelled / total ) * 100;

    return (
        <div style={ { display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: '#f0f0f0' } }>
            { completed > 0 && <div style={ { width: `${ pCompleted }%`, background: 'var(--mitii-teal)' } } /> }
            { upcoming  > 0 && <div style={ { width: `${ pUpcoming  }%`, background: 'var(--mitii-gold)' } } /> }
            { cancelled > 0 && <div style={ { width: `${ pCancelled }%`, background: 'var(--mitii-danger)' } } /> }
        </div>
    );
}

function Legend( { color, label, count }: { color: string; label: string; count: number } ) {
    return (
        <div style={ { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mitii-ink-soft)' } }>
            <span style={ { width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' } } />
            <span>{ label }</span>
            <span style={ { fontWeight: 700, color: 'var(--mitii-ink)' } }>{ count }</span>
        </div>
    );
}

function UpcomingRow( { booking, isFirst }: { booking: Booking; isFirst: boolean } ) {
    return (
        <div style={ {
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            background: '#fff',
            borderRadius: 14,
            marginBottom: 10,
            boxShadow: 'var(--elevation-1)',
            borderLeft: isFirst ? '4px solid var(--mitii-teal)' : '4px solid transparent',
        } }>
            <div style={ {
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--mitii-teal-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
            } }>
                { booking.service_name ? booking.service_name[ 0 ].toUpperCase() : '?' }
            </div>
            <div style={ { flex: 1, minWidth: 0 } }>
                <p style={ { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--mitii-ink)' } }>
                    { booking.service_name || 'Appointment' }
                </p>
                <p style={ { margin: '2px 0 0', fontSize: 12, color: 'var(--mitii-ink-soft)' } }>
                    { booking.booking_date } at { booking.booking_time.slice( 0, 5 ) }
                    { booking.staff_name ? ` · ${ booking.staff_name }` : '' }
                </p>
            </div>
            <span style={ {
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: booking.status === 'pending' ? 'var(--mitii-gold)' : 'var(--mitii-teal)',
                background: booking.status === 'pending' ? 'var(--mitii-gold-light)' : 'var(--mitii-teal-light)',
                padding: '4px 10px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
            } }>
                { booking.status }
            </span>
        </div>
    );
}