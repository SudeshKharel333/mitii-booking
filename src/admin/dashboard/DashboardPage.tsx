import { useEffect, useState } from 'react';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

type DayCount = { date: string; count: number };

type Stats = {
    series: DayCount[];
    summary: {
        total_bookings: number;
        upcoming_bookings: number;
        pending_bookings: number;
        completed_revenue: number;
    };
};

const RANGE_OPTIONS = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
];

function NavPills( { active }: { active: 'dashboard' | 'bookings' | 'services' | 'staff' | 'customers' } ) {
    return (
        <div className="mitii-nav-pills">
            <a href="admin.php?page=mitii-dashboard" className={ `mitii-nav-pill${ active === 'dashboard' ? ' is-active' : '' }` }>
                Dashboard
            </a>
            <a href="admin.php?page=mitii-bookings" className={ `mitii-nav-pill${ active === 'bookings' ? ' is-active' : '' }` }>
                Bookings
            </a>
            <a href="admin.php?page=mitii-services" className={ `mitii-nav-pill${ active === 'services' ? ' is-active' : '' }` }>
                Services
            </a>
            <a href="admin.php?page=mitii-staff" className={ `mitii-nav-pill${ active === 'staff' ? ' is-active' : '' }` }>
                Staff
            </a>
            <a href="admin.php?page=mitii-customers" className={ `mitii-nav-pill${ active === 'customers' ? ' is-active' : '' }` }>
                Customers
            </a>
        </div>
    );
}

function BookingsChart( { series }: { series: DayCount[] } ) {
    const width = 900;
    const height = 260;
    const paddingLeft = 40;
    const paddingBottom = 34;
    const paddingTop = 16;
    const chartWidth = width - paddingLeft - 12;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxCount = Math.max( 1, ...series.map( ( d ) => d.count ) );
    const barGap = 4;
    const barWidth = series.length > 0 ? chartWidth / series.length - barGap : 0;

    // Thin out date labels so they don't overlap on longer ranges.
    const labelEvery = series.length > 30 ? 7 : series.length > 14 ? 3 : 1;

    const formatLabel = ( iso: string ) => {
        const d = new Date( iso + 'T00:00:00' );
        return d.toLocaleDateString( undefined, { month: 'short', day: 'numeric' } );
    };

    return (
        <svg viewBox={ `0 0 ${ width } ${ height }` } style={ { width: '100%', height: 'auto', display: 'block' } }>
            { [ 0, 0.25, 0.5, 0.75, 1 ].map( ( f ) => {
                const y = paddingTop + chartHeight * ( 1 - f );
                return (
                    <line
                        key={ f }
                        x1={ paddingLeft }
                        x2={ width - 12 }
                        y1={ y }
                        y2={ y }
                        stroke="#E2DFD5"
                        strokeWidth={ 1 }
                    />
                );
            } ) }

            { [ 0, 0.5, 1 ].map( ( f ) => {
                const y = paddingTop + chartHeight * ( 1 - f );
                return (
                    <text key={ f } x={ paddingLeft - 8 } y={ y + 4 } textAnchor="end" fontSize="11" fill="#6B6862">
                        { Math.round( maxCount * f ) }
                    </text>
                );
            } ) }

            { series.map( ( d, i ) => {
                const barHeight = ( d.count / maxCount ) * chartHeight;
                const x = paddingLeft + i * ( barWidth + barGap );
                const y = paddingTop + chartHeight - barHeight;
                const showLabel = i % labelEvery === 0;

                return (
                    <g key={ d.date }>
                        <rect
                            x={ x }
                            y={ y }
                            width={ Math.max( 1, barWidth ) }
                            height={ Math.max( 0, barHeight ) }
                            rx={ 2 }
                            fill={ d.count > 0 ? 'var(--mitii-teal, #2F6F63)' : '#E2DFD5' }
                        >
                            <title>{ `${ d.date }: ${ d.count } booking${ d.count === 1 ? '' : 's' }` }</title>
                        </rect>
                        { showLabel && (
                            <text
                                x={ x + barWidth / 2 }
                                y={ height - paddingBottom + 16 }
                                textAnchor="middle"
                                fontSize="10"
                                fill="#6B6862"
                            >
                                { formatLabel( d.date ) }
                            </text>
                        ) }
                    </g>
                );
            } ) }
        </svg>
    );
}

export default function DashboardPage() {
    const [ stats, setStats ] = useState<Stats | null>( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( '' );
    const [ days, setDays ] = useState( 30 );

    useEffect( () => {
        setLoading( true );
        fetch( `/wp-json/mitii/v1/dashboard/stats?days=${ days }`, {
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                if ( data.code ) {
                    setError( data.message || 'Could not load dashboard stats.' );
                } else {
                    setStats( data );
                }
                setLoading( false );
            } )
            .catch( () => {
                setError( 'Network error. Please try again.' );
                setLoading( false );
            } );
    }, [ days ] );

    return (
        <div className="mitii-admin">
            <NavPills active="dashboard" />
            <h1>Dashboard</h1>
            <p className="mitii-subtitle">An overview of booking activity.</p>
            { error && <p className="mitii-error">{ error }</p> }

            { loading && ! stats && <p className="mitii-subtitle">Loading...</p> }

            { stats && (
                <>
                    <div className="mitii-stat-grid">
                        <div className="mitii-stat-card">
                            <div className="mitii-stat-value">{ stats.summary.total_bookings }</div>
                            <div className="mitii-stat-label">Total Bookings</div>
                        </div>
                        <div className="mitii-stat-card">
                            <div className="mitii-stat-value">{ stats.summary.upcoming_bookings }</div>
                            <div className="mitii-stat-label">Upcoming</div>
                        </div>
                        <div className="mitii-stat-card">
                            <div className="mitii-stat-value">{ stats.summary.pending_bookings }</div>
                            <div className="mitii-stat-label">Awaiting Action</div>
                        </div>
                        <div className="mitii-stat-card">
                            <div className="mitii-stat-value">${ stats.summary.completed_revenue.toFixed( 2 ) }</div>
                            <div className="mitii-stat-label">Completed Revenue</div>
                        </div>
                    </div>

                    <div className="mitii-table-wrap" style={ { padding: '20px 20px 8px' } }>
                        <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } }>
                            <h2 style={ { margin: 0 } }>Bookings Over Time</h2>
                            <div className="mitii-nav-pills" style={ { marginBottom: 0 } }>
                                { RANGE_OPTIONS.map( ( opt ) => (
                                    <button
                                        key={ opt.value }
                                        className={ `mitii-nav-pill${ days === opt.value ? ' is-active' : '' }` }
                                        style={ { border: 'none', cursor: 'pointer' } }
                                        onClick={ () => setDays( opt.value ) }
                                    >
                                        { opt.label }
                                    </button>
                                ) ) }
                            </div>
                        </div>
                        <BookingsChart series={ stats.series } />
                    </div>
                </>
            ) }
        </div>
    );
}