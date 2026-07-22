import { useEffect, useState } from 'react';

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
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => res.json() )
            .then( () => loadAll() )
            .catch( () => setError( 'Could not delete staff member.' ) );
    };

    const serviceNameById = ( id: number ) => services.find( ( s ) => s.id === id )?.name || 'Unknown';

    return (
        <div>
            <h2>{ editingId !== null ? 'Edit Staff Member' : 'Add New Staff Member' }</h2>

            <div style={ { marginBottom: '20px', padding: '14px', background: '#f5f5f0', maxWidth: '420px' } }>
                <div>
                    <label>Name: <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } /></label>
                </div>
                <div style={ { marginTop: '8px' } }>
                    <label>Email: <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } /></label>
                </div>
                <div style={ { marginTop: '8px' } }>
                    <label>Bio: <textarea value={ bio } onChange={ ( e ) => setBio( e.target.value ) } /></label>
                </div>

                <div style={ { marginTop: '12px' } }>
                    <strong>Assigned Services:</strong>
                    { services.length === 0 && <p>No services exist yet — add one first on the Services page.</p> }
                    { services.map( ( service ) => (
                        <div key={ service.id }>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={ selectedServiceIds.includes( service.id ) }
                                    onChange={ () => toggleService( service.id ) }
                                />
                                { ' ' }{ service.name }
                            </label>
                        </div>
                    ) ) }
                </div>

                { error && <p style={ { color: 'red' } }>{ error }</p> }

                <div style={ { marginTop: '10px' } }>
                    <button onClick={ handleSubmit }>{ editingId !== null ? 'Save Changes' : 'Add Staff Member' }</button>
                    { editingId !== null && <button onClick={ resetForm } style={ { marginLeft: '8px' } }>Cancel</button> }
                </div>
            </div>

            <h2>Existing Staff</h2>
            { loading && <p>Loading...</p> }
            { ! loading && staffList.length === 0 && <p>No staff members yet.</p> }
            { ! loading && staffList.length > 0 && (
                <table style={ { borderCollapse: 'collapse', width: '100%', maxWidth: '700px' } }>
                    <thead>
                        <tr>
                            <th style={ cellStyle }>Name</th>
                            <th style={ cellStyle }>Email</th>
                            <th style={ cellStyle }>Services</th>
                            <th style={ cellStyle }>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        { staffList.map( ( s ) => (
                            <tr key={ s.id }>
                                <td style={ cellStyle }>{ s.name }</td>
                                <td style={ cellStyle }>{ s.email }</td>
                                <td style={ cellStyle }>
                                    { ( s.service_ids || [] ).map( ( id ) => serviceNameById( id ) ).join( ', ' ) || '—' }
                                </td>
                                <td style={ cellStyle }>
                                    <button onClick={ () => startEdit( s ) }>Edit</button>
                                    <button onClick={ () => handleDelete( s.id ) } style={ { marginLeft: '6px' } }>Delete</button>
                                </td>
                            </tr>
                        ) ) }
                    </tbody>
                </table>
            ) }
        </div>
    );
}

const cellStyle = { border: '1px solid #ccc', padding: '8px', textAlign: 'left' as const };