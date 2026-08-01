import { useEffect, useState } from 'react';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

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

const DAY_NAMES = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

const emptyWeek = (): DaySchedule[] =>
    DAY_NAMES.map( () => ( { enabled: false, start: '09:00', end: '18:00' } ) );

declare global {
    interface Window {
        wp: any;
    }
}

export default function StaffPage() {
    const [ staffList, setStaffList ] = useState<Staff[]>( [] );
    const [ services, setServices ] = useState<Service[]>( [] );
    const [ loading, setLoading ] = useState( true );

    const [ editingId, setEditingId ] = useState<number | null>( null );
    const [ name, setName ] = useState( '' );
    const [ email, setEmail ] = useState( '' );
    const [ bio, setBio ] = useState( '' );
    const [ imageUrl, setImageUrl ] = useState( '' );
    const [ selectedServiceIds, setSelectedServiceIds ] = useState<number[]>( [] );
    const [ error, setError ] = useState( '' );

    const [ week, setWeek ] = useState<DaySchedule[]>( emptyWeek() );
    const [ scheduleMessage, setScheduleMessage ] = useState( '' );
    const [ scheduleSaving, setScheduleSaving ] = useState( false );

    const loadAll = () => {
        setLoading( true );
        Promise.all( [
            fetch( '/wp-json/mitii/v1/staff' ).then( ( res ) => res.json() ),
            fetch( '/wp-json/mitii/v1/services' ).then( ( res ) => res.json() ),
        ] ).then( ( [ staffData, servicesData ] ) => {
            setStaffList( staffData );
            setServices( servicesData );
            setLoading( false );
        } );
    };

    useEffect( () => {
        loadAll();
    }, [] );

    const resetForm = () => {
        setEditingId( null );
        setName( '' );
        setEmail( '' );
        setBio( '' );
        setImageUrl( '' );
        setSelectedServiceIds( [] );
        setWeek( emptyWeek() );
        setScheduleMessage( '' );
        setError( '' );
    };

    const startEdit = ( staff: Staff ) => {
        setEditingId( staff.id );
        setName( staff.name );
        setEmail( staff.email );
        setBio( staff.bio );
        setImageUrl( staff.image_url || '' );
        setSelectedServiceIds( staff.service_ids || [] );
        setScheduleMessage( '' );

        fetch( `/wp-json/mitii/v1/staff/${ staff.id }/availability`, {
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => res.json() )
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
    };

    const toggleService = ( serviceId: number ) => {
        setSelectedServiceIds( ( current ) =>
            current.includes( serviceId )
                ? current.filter( ( id ) => id !== serviceId )
                : [ ...current, serviceId ]
        );
    };

    const updateDay = ( dayIndex: number, changes: Partial<DaySchedule> ) => {
        setWeek( ( current ) =>
            current.map( ( day, i ) => ( i === dayIndex ? { ...day, ...changes } : day ) )
        );
    };

    const openMediaPicker = () => {
        if ( ! window.wp || ! window.wp.media ) {
            setError( 'Media library failed to load. Please refresh the page.' );
            return;
        }

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

    const buildAvailabilityPayload = () =>
        week
            .map( ( day, index ) => ( { ...day, day_of_week: index } ) )
            .filter( ( day ) => day.enabled )
            .map( ( day ) => ( {
                day_of_week: day.day_of_week,
                start_time: day.start,
                end_time: day.end,
            } ) );

    const saveAvailability = ( staffId: number ) => {
        return fetch( `/wp-json/mitii/v1/staff/${ staffId }/availability`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce,
            },
            body: JSON.stringify( { availability: buildAvailabilityPayload() } ),
        } ).then( ( res ) => res.json() );
    };

    const handleSubmit = () => {
        if ( ! name ) {
            setError( 'Name is required.' );
            return;
        }
        if ( selectedServiceIds.length === 0 ) {
            setError( 'Please assign at least one service to this staff member.' );
            return;
        }
        setError( '' );

        const payload = { name, email, bio, image_url: imageUrl, service_ids: selectedServiceIds };
        const isEditing = editingId !== null;
        const url = isEditing ? `/wp-json/mitii/v1/staff/${ editingId }` : '/wp-json/mitii/v1/staff';
        const method = isEditing ? 'PUT' : 'POST';

        fetch( url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce,
            },
            body: JSON.stringify( payload ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                if ( data.code ) {
                    setError( data.message || 'Something went wrong.' );
                    return;
                }

                // Whether this was a brand-new staff member (data.id) or an
                // existing one being edited (editingId), save their working
                // hours right along with the rest of the form.
                const staffId = isEditing ? editingId! : data.id;

                saveAvailability( staffId ).then( () => {
                    resetForm();
                    loadAll();
                } );
            } )
            .catch( () => setError( 'Network error. Please try again.' ) );
    };

    const handleSaveSchedule = () => {
        if ( editingId === null ) return;

        setScheduleSaving( true );
        setScheduleMessage( '' );

        saveAvailability( editingId )
            .then( ( data ) => {
                setScheduleSaving( false );
                if ( data.code ) {
                    setScheduleMessage( data.message || 'Could not save schedule.' );
                } else {
                    setScheduleMessage( 'Working hours saved.' );
                }
            } )
            .catch( () => {
                setScheduleSaving( false );
                setScheduleMessage( 'Network error. Please try again.' );
            } );
    };

    const handleDelete = ( id: number ) => {
        if ( ! window.confirm( 'Delete this staff member? This cannot be undone.' ) ) return;

        fetch( `/wp-json/mitii/v1/staff/${ id }`, {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce,
            },
        } )
            .then( ( res ) => res.json() )
            .then( () => loadAll() )
            .catch( () => setError( 'Could not delete staff member.' ) );
    };

    const serviceNameById = ( id: number ) => services.find( ( s ) => s.id === id )?.name || 'Unknown';

    return (
        <div className="mitii-admin">
            <h1>Staff</h1>
            <p className="mitii-subtitle">Manage your team and which services each person offers.</p>

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
                        <img
                            src={ imageUrl }
                            alt="Staff preview"
                            style={ {
                                width: '90px',
                                height: '90px',
                                objectFit: 'cover',
                                borderRadius: '50%',
                                marginBottom: '8px',
                                display: 'block',
                            } }
                        />
                    ) }
                    <div className="mitii-btn-row">
                        <button type="button" className="mitii-btn mitii-btn-secondary" onClick={ openMediaPicker }>
                            { imageUrl ? 'Change Photo' : 'Choose Photo' }
                        </button>
                        { imageUrl && (
                            <button type="button" className="mitii-btn mitii-btn-secondary" onClick={ () => setImageUrl( '' ) }>
                                Remove Photo
                            </button>
                        ) }
                    </div>
                </div>

                <div className="mitii-field">
                    <label>Assigned Services</label>
                    { services.length === 0 ? (
                        <p className="mitii-hint">No services exist yet — add one first on the Services page.</p>
                    ) : (
                        <div className="mitii-checkbox-list">
                            { services.map( ( service ) => (
                                <label key={ service.id }>
                                    <input
                                        type="checkbox"
                                        checked={ selectedServiceIds.includes( service.id ) }
                                        onChange={ () => toggleService( service.id ) }
                                    />
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

            <div className="mitii-card">
                <h2>Working Hours</h2>
                <p className="mitii-hint" style={ { marginBottom: '14px' } }>
                    Turn on the days this staff member works, and set their hours. Customers will
                    only be able to book slots inside these hours — and only ones not already booked.
                    { editingId === null && ' This gets saved together when you click "Add Staff Member" below.' }
                </p>

                { DAY_NAMES.map( ( dayName, index ) => (
                    <div
                        key={ dayName }
                        style={ {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 0',
                            borderBottom: index < 6 ? '1px solid #eee' : 'none',
                        } }
                    >
                        <label style={ { display: 'flex', alignItems: 'center', gap: '8px', width: '130px', fontWeight: 600, fontSize: '14px' } }>
                            <input
                                type="checkbox"
                                checked={ week[ index ].enabled }
                                onChange={ ( e ) => updateDay( index, { enabled: e.target.checked } ) }
                            />
                            { dayName }
                        </label>

                        { week[ index ].enabled && (
                            <>
                                <input
                                    type="time"
                                    value={ week[ index ].start }
                                    onChange={ ( e ) => updateDay( index, { start: e.target.value } ) }
                                />
                                <span style={ { fontSize: '13px', color: '#888' } }>to</span>
                                <input
                                    type="time"
                                    value={ week[ index ].end }
                                    onChange={ ( e ) => updateDay( index, { end: e.target.value } ) }
                                />
                            </>
                        ) }
                    </div>
                ) ) }

                { scheduleMessage && <p className="mitii-hint" style={ { marginTop: '10px' } }>{ scheduleMessage }</p> }

                { editingId !== null && (
                    <div className="mitii-btn-row" style={ { marginTop: '14px' } }>
                        <button className="mitii-btn mitii-btn-primary" onClick={ handleSaveSchedule } disabled={ scheduleSaving }>
                            { scheduleSaving ? 'Saving...' : 'Save Working Hours' }
                        </button>
                    </div>
                ) }
            </div>

            <h2>Existing Staff</h2>

            { loading && <p className="mitii-subtitle">Loading...</p> }

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
                                            <img
                                                src={ s.image_url }
                                                alt={ s.name }
                                                style={ { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%' } }
                                            />
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
                                                    <span
                                                        key={ id }
                                                        className="mitii-badge mitii-badge-confirmed"
                                                        style={ { fontSize: '11px' } }
                                                    >
                                                        { serviceNameById( id ) }
                                                    </span>
                                                ) ) }
                                            </div>
                                        ) }
                                    </td>
                                    <td>
                                        <div className="mitii-btn-row">
                                            <button
                                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                                onClick={ () => startEdit( s ) }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="mitii-btn mitii-btn-danger mitii-btn-sm"
                                                onClick={ () => handleDelete( s.id ) }
                                            >
                                                Delete
                                            </button>
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