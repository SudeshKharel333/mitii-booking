import { useEffect, useState } from 'react';
// @ts-ignore
import '../admin-styles.css';

// ── Types ────────────────────────────────────────────────────────────────────

type DailyPoint = { date: string; label: string; count: number };

type DashboardData = {
    totals: {
        bookings: number;
        revenue: number;
        staff: number;
        services: number;
        customers: number;
    };
    today: { bookings: number; revenue: number };
    this_month: { bookings: number; revenue: number };
    last_month: { bookings: number; revenue: number };
    status_counts: { pending: number; completed: number; cancelled: number };
    top_services: { name: string; booking_count: number; revenue: string }[];
    top_staff: { name: string; booking_count: number }[];
    daily_bookings: DailyPoint[];
    upcoming_today: {
        customer_name: string;
        customer_email: string;
        booking_time: string;
        service_name: string;
        staff_name: string;
    }[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pctChange( current: number, previous: number ): string {
    if ( previous === 0 ) return current > 0 ? '+100%' : '—';
    const pct = ( ( current - previous ) / previous ) * 100;
    return ( pct >= 0 ? '+' : '' ) + pct.toFixed( 0 ) + '%';
}

function isPositiveChange( current: number, previous: number ): boolean {
    return current >= previous;
}

function fmt( n: number ): string {
    return n.toLocaleString();
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function NavPills( { active }: { active: 'dashboard' | 'bookings' | 'services' | 'staff' } ) {
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
        </div>
    );
}

// ── Mini bar chart (pure SVG, no library needed) ─────────────────────────────

function BarChart( { data }: { data: DailyPoint[] } ) {
    const max = Math.max( ...data.map( d => d.count ), 1 );
    const W = 420, H = 90, BAR_W = 36, GAP = 12;
    const total = data.length;
    const step = ( W - BAR_W ) / ( total - 1 );

    return (
        <svg viewBox={ `0 0 ${ W } ${ H + 24 }` } style={ { width: '100%', maxWidth: W } }>
            { data.map( ( d, i ) => {
                const barH = max === 0 ? 4 : Math.max( 4, ( d.count / max ) * H );
                const x = i * step;
                const y = H - barH;
                const isToday = i === total - 1;
                return (
                    <g key={ d.date }>
                        <rect
                            x={ x } y={ y }
                            width={ BAR_W } height={ barH }
                            rx={ 4 }
                            fill={ isToday ? 'var(--mitii-teal)' : 'var(--mitii-teal-light)' }
                        />
                        { d.count > 0 && (
                            <text
                                x={ x + BAR_W / 2 } y={ y - 4 }
                                textAnchor="middle"
                                fontSize="10"
                                fill="var(--mitii-ink-soft)"
                                fontWeight="600"
                            >
                                { d.count }
                            </text>
                        ) }
                        <text
                            x={ x + BAR_W / 2 } y={ H + 16 }
                            textAnchor="middle"
                            fontSize="10"
                            fill={ isToday ? 'var(--mitii-teal-dark)' : 'var(--mitii-ink-soft)' }
                            fontWeight={ isToday ? '700' : '400' }
                        >
                            { d.label }
                        </text>
                    </g>
                );
            } ) }
        </svg>
    );
}

// ── Status donut (pure SVG) ──────────────────────────────────────────────────

function StatusDonut( { counts }: { counts: DashboardData['status_counts'] } ) {
    const COLORS: Record<string, string> = {
        completed: 'var(--mitii-teal)',
        pending:   'var(--mitii-gold)',
        cancelled: 'var(--mitii-danger)',
    };
    const labels: Record<string, string> = {
        completed: 'Completed',
        pending:   'Pending',
        cancelled: 'Cancelled',
    };

    const total = counts.pending + counts.completed + counts.cancelled;
    if ( total === 0 ) {
        return <p className="mitii-hint" style={ { textAlign: 'center', padding: '24px 0' } }>No bookings yet.</p>;
    }

    const R = 48, CX = 60, CY = 60, strokeW = 18;
    const circumference = 2 * Math.PI * R;

    let offset = 0;
    const segments = ( Object.keys( counts ) as Array<keyof typeof counts> ).map( key => {
        const pct = counts[ key ] / total;
        const seg = { key, pct, offset, dash: pct * circumference, gap: ( 1 - pct ) * circumference };
        offset += pct * circumference;
        return seg;
    } );

    return (
        <div style={ { display: 'flex', alignItems: 'center', gap: 24 } }>
            <svg viewBox="0 0 120 120" style={ { width: 100, flexShrink: 0 } }>
                <circle cx={ CX } cy={ CY } r={ R } fill="none" stroke="var(--mitii-border)" strokeWidth={ strokeW } />
                { segments.map( seg => (
                    seg.pct > 0 && (
                        <circle
                            key={ seg.key }
                            cx={ CX } cy={ CY } r={ R }
                            fill="none"
                            stroke={ COLORS[ seg.key ] }
                            strokeWidth={ strokeW }
                            strokeDasharray={ `${ seg.dash } ${ seg.gap }` }
                            strokeDashoffset={ -seg.offset + circumference * 0.25 }
                            style={ { transform: 'rotate(-90deg)', transformOrigin: `${ CX }px ${ CY }px` } }
                        />
                    )
                ) ) }
                <text x={ CX } y={ CY + 5 } textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--mitii-teal-dark)">
                    { total }
                </text>
            </svg>
            <div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
                { ( Object.keys( counts ) as Array<keyof typeof counts> ).map( key => (
                    <div key={ key } style={ { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 } }>
                        <span style={ { width: 10, height: 10, borderRadius: '50%', background: COLORS[ key ], flexShrink: 0, display: 'inline-block' } } />
                        <span style={ { color: 'var(--mitii-ink-soft)' } }>{ labels[ key ] }</span>
                        <strong style={ { color: 'var(--mitii-ink)', marginLeft: 'auto', paddingLeft: 12 } }>{ counts[ key ] }</strong>
                    </div>
                ) ) }
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [ data, setData ] = useState<DashboardData | null>( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( '' );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/dashboard', {
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( res => {
                if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
                return res.json();
            } )
            .then( d => { setData( d ); setLoading( false ); } )
            .catch( () => { setError( 'Could not load dashboard data.' ); setLoading( false ); } );
    }, [] );

    if ( loading ) {
        return (
            <div className="mitii-admin">
                <NavPills active="dashboard" />
                <h1>Dashboard</h1>
                <p className="mitii-subtitle">Loading…</p>
            </div>
        );
    }

    if ( error || ! data ) {
        return (
            <div className="mitii-admin">
                <NavPills active="dashboard" />
                <h1>Dashboard</h1>
                <p className="mitii-error">{ error || 'Unknown error.' }</p>
            </div>
        );
    }

    const bookingChange  = pctChange( data.this_month.bookings, data.last_month.bookings );
    const revenueChange  = pctChange( data.this_month.revenue,  data.last_month.revenue );
    const bookingUp      = isPositiveChange( data.this_month.bookings, data.last_month.bookings );
    const revenueUp      = isPositiveChange( data.this_month.revenue,  data.last_month.revenue );

    return (
        <div className="mitii-admin">
            <NavPills active="dashboard" />
            <h1>Dashboard</h1>
            <p className="mitii-subtitle">Overview of your booking system.</p>

            {/* ── KPI cards ── */}
            <div className="mitii-stat-grid" style={ { gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: 28 } }>
                <StatCard label="Total Bookings"  value={ fmt( data.totals.bookings ) }  icon="📅" />
                <StatCard label="Total Revenue"   value={ `$${ data.totals.revenue.toFixed(2) }` } icon="💰" />
                <StatCard label="Staff Members"   value={ fmt( data.totals.staff ) }     icon="👥" />
                <StatCard label="Services"        value={ fmt( data.totals.services ) }  icon="🛎️" />
                <StatCard label="Customers"       value={ fmt( data.totals.customers ) } icon="🙋" />
            </div>

            {/* ── Today + This month ── */}
            <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 28 } }>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-label" style={ { marginBottom: 10 } }>Today</div>
                    <div style={ { display: 'flex', justifyContent: 'space-between' } }>
                        <div>
                            <div style={ { fontSize: 28, fontWeight: 800, color: 'var(--mitii-teal-dark)' } }>{ data.today.bookings }</div>
                            <div className="mitii-hint">bookings</div>
                        </div>
                        <div style={ { textAlign: 'right' } }>
                            <div style={ { fontSize: 22, fontWeight: 700, color: 'var(--mitii-teal-dark)' } }>${ data.today.revenue.toFixed(2) }</div>
                            <div className="mitii-hint">revenue</div>
                        </div>
                    </div>
                </div>

                <div className="mitii-stat-card">
                    <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 } }>
                        <div className="mitii-stat-label">This Month</div>
                        <div style={ { fontSize: 11, fontWeight: 700, color: bookingUp ? 'var(--mitii-teal)' : 'var(--mitii-danger)' } }>
                            { bookingChange } vs last month
                        </div>
                    </div>
                    <div style={ { display: 'flex', justifyContent: 'space-between' } }>
                        <div>
                            <div style={ { fontSize: 28, fontWeight: 800, color: 'var(--mitii-teal-dark)' } }>{ data.this_month.bookings }</div>
                            <div className="mitii-hint">bookings</div>
                        </div>
                        <div style={ { textAlign: 'right' } }>
                            <div style={ { fontSize: 22, fontWeight: 700, color: revenueUp ? 'var(--mitii-teal-dark)' : 'var(--mitii-danger)' } }>${ data.this_month.revenue.toFixed(2) }</div>
                            <div className="mitii-hint">{ revenueChange } revenue</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Chart + Donut row ── */}
            <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 } }>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-label" style={ { marginBottom: 14 } }>Bookings — Last 7 Days</div>
                    <BarChart data={ data.daily_bookings } />
                </div>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-label" style={ { marginBottom: 14 } }>Status Breakdown</div>
                    <StatusDonut counts={ data.status_counts } />
                </div>
            </div>

            {/* ── Top services + Staff row ── */}
            <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 } }>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-label" style={ { marginBottom: 12 } }>Top Services</div>
                    { data.top_services.length === 0 ? (
                        <p className="mitii-hint">No data yet.</p>
                    ) : (
                        <table style={ { width: '100%', borderCollapse: 'collapse', fontSize: 13 } }>
                            <tbody>
                                { data.top_services.map( ( s, i ) => (
                                    <tr key={ i } style={ { borderTop: i > 0 ? '1px solid var(--mitii-border)' : 'none' } }>
                                        <td style={ { padding: '8px 0', color: 'var(--mitii-ink)' } }>{ s.name || '—' }</td>
                                        <td style={ { padding: '8px 0', textAlign: 'right', color: 'var(--mitii-ink-soft)' } }>{ s.booking_count } bookings</td>
                                        <td style={ { padding: '8px 0', textAlign: 'right', fontWeight: 700, color: 'var(--mitii-teal-dark)', paddingLeft: 12 } }>${ parseFloat( s.revenue ).toFixed(2) }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    ) }
                </div>

                <div className="mitii-stat-card">
                    <div className="mitii-stat-label" style={ { marginBottom: 12 } }>Top Staff</div>
                    { data.top_staff.length === 0 ? (
                        <p className="mitii-hint">No data yet.</p>
                    ) : (
                        <table style={ { width: '100%', borderCollapse: 'collapse', fontSize: 13 } }>
                            <tbody>
                                { data.top_staff.map( ( s, i ) => (
                                    <tr key={ i } style={ { borderTop: i > 0 ? '1px solid var(--mitii-border)' : 'none' } }>
                                        <td style={ { padding: '8px 0', color: 'var(--mitii-ink)' } }>{ s.name || '—' }</td>
                                        <td style={ { padding: '8px 0', textAlign: 'right', color: 'var(--mitii-ink-soft)' } }>{ s.booking_count } bookings</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    ) }
                </div>
            </div>

            {/* ── Upcoming today ── */}
            { data.upcoming_today.length > 0 && (
                <div className="mitii-stat-card" style={ { marginBottom: 28 } }>
                    <div className="mitii-stat-label" style={ { marginBottom: 12 } }>Upcoming Today</div>
                    <div className="mitii-table-wrap" style={ { boxShadow: 'none', border: 'none' } }>
                        <table className="mitii-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Customer</th>
                                    <th>Service</th>
                                    <th>Staff</th>
                                </tr>
                            </thead>
                            <tbody>
                                { data.upcoming_today.map( ( u, i ) => (
                                    <tr key={ i }>
                                        <td style={ { fontWeight: 700, color: 'var(--mitii-teal-dark)', whiteSpace: 'nowrap' } }>
                                            { u.booking_time.slice( 0, 5 ) }
                                        </td>
                                        <td>
                                            { u.customer_name }
                                            <div className="mitii-hint">{ u.customer_email }</div>
                                        </td>
                                        <td>{ u.service_name || '—' }</td>
                                        <td>{ u.staff_name || '—' }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </div>
            ) }
        </div>
    );
}

// ── Small reusable stat card ──────────────────────────────────────────────────

function StatCard( { label, value, icon }: { label: string; value: string; icon: string } ) {
    return (
        <div className="mitii-stat-card" style={ { display: 'flex', alignItems: 'center', gap: 14 } }>
            <div style={ { fontSize: 28, lineHeight: 1 } }>{ icon }</div>
            <div>
                <div style={ { fontSize: 22, fontWeight: 800, color: 'var(--mitii-teal-dark)', lineHeight: 1.1 } }>{ value }</div>
                <div className="mitii-hint" style={ { marginTop: 3 } }>{ label }</div>
            </div>
        </div>
    );
}