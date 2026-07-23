import { useEffect, useState } from 'react';

type Service = {
    id: number;
    name: string;
    duration_minutes: number;
    price: string;
};

export default function ServicesPage() {
    const [ services, setServices ] = useState<Service[]>( [] );
    const [ loading, setLoading ] = useState( true );

    // Form fields — used for both "add new" and "edit existing"
    const [ editingId, setEditingId ] = useState<number | null>( null );
    const [ name, setName ] = useState( '' );
    const [ duration, setDuration ] = useState( '30' );
    const [ price, setPrice ] = useState( '' );
    const [ error, setError ] = useState( '' );

    const loadServices = () => {
        setLoading( true );
        fetch( '/wp-json/mitii/v1/services' )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setServices( data );
                setLoading( false );
            } );
    };

    useEffect( () => {
        loadServices();
    }, [] );

    const resetForm = () => {
        setEditingId( null );
        setName( '' );
        setDuration( '30' );
        setPrice( '' );
        setError( '' );
    };

    const startEdit = ( service: Service ) => {
        setEditingId( service.id );
        setName( service.name );
        setDuration( String( service.duration_minutes ) );
        setPrice( String( service.price ) );
    };

    const handleSubmit = () => {
        if ( ! name || ! price ) {
            setError( 'Name and price are required.' );
            return;
        }
        setError( '' );

        const payload = {
            name,
            duration_minutes: Number( duration ),
            price: Number( price ),
        };

        const isEditing = editingId !== null;
        const url = isEditing
            ? `/wp-json/mitii/v1/services/${ editingId }`
            : '/wp-json/mitii/v1/services';
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
                    loadServices();
                }
            } )
            .catch( () => setError( 'Network error. Please try again.' ) );
    };

    const handleDelete = ( id: number ) => {
        if ( ! window.confirm( 'Delete this service? This cannot be undone.' ) ) {
            return;
        }

        fetch( `/wp-json/mitii/v1/services/${ id }`, {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce,
            },
        } )
            .then( ( res ) => res.json() )
            .then( () => loadServices() )
            .catch( () => setError( 'Could not delete service.' ) );
    };

    return (
        <div    className="mitii-admin">
            <h2>{ editingId !== null ? 'Edit Service' : 'Add New Service' }</h2>

            <div style={ { marginBottom: '20px', padding: '14px', background: '#f5f5f0', maxWidth: '400px' } }>
                <div>
                    <label>Name: <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } /></label>
                </div>
                <div style={ { marginTop: '8px' } }>
                    <label>Duration (minutes): <input type="number" value={ duration } onChange={ ( e ) => setDuration( e.target.value ) } /></label>
                </div>
                <div style={ { marginTop: '8px' } }>
                    <label>Price ($): <input type="number" step="0.01" value={ price } onChange={ ( e ) => setPrice( e.target.value ) } /></label>
                </div>

                { error && <p style={ { color: 'red' } }>{ error }</p> }

                <div style={ { marginTop: '10px' } }>
                    <button onClick={ handleSubmit }>{ editingId !== null ? 'Save Changes' : 'Add Service' }</button>
                    { editingId !== null && <button onClick={ resetForm } style={ { marginLeft: '8px' } }>Cancel</button> }
                </div>
            </div>

            <h2>Existing Services</h2>
            { loading && <p>Loading...</p> }
            { ! loading && services.length === 0 && <p>No services yet.</p> }
            { ! loading && services.length > 0 && (
                <table style={ { borderCollapse: 'collapse', width: '100%', maxWidth: '600px' } }>
                    <thead>
                        <tr>
                            <th style={ cellStyle }>Name</th>
                            <th style={ cellStyle }>Duration</th>
                            <th style={ cellStyle }>Price</th>
                            <th style={ cellStyle }>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        { services.map( ( s ) => (
                            <tr key={ s.id }>
                                <td style={ cellStyle }>{ s.name }</td>
                                <td style={ cellStyle }>{ s.duration_minutes } min</td>
                                <td style={ cellStyle }>${ s.price }</td>
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