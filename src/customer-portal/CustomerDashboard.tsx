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
};

export default function CustomerDashboard( { userName, onGoToBookings }: Props ) {
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
            <div style={ { fontSize: 11, color: 'var(--mitii-ink-soft)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }>{ label }</div>
        </div>
    );
}

function StatusBar( { completed, upcoming, cancelled }: { completed: number; upcoming: number; cancelled: number } ) {
    const total = completed + upcoming + cancelled || 1;
    const pct = ( n: number ) => ( n / total ) * 100;
    return (
        <div style={ { height: 10, borderRadius: 999, overflow: 'hidden', display: 'flex', background: 'var(--mitii-border)' } }>
            { completed > 0 && <div style={ { width: `${ pct( completed ) }%`, background: 'var(--mitii-teal)', transition: 'width 0.4s ease' } } /> }
            { upcoming > 0  && <div style={ { width: `${ pct( upcoming ) }%`,  background: 'var(--mitii-gold)',   transition: 'width 0.4s ease' } } /> }
            { cancelled > 0 && <div style={ { width: `${ pct( cancelled ) }%`, background: 'var(--mitii-danger)', transition: 'width 0.4s ease' } } /> }
        </div>
    );
}

function Legend( { color, label, count }: { color: string; label: string; count: number } ) {
    return (
        <div style={ { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 } }>
            <span style={ { width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 } } />
            <span style={ { color: 'var(--mitii-ink-soft)' } }>{ label }</span>
            <strong style={ { color: 'var(--mitii-ink)' } }>{ count }</strong>
        </div>
    );
}

function UpcomingRow( { booking, isFirst }: { booking: Booking; isFirst: boolean } ) {
    return (
        <div style={ {
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '11px 0',
            borderTop: isFirst ? 'none' : '1px solid var(--mitii-border)',
        } }>
            <div style={ {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: isFirst ? 'var(--mitii-teal)' : 'var(--mitii-teal-light)',
                color: isFirst ? '#fff' : 'var(--mitii-teal-dark)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, lineHeight: 1.2,
            } }>
                <span style={ { fontSize: 13 } }>{ new Date( booking.booking_date ).getDate() }</span>
                <span>{ new Date( booking.booking_date + 'T00:00:00' ).toLocaleString( 'default', { month: 'short' } ) }</span>
            </div>
            <div style={ { flex: 1 } }>
                <div style={ { fontWeight: 700, fontSize: 14, color: 'var(--mitii-ink)' } }>
                    { booking.service_name || 'Appointment' }
                </div>
                <div style={ { fontSize: 12, color: 'var(--mitii-ink-soft)', marginTop: 2 } }>
                    { booking.booking_time.slice( 0, 5 ) }
                    { booking.staff_name ? ` · with ${ booking.staff_name }` : '' }
                </div>
            </div>
            { booking.service_price && (
                <div style={ { fontWeight: 700, fontSize: 14, color: 'var(--mitii-teal-dark)', flexShrink: 0 } }>
                    ${ booking.service_price }
                </div>
            ) }
        </div>
    );
}