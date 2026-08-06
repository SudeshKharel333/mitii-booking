import { useEffect, useState } from 'react';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

// ── Types ──────────────────────────────────────────────────────────────────

type Staff = {
    id: number;
    name: string;
    email: string;
    bio: string;
    image_url: string;
    service_ids: number[];
};

type Service = {
    id: number;
    name: string;
};

type AvailabilityRow = {
    day_of_week: number;
    start_time: string;
    end_time: string;
};

type DaySchedule = {
    enabled: boolean;
    start: string;
    end: string;
};

type BreakTime = {
    id: number;
    day_of_week: number | null; // null = every working day
    start_time: string;
    end_time: string;
    label: string;
};

type Holiday = {
    id: number;
    holiday_date: string; // YYYY-MM-DD
    label: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

const emptyWeek = (): DaySchedule[] =>
    DAY_NAMES.map( () => ( { enabled: false, start: '09:00', end: '18:00' } ) );

const nonce = () => ( window as any ).mitiiAdminData?.nonce as string;
const authHeaders = () => ( {
    'Content-Type': 'application/json',
    'X-WP-Nonce': nonce(),
} );

// ── Nav ────────────────────────────────────────────────────────────────────

function NavPills( { active }: { active: 'dashboard' | 'bookings' | 'services' | 'staff' | 'customers' } ) {
    return (
        <div className="mitii-nav-pills">
            { ( [ 'dashboard', 'bookings', 'services', 'staff', 'customers' ] as const ).map( ( page ) => (
                <a
                    key={ page }
                    href={ `admin.php?page=mitii-${ page }` }
                    className={ `mitii-nav-pill${ active === page ? ' is-active' : '' }` }
                >
                    { page.charAt( 0 ).toUpperCase() + page.slice( 1 ) }
                </a>
            ) ) }
        </div>
    );
}

declare global {
    interface Window { wp: any; }
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function StaffPage() {
    // Staff list
    const [ staffList, setStaffList ] = useState<Staff[]>( [] );
    const [ services, setServices ] = useState<Service[]>( [] );
    const [ loading, setLoading ] = useState( true );

    // Staff form
    const [ editingId, setEditingId ] = useState<number | null>( null );
    const [ name, setName ] = useState( '' );
    const [ email, setEmail ] = useState( '' );
    const [ bio, setBio ] = useState( '' );
    const [ imageUrl, setImageUrl ] = useState( '' );
    const [ selectedServiceIds, setSelectedServiceIds ] = useState<number[]>( [] );
    const [ error, setError ] = useState( '' );

    // Working hours
    const [ week, setWeek ] = useState<DaySchedule[]>( emptyWeek() );
    const [ scheduleMessage, setScheduleMessage ] = useState( '' );
    const [ scheduleSaving, setScheduleSaving ] = useState( false );

    // Break times
    const [ breakTimes, setBreakTimes ] = useState<BreakTime[]>( [] );
    const [ newBreakDay, setNewBreakDay ] = useState<string>( '' );   // '' = every day
    const [ newBreakStart, setNewBreakStart ] = useState( '12:00' );
    const [ newBreakEnd, setNewBreakEnd ] = useState( '13:00' );
    const [ newBreakLabel, setNewBreakLabel ] = useState( 'Lunch Break' );
    const [ breakSaving, setBreakSaving ] = useState( false );
    const [ breakMessage, setBreakMessage ] = useState( '' );

    // Holidays
    const [ holidays, setHolidays ] = useState<Holiday[]>( [] );
    const [ newHolidayDate, setNewHolidayDate ] = useState( '' );
    const [ newHolidayLabel, setNewHolidayLabel ] = useState( 'Holiday' );
    const [ holidaySaving, setHolidaySaving ] = useState( false );
    const [ holidayMessage, setHolidayMessage ] = useState( '' );

    // ── Data loading ────────────────────────────────────────────────────

    const loadAll = () => {
        setLoading( true );
        Promise.all( [
            fetch( '/wp-json/mitii/v1/staff' ).then( ( r ) => r.json() ),
            fetch( '/wp-json/mitii/v1/services' ).then( ( r ) => r.json() ),
        ] ).then( ( [ staffData, servicesData ] ) => {
            setStaffList( staffData );
            setServices( servicesData );
            setLoading( false );
        } );
    };

    useEffect( () => { loadAll(); }, [] );

    const loadBreakTimes = ( staffId: number ) => {
        fetch( `/wp-json/mitii/v1/staff/${ staffId }/break-times`, {
            headers: { 'X-WP-Nonce': nonce() },
        } )
            .then( ( r ) => r.json() )
            .then( ( data: BreakTime[] ) => setBreakTimes( Array.isArray( data ) ? data : [] ) );
    };

    const loadHolidays = ( staffId: number ) => {
        fetch( `/wp-json/mitii/v1/staff/${ staffId }/holidays`, {
            headers: { 'X-WP-Nonce': nonce() },
        } )
            .then( ( r ) => r.json() )
            .then( ( data: Holiday[] ) => setHolidays( Array.isArray( data ) ? data : [] ) );
    };

    // ── Form helpers ────────────────────────────────────────────────────

    const resetForm = () => {
        setEditingId( null );
        setName( '' ); setEmail( '' ); setBio( '' ); setImageUrl( '' );
        setSelectedServiceIds( [] );
        setWeek( emptyWeek() );
        setScheduleMessage( '' ); setError( '' );
        setBreakTimes( [] ); setBreakMessage( '' );
        setHolidays( [] ); setHolidayMessage( '' );
    };

    const startEdit = ( staff: Staff ) => {
        setEditingId( staff.id );
        setName( staff.name ); setEmail( staff.email );
        setBio( staff.bio ); setImageUrl( staff.image_url || '' );
        setSelectedServiceIds( staff.service_ids || [] );
        setScheduleMessage( '' ); setError( '' );

        fetch( `/wp-json/mitii/v1/staff/${ staff.id }/availability`, {
            headers: { 'X-WP-Nonce': nonce() },
        } )
            .then( ( r ) => r.json() )
            .then( ( rows: AvailabilityRow[] ) => {
                const newWeek = emptyWeek();
                rows.forEach( ( row ) => {
                    newWeek[ row.day_of_week ] = {
                        enabled: true,
                        start: row.start_time.slice( 0, 5 ),
                        end: row.end_time.slice( 0, 5 ),
                    };
                } );
                setWeek( newWeek );
            } );

        loadBreakTimes( staff.id );
        loadHolidays( staff.id );

        // Reset new-break-time form fields
        setNewBreakDay( '' );
        setNewBreakStart( '12:00' );
        setNewBreakEnd( '13:00' );
        setNewBreakLabel( 'Lunch Break' );
        setNewHolidayDate( '' );
        setNewHolidayLabel( 'Holiday' );
    };

    const toggleService = ( serviceId: number ) => {
        setSelectedServiceIds( ( cur ) =>
            cur.includes( serviceId ) ? cur.filter( ( id ) => id !== serviceId ) : [ ...cur, serviceId ]
        );
    };

    const updateDay = ( dayIndex: number, changes: Partial<DaySchedule> ) => {
        setWeek( ( cur ) => cur.map( ( day, i ) => ( i === dayIndex ? { ...day, ...changes } : day ) ) );
    };

    const openMediaPicker = () => {
        if ( ! window.wp?.media ) { setError( 'Media library failed to load. Please refresh.' ); return; }
        const frame = window.wp.media( {
            title: 'Select or Upload Staff Photo',
            button: { text: 'Use this image' },
            multiple: false,
        } );
        frame.on( 'select', () => {
            const attachment = frame.state().get( 'selection' ).first().toJSON();
            setImageUrl( attachment.url );
        } );
        frame.open();
    };

    // ── Working-hours save ──────────────────────────────────────────────

    const buildAvailabilityPayload = () =>
        week
            .map( ( day, index ) => ( { ...day, day_of_week: index } ) )
            .filter( ( day ) => day.enabled )
            .map( ( day ) => ( { day_of_week: day.day_of_week, start_time: day.start, end_time: day.end } ) );

    const saveAvailability = ( staffId: number ) =>
        fetch( `/wp-json/mitii/v1/staff/${ staffId }/availability`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify( { availability: buildAvailabilityPayload() } ),
        } ).then( ( r ) => r.json() );

    const handleSaveSchedule = () => {
        if ( editingId === null ) return;
        setScheduleSaving( true ); setScheduleMessage( '' );
        saveAvailability( editingId ).then( ( data ) => {
            setScheduleSaving( false );
            setScheduleMessage( data.code ? ( data.message || 'Error saving.' ) : 'Working hours saved.' );
        } ).catch( () => { setScheduleSaving( false ); setScheduleMessage( 'Network error.' ); } );
    };

    // ── Staff CRUD ──────────────────────────────────────────────────────

    const handleSubmit = () => {
        if ( ! name ) { setError( 'Name is required.' ); return; }
        if ( selectedServiceIds.length === 0 ) { setError( 'Assign at least one service.' ); return; }
        setError( '' );

        const payload = { name, email, bio, image_url: imageUrl, service_ids: selectedServiceIds };
        const isEditing = editingId !== null;
        const url = isEditing ? `/wp-json/mitii/v1/staff/${ editingId }` : '/wp-json/mitii/v1/staff';

        fetch( url, { method: isEditing ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify( payload ) } )
            .then( ( r ) => r.json() )
            .then( ( data ) => {
                if ( data.code ) { setError( data.message || 'Something went wrong.' ); return; }
                const staffId = isEditing ? editingId! : data.id;
                saveAvailability( staffId ).then( () => { resetForm(); loadAll(); } );
            } )
            .catch( () => setError( 'Network error. Please try again.' ) );
    };

    const handleDelete = ( id: number ) => {
        if ( ! window.confirm( 'Delete this staff member? This cannot be undone.' ) ) return;
        fetch( `/wp-json/mitii/v1/staff/${ id }`, { method: 'DELETE', headers: { 'X-WP-Nonce': nonce() } } )
            .then( ( r ) => r.json() )
            .then( () => loadAll() )
            .catch( () => setError( 'Could not delete staff member.' ) );
    };

    // ── Break-time CRUD ─────────────────────────────────────────────────

    const handleAddBreak = () => {
        if ( ! editingId ) return;
        if ( newBreakStart >= newBreakEnd ) { setBreakMessage( 'Start time must be before end time.' ); return; }

        setBreakSaving( true ); setBreakMessage( '' );

        fetch( `/wp-json/mitii/v1/staff/${ editingId }/break-times`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify( {
                day_of_week: newBreakDay === '' ? null : parseInt( newBreakDay, 10 ),
                start_time: newBreakStart,
                end_time: newBreakEnd,
                label: newBreakLabel || 'Break',
            } ),
        } )
            .then( ( r ) => r.json() )
            .then( ( data ) => {
                setBreakSaving( false );
                if ( data.code ) { setBreakMessage( data.message || 'Error adding break.' ); return; }
                setBreakMessage( 'Break time added.' );
                loadBreakTimes( editingId );
                setNewBreakStart( '12:00' ); setNewBreakEnd( '13:00' );
                setNewBreakLabel( 'Lunch Break' ); setNewBreakDay( '' );
            } )
            .catch( () => { setBreakSaving( false ); setBreakMessage( 'Network error.' ); } );
    };

    const handleDeleteBreak = ( breakId: number ) => {
        if ( ! editingId ) return;
        fetch( `/wp-json/mitii/v1/staff/${ editingId }/break-times/${ breakId }`, {
            method: 'DELETE',
            headers: { 'X-WP-Nonce': nonce() },
        } ).then( () => loadBreakTimes( editingId ) );
    };

    // ── Holiday CRUD ────────────────────────────────────────────────────

    const handleAddHoliday = () => {
        if ( ! editingId ) return;
        if ( ! newHolidayDate ) { setHolidayMessage( 'Please select a date.' ); return; }

        setHolidaySaving( true ); setHolidayMessage( '' );

        fetch( `/wp-json/mitii/v1/staff/${ editingId }/holidays`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify( { holiday_date: newHolidayDate, label: newHolidayLabel || 'Holiday' } ),
        } )
            .then( ( r ) => r.json() )
            .then( ( data ) => {
                setHolidaySaving( false );
                if ( data.code ) { setHolidayMessage( data.message || 'Error adding holiday.' ); return; }
                setHolidayMessage( 'Holiday added.' );
                loadHolidays( editingId );
                setNewHolidayDate( '' ); setNewHolidayLabel( 'Holiday' );
            } )
            .catch( () => { setHolidaySaving( false ); setHolidayMessage( 'Network error.' ); } );
    };

    const handleDeleteHoliday = ( holidayId: number ) => {
        if ( ! editingId ) return;
        fetch( `/wp-json/mitii/v1/staff/${ editingId }/holidays/${ holidayId }`, {
            method: 'DELETE',
            headers: { 'X-WP-Nonce': nonce() },
        } ).then( () => loadHolidays( editingId ) );
    };

    const serviceNameById = ( id: number ) => services.find( ( s ) => Number( s.id ) === id )?.name || 'Unknown';

    const dayLabel = ( dow: number | null ) =>
        dow === null ? 'Every working day' : DAY_NAMES[ dow ];

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <div className="mitii-admin">
            <NavPills active="staff" />
            <h1>Staff</h1>
            <p className="mitii-subtitle">Manage your team and which services each person offers.</p>

            {/* ── Staff form ── */}
            <div className="mitii-card">
                <h2>{ editingId !== null ? 'Edit Staff Member' : 'Add New Staff Member' }</h2>

                <div className="mitii-field">
                    <label>Name</label>
                    <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } />
                </div>
                <div className="mitii-field">
                    <label>Email</label>
                    <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } />
                </div>
                <div className="mitii-field">
                    <label>Bio</label>
                    <textarea value={ bio } onChange={ ( e ) => setBio( e.target.value ) } />
                </div>

                <div className="mitii-field">
                    <label>Photo</label>
                    { imageUrl && (
                        <img src={ imageUrl } alt="Staff preview"
                            style={ { width: '90px', height: '90px', objectFit: 'cover', borderRadius: '50%', marginBottom: '8px', display: 'block' } } />
                    ) }
                    <div className="mitii-btn-row">
                        <button type="button" className="mitii-btn mitii-btn-secondary" onClick={ openMediaPicker }>
                            { imageUrl ? 'Change Photo' : 'Choose Photo' }
                        </button>
                        { imageUrl && (
                            <button type="button" className="mitii-btn mitii-btn-secondary" onClick={ () => setImageUrl( '' ) }>Remove Photo</button>
                        ) }
                    </div>
                </div>

                <div className="mitii-field">
                    <label>Assigned Services</label>
                    { services.length === 0 ? (
                        <p className="mitii-hint">No services yet — add one first on the Services page.</p>
                    ) : (
                        <div className="mitii-checkbox-list">
                            { services.map( ( service ) => (
                                <label key={ service.id }>
                                    <input type="checkbox"
                                        checked={ selectedServiceIds.includes( Number( service.id ) ) }
                                        onChange={ () => toggleService( Number( service.id ) ) } />
                                    { service.name }
                                </label>
                            ) ) }
                        </div>
                    ) }
                </div>

                { error && <p className="mitii-error">{ error }</p> }

                <div className="mitii-btn-row">
                    <button className="mitii-btn mitii-btn-primary" onClick={ handleSubmit }>
                        { editingId !== null ? 'Save Changes' : 'Add Staff Member' }
                    </button>
                    { editingId !== null && (
                        <button className="mitii-btn mitii-btn-secondary" onClick={ resetForm }>Cancel</button>
                    ) }
                </div>
            </div>

            {/* ── Working hours ── */}
            <div className="mitii-card">
                <h2>Working Hours</h2>
                <p className="mitii-hint" style={ { marginBottom: '14px' } }>
                    Set which days and hours this staff member is available. Customers can only book within these windows — minus any break times or holidays you configure below.
                    { editingId === null && ' This gets saved when you click "Add Staff Member" above.' }
                </p>

                { DAY_NAMES.map( ( dayName, index ) => (
                    <div key={ dayName } style={ { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: index < 6 ? '1px solid #eee' : 'none' } }>
                        <label style={ { display: 'flex', alignItems: 'center', gap: '8px', width: '130px', fontWeight: 600, fontSize: '14px' } }>
                            <input type="checkbox" checked={ week[ index ].enabled } onChange={ ( e ) => updateDay( index, { enabled: e.target.checked } ) } />
                            { dayName }
                        </label>
                        { week[ index ].enabled && (
                            <>
                                <input type="time" value={ week[ index ].start } onChange={ ( e ) => updateDay( index, { start: e.target.value } ) } />
                                <span style={ { fontSize: '13px', color: '#888' } }>to</span>
                                <input type="time" value={ week[ index ].end } onChange={ ( e ) => updateDay( index, { end: e.target.value } ) } />
                            </>
                        ) }
                    </div>
                ) ) }

                { scheduleMessage && <p className="mitii-hint" style={ { marginTop: '10px' } }>{ scheduleMessage }</p> }

                { editingId !== null && (
                    <div className="mitii-btn-row" style={ { marginTop: '14px' } }>
                        <button className="mitii-btn mitii-btn-primary" onClick={ handleSaveSchedule } disabled={ scheduleSaving }>
                            { scheduleSaving ? 'Saving…' : 'Save Working Hours' }
                        </button>
                    </div>
                ) }
            </div>

            {/* ── Break times ── (only shown when editing an existing staff member) */}
            { editingId !== null && (
                <div className="mitii-card">
                    <h2>Break Times</h2>
                    <p className="mitii-hint" style={ { marginBottom: '14px' } }>
                        Add recurring daily breaks (e.g. lunch). Slots that overlap a break are hidden from customers.
                        Choose "Every working day" to apply the break to all days, or pick a specific day.
                    </p>

                    {/* Existing breaks */}
                    { breakTimes.length > 0 && (
                        <div className="mitii-table-wrap" style={ { marginBottom: '18px' } }>
                            <table className="mitii-table">
                                <thead>
                                    <tr>
                                        <th>Label</th>
                                        <th>Day</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { breakTimes.map( ( brk ) => (
                                        <tr key={ brk.id }>
                                            <td>{ brk.label }</td>
                                            <td>{ dayLabel( brk.day_of_week ) }</td>
                                            <td>{ brk.start_time.slice( 0, 5 ) }</td>
                                            <td>{ brk.end_time.slice( 0, 5 ) }</td>
                                            <td>
                                                <button className="mitii-btn mitii-btn-danger mitii-btn-sm" onClick={ () => handleDeleteBreak( brk.id ) }>
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ) ) }
                                </tbody>
                            </table>
                        </div>
                    ) }

                    { breakTimes.length === 0 && (
                        <p className="mitii-hint" style={ { marginBottom: '14px', fontStyle: 'italic' } }>No break times configured yet.</p>
                    ) }

                    {/* Add new break */}
                    <div style={ { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } }>
                        <div className="mitii-field" style={ { margin: 0, minWidth: '140px' } }>
                            <label>Label</label>
                            <input type="text" value={ newBreakLabel } onChange={ ( e ) => setNewBreakLabel( e.target.value ) } placeholder="e.g. Lunch Break" />
                        </div>

                        <div className="mitii-field" style={ { margin: 0, minWidth: '160px' } }>
                            <label>Applies to</label>
                            <select value={ newBreakDay } onChange={ ( e ) => setNewBreakDay( e.target.value ) }>
                                <option value="">Every working day</option>
                                { DAY_NAMES.map( ( d, i ) => (
                                    <option key={ i } value={ String( i ) }>{ d }</option>
                                ) ) }
                            </select>
                        </div>

                        <div className="mitii-field" style={ { margin: 0 } }>
                            <label>From</label>
                            <input type="time" value={ newBreakStart } onChange={ ( e ) => setNewBreakStart( e.target.value ) } />
                        </div>

                        <div className="mitii-field" style={ { margin: 0 } }>
                            <label>To</label>
                            <input type="time" value={ newBreakEnd } onChange={ ( e ) => setNewBreakEnd( e.target.value ) } />
                        </div>

                        <button className="mitii-btn mitii-btn-primary" onClick={ handleAddBreak } disabled={ breakSaving }
                            style={ { alignSelf: 'flex-end' } }>
                            { breakSaving ? 'Adding…' : '+ Add Break' }
                        </button>
                    </div>

                    { breakMessage && (
                        <p className="mitii-hint" style={ { marginTop: '10px', color: breakMessage.startsWith( 'Break time added' ) ? '#2e7d32' : '#c62828' } }>
                            { breakMessage }
                        </p>
                    ) }
                </div>
            ) }

            {/* ── Holidays ── (only shown when editing an existing staff member) */}
            { editingId !== null && (
                <div className="mitii-card">
                    <h2>Holidays &amp; Days Off</h2>
                    <p className="mitii-hint" style={ { marginBottom: '14px' } }>
                        Mark specific dates when this staff member is entirely unavailable. No booking slots will be shown to customers on these dates.
                    </p>

                    {/* Existing holidays */}
                    { holidays.length > 0 && (
                        <div className="mitii-table-wrap" style={ { marginBottom: '18px' } }>
                            <table className="mitii-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Label</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { holidays.map( ( h ) => (
                                        <tr key={ h.id }>
                                            <td>{ h.holiday_date }</td>
                                            <td>{ h.label }</td>
                                            <td>
                                                <button className="mitii-btn mitii-btn-danger mitii-btn-sm" onClick={ () => handleDeleteHoliday( h.id ) }>
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ) ) }
                                </tbody>
                            </table>
                        </div>
                    ) }

                    { holidays.length === 0 && (
                        <p className="mitii-hint" style={ { marginBottom: '14px', fontStyle: 'italic' } }>No holidays configured yet.</p>
                    ) }

                    {/* Add new holiday */}
                    <div style={ { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } }>
                        <div className="mitii-field" style={ { margin: 0 } }>
                            <label>Date</label>
                            <input type="date" value={ newHolidayDate } onChange={ ( e ) => setNewHolidayDate( e.target.value ) }
                                min={ new Date().toISOString().slice( 0, 10 ) } />
                        </div>

                        <div className="mitii-field" style={ { margin: 0, minWidth: '180px' } }>
                            <label>Label</label>
                            <input type="text" value={ newHolidayLabel } onChange={ ( e ) => setNewHolidayLabel( e.target.value ) } placeholder="e.g. Public Holiday" />
                        </div>

                        <button className="mitii-btn mitii-btn-primary" onClick={ handleAddHoliday } disabled={ holidaySaving }
                            style={ { alignSelf: 'flex-end' } }>
                            { holidaySaving ? 'Adding…' : '+ Add Holiday' }
                        </button>
                    </div>

                    { holidayMessage && (
                        <p className="mitii-hint" style={ { marginTop: '10px', color: holidayMessage.startsWith( 'Holiday added' ) ? '#2e7d32' : '#c62828' } }>
                            { holidayMessage }
                        </p>
                    ) }
                </div>
            ) }

            {/* ── Staff list ── */}
            <h2>Existing Staff</h2>

            { loading && <p className="mitii-subtitle">Loading…</p> }

            { ! loading && staffList.length === 0 && (
                <div className="mitii-empty-state">No staff members yet — add your first one above.</div>
            ) }

            { ! loading && staffList.length > 0 && (
                <div className="mitii-table-wrap">
                    <table className="mitii-table">
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Services Offered</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            { staffList.map( ( s ) => (
                                <tr key={ s.id }>
                                    <td>
                                        { s.image_url ? (
                                            <img src={ s.image_url } alt={ s.name }
                                                style={ { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%' } } />
                                        ) : (
                                            <span style={ { color: '#999', fontSize: '12px' } }>No photo</span>
                                        ) }
                                    </td>
                                    <td>{ s.name }</td>
                                    <td>{ s.email }</td>
                                    <td>
                                        { ( s.service_ids || [] ).length === 0 ? (
                                            <span style={ { color: '#999', fontSize: '13px' } }>None assigned</span>
                                        ) : (
                                            <div style={ { display: 'flex', flexWrap: 'wrap', gap: '4px' } }>
                                                { ( s.service_ids || [] ).map( ( id ) => (
                                                    <span key={ id } className="mitii-badge mitii-badge-confirmed" style={ { fontSize: '11px' } }>
                                                        { serviceNameById( id ) }
                                                    </span>
                                                ) ) }
                                            </div>
                                        ) }
                                    </td>
                                    <td>
                                        <div className="mitii-btn-row">
                                            <button className="mitii-btn mitii-btn-secondary mitii-btn-sm" onClick={ () => startEdit( s ) }>Edit</button>
                                            <button className="mitii-btn mitii-btn-danger mitii-btn-sm" onClick={ () => handleDelete( s.id ) }>Delete</button>
                                        </div>
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