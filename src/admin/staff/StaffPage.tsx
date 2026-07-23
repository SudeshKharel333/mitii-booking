import { useEffect, useState } from 'react';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

type Staff = {
    id: number;
    name: string;
    email: string;
    bio: string;
    service_ids: number[];
};

type Service = {
    id: number;
    name: string;
};

export default function StaffPage() {
    const [ staffList, setStaffList ] = useState<Staff[]>( [] );
    const [ services, setServices ] = useState<Service[]>( [] );
    const [ loading, setLoading ] = useState( true );

    const [ editingId, setEditingId ] = useState<number | null>( null );
    const [ name, setName ] = useState( '' );
    const [ email, setEmail ] = useState( '' );
    const [ bio, setBio ] = useState( '' );
    const [ selectedServiceIds, setSelectedServiceIds ] = useState<number[]>( [] );
    const [ error, setError ] = useState( '' );

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
        setSelectedServiceIds( [] );
        setError( '' );
    };

    const startEdit = ( staff: Staff ) => {
        setEditingId( staff.id );
        setName( staff.name );
        setEmail( staff.email );
        setBio( staff.bio );
        setSelectedServiceIds( staff.service_ids || [] );
    };

    const toggleService = ( serviceId: number ) => {
        setSelectedServiceIds( ( current ) =>
            current.includes( serviceId )
                ? current.filter( ( id ) => id !== serviceId )
                : [ ...current, serviceId ]
        );
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

        const payload = { name, email, bio, service_ids: selectedServiceIds };
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
                } else {
                    resetForm();
                    loadAll();
                }
            } )
            .catch( () => setError( 'Network error. Please try again.' ) );
    };

    const handleDelete = ( id: number ) => {
        if ( ! window.confirm( 'Delete this staff member? This cannot be undone.' ) ) return;

        fetch( `/wp-json/mitii/v1/staff/${ id }`, {
            method: 'DELETE',
    credentials: 'same-origin',
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
                                <th>Name</th>
                                <th>Email</th>
                                <th>Services</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            { staffList.map( ( s ) => (
                                <tr key={ s.id }>
                                    <td>{ s.name }</td>
                                    <td>{ s.email }</td>
                                    <td>
                                        { ( s.service_ids || [] ).map( ( id ) => serviceNameById( id ) ).join( ', ' ) || '—' }
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