import { useEffect, useState, useCallback } from 'react';
// @ts-ignore
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

type StaffOption = { id: number; name: string };

type Filters = {
    search: string;
    status: string;
    staff_id: string;
    date_from: string;
    date_to: string;
};

const EMPTY_FILTERS: Filters = { search: '', status: '', staff_id: '', date_from: '', date_to: '' };
const PER_PAGE = 20;
const nonce = () => ( window as any ).mitiiAdminData?.nonce;

function NavPills( { active }: { active: 'dashboard' | 'bookings' | 'services' | 'staff' } ) {
    return (
        <div className="mitii-nav-pills">
            <a href="admin.php?page=mitii-dashboard" className={ `mitii-nav-pill${ active === 'dashboard' ? ' is-active' : '' }` }>Dashboard</a>
            <a href="admin.php?page=mitii-bookings"  className={ `mitii-nav-pill${ active === 'bookings'  ? ' is-active' : '' }` }>Bookings</a>
            <a href="admin.php?page=mitii-services"  className={ `mitii-nav-pill${ active === 'services'  ? ' is-active' : '' }` }>Services</a>
            <a href="admin.php?page=mitii-staff"     className={ `mitii-nav-pill${ active === 'staff'     ? ' is-active' : '' }` }>Staff</a>
        </div>
    );
}

export default function BookingsPage() {
    const [ bookings, setBookings ]     = useState<Booking[]>( [] );
    const [ staffList, setStaffList ]   = useState<StaffOption[]>( [] );
    const [ loading, setLoading ]       = useState( true );
    const [ error, setError ]           = useState( '' );
    const [ page, setPage ]             = useState( 1 );
    const [ totalPages, setTotalPages ] = useState( 1 );
    const [ totalCount, setTotalCount ] = useState( 0 );
    const [ filters, setFilters ]       = useState<Filters>( EMPTY_FILTERS );
    const [ applied, setApplied ]       = useState<Filters>( EMPTY_FILTERS );

    // Load staff list once for the dropdown
    useEffect( () => {
        fetch( '/wp-json/mitii/v1/staff', { headers: { 'X-WP-Nonce': nonce() } } )
            .then( r => r.json() )
            .then( data => setStaffList( Array.isArray( data ) ? data : [] ) )
            .catch( () => {} );
    }, [] );

    const buildUrl = useCallback( ( f: Filters, p: number ) => {
        const q = new URLSearchParams();
        q.set( 'page', String( p ) );
        q.set( 'per_page', String( PER_PAGE ) );
        if ( f.search )    q.set( 'search',    f.search );
        if ( f.status )    q.set( 'status',    f.status );
        if ( f.staff_id )  q.set( 'staff_id',  f.staff_id );
        if ( f.date_from ) q.set( 'date_from', f.date_from );
        if ( f.date_to )   q.set( 'date_to',   f.date_to );
        return `/wp-json/mitii/v1/bookings?${ q.toString() }`;
    }, [] );

    const loadBookings = useCallback( ( f: Filters, p: number ) => {
        setLoading( true );
        fetch( buildUrl( f, p ), { headers: { 'X-WP-Nonce': nonce() } } )
            .then( res => {
                setTotalCount( parseInt( res.headers.get( 'X-WP-Total' ) || '0', 10 ) );
                setTotalPages( parseInt( res.headers.get( 'X-WP-TotalPages' ) || '1', 10 ) );
                return res.json();
            } )
            .then( data => { setBookings( Array.isArray( data ) ? data : [] ); setLoading( false ); } )
            .catch( () => { setError( 'Could not load bookings.' ); setLoading( false ); } );
    }, [ buildUrl ] );

    useEffect( () => { loadBookings( applied, page ); }, [ applied, page ] );

    const handleApply = () => { setApplied( filters ); setPage( 1 ); };
    const handleClear = () => { const f = EMPTY_FILTERS; setFilters( f ); setApplied( f ); setPage( 1 ); };
    const isFiltered  = Object.values( applied ).some( v => v !== '' );

    const handleStatusChange = ( id: number, newStatus: string ) => {
        setBookings( cur => cur.map( b => b.id === id ? { ...b, status: newStatus } : b ) );
        fetch( `/wp-json/mitii/v1/bookings/${ id }/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce() },
            body: JSON.stringify( { status: newStatus } ),
        } )
            .then( r => r.json() )
            .then( d => { if ( d.code ) { setError( d.message ); loadBookings( applied, page ); } } )
            .catch( () => { setError( 'Network error.' ); loadBookings( applied, page ); } );
    };

    const today = new Date().toISOString().slice( 0, 10 );
    const active = bookings.filter( b => b.status !== 'cancelled' );
    const todayCount = active.filter( b => b.booking_date === today ).length;
    const pageRevenue = active.reduce( ( s, b ) => s + ( b.service_price ? parseFloat( b.service_price ) : 0 ), 0 );

    return (
        <div className="mitii-admin">
            <NavPills active="bookings" />
            <h1>Bookings</h1>
            <p className="mitii-subtitle">All appointments booked by customers.</p>
            { error && <p className="mitii-error">{ error }</p> }

            {/* ── KPI cards ── */}
            <div className="mitii-stat-grid" style={ { marginBottom: 20 } }>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">{ totalCount }</div>
                    <div className="mitii-stat-label">{ isFiltered ? 'Matching' : 'Total' } Bookings</div>
                </div>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">{ todayCount }</div>
                    <div className="mitii-stat-label">Today (this page)</div>
                </div>
                <div className="mitii-stat-card">
                    <div className="mitii-stat-value">${ pageRevenue.toFixed( 2 ) }</div>
                    <div className="mitii-stat-label">Revenue (this page)</div>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div style={ {
                background: '#fff',
                border: '1px solid var(--mitii-border)',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 18,
            } }>
                <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 } }>
                    {/* Search */}
                    <div>
                        <label style={ { fontSize: 11, fontWeight: 700, color: 'var(--mitii-ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 } }>
                            Search
                        </label>
                        <input
                            type="text"
                            placeholder="Name or email…"
                            value={ filters.search }
                            onChange={ e => setFilters( f => ( { ...f, search: e.target.value } ) ) }
                            onKeyDown={ e => e.key === 'Enter' && handleApply() }
                            style={ inputStyle }
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label style={ labelStyle }>Status</label>
                        <select
                            value={ filters.status }
                            onChange={ e => setFilters( f => ( { ...f, status: e.target.value } ) ) }
                            style={ inputStyle }
                        >
                            <option value="">All statuses</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Staff */}
                    <div>
                        <label style={ labelStyle }>Staff</label>
                        <select
                            value={ filters.staff_id }
                            onChange={ e => setFilters( f => ( { ...f, staff_id: e.target.value } ) ) }
                            style={ inputStyle }
                        >
                            <option value="">All staff</option>
                            { staffList.map( s => (
                                <option key={ s.id } value={ String( s.id ) }>{ s.name }</option>
                            ) ) }
                        </select>
                    </div>

                    {/* Date from */}
                    <div>
                        <label style={ labelStyle }>Date from</label>
                        <input
                            type="date"
                            value={ filters.date_from }
                            onChange={ e => setFilters( f => ( { ...f, date_from: e.target.value } ) ) }
                            style={ inputStyle }
                        />
                    </div>

                    {/* Date to */}
                    <div>
                        <label style={ labelStyle }>Date to</label>
                        <input
                            type="date"
                            value={ filters.date_to }
                            onChange={ e => setFilters( f => ( { ...f, date_to: e.target.value } ) ) }
                            style={ inputStyle }
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div style={ { display: 'flex', gap: 8, alignItems: 'center' } }>
                    <button className="mitii-btn mitii-btn-primary mitii-btn-sm" onClick={ handleApply }>
                        Apply Filters
                    </button>
                    { isFiltered && (
                        <button className="mitii-btn mitii-btn-secondary mitii-btn-sm" onClick={ handleClear }>
                            Clear
                        </button>
                    ) }
                    { isFiltered && (
                        <span style={ { fontSize: 12, color: 'var(--mitii-teal)', fontWeight: 700, marginLeft: 4 } }>
                            { totalCount } result{ totalCount !== 1 ? 's' : '' }
                        </span>
                    ) }
                    { loading && <span style={ { fontSize: 12, color: 'var(--mitii-ink-soft)' } }>Loading…</span> }
                </div>
            </div>

            {/* ── Table ── */}
            { bookings.length === 0 && ! loading ? (
                <div className="mitii-empty-state">
                    { isFiltered ? 'No bookings match your filters.' : 'No bookings yet.' }
                </div>
            ) : (
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
                                { bookings.map( b => (
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
                                                onChange={ e => handleStatusChange( b.id, e.target.value ) }
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
                        <div className="mitii-btn-row" style={ { marginTop: 14, alignItems: 'center' } }>
                            <button
                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                onClick={ () => setPage( p => p - 1 ) }
                                disabled={ page <= 1 }
                            >← Previous</button>
                            <span className="mitii-hint" style={ { margin: '0 8px' } }>
                                Page { page } of { totalPages }
                            </span>
                            <button
                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                onClick={ () => setPage( p => p + 1 ) }
                                disabled={ page >= totalPages }
                            >Next →</button>
                        </div>
                    ) }
                </>
            ) }
        </div>
    );
}

// ── Shared inline styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid var(--mitii-border)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--mitii-ink)',
    background: 'var(--mitii-paper)',
    boxSizing: 'border-box',
    outline: 'none',
};

const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--mitii-ink-soft)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: 4,
};