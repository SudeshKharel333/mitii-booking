import { useEffect, useState } from 'react';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

type Service = {
    id: number;
    name: string;
    duration_minutes: number;
    padding_before_minutes: number;
    padding_after_minutes: number;
    price: string;
    image_url: string;
};

declare global {
    interface Window {
        wp: any;
    }
}

export default function ServicesPage() {
    const [ services, setServices ]         = useState<Service[]>( [] );
    const [ loading, setLoading ]           = useState( true );
    const [ editingId, setEditingId ]       = useState<number | null>( null );
    const [ name, setName ]                 = useState( '' );
    const [ duration, setDuration ]         = useState( '30' );
    const [ paddingBefore, setPaddingBefore ] = useState( '0' );
    const [ paddingAfter, setPaddingAfter ]   = useState( '0' );
    const [ price, setPrice ]               = useState( '' );
    const [ imageUrl, setImageUrl ]         = useState( '' );
    const [ error, setError ]               = useState( '' );

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
        setPaddingBefore( '0' );
        setPaddingAfter( '0' );
        setPrice( '' );
        setImageUrl( '' );
        setError( '' );
    };

    const startEdit = ( service: Service ) => {
        setEditingId( service.id );
        setName( service.name );
        setDuration( String( service.duration_minutes ) );
        setPaddingBefore( String( service.padding_before_minutes ) );
        setPaddingAfter( String( service.padding_after_minutes ) );
        setPrice( String( service.price ) );
        setImageUrl( service.image_url || '' );
    };

    const openMediaPicker = () => {
        if ( ! window.wp || ! window.wp.media ) {
            setError( 'Media library failed to load. Please refresh the page.' );
            return;
        }

        const frame = window.wp.media( {
            title: 'Select or Upload Service Image',
            button: { text: 'Use this image' },
            multiple: false,
        } );

        frame.on( 'select', () => {
            const attachment = frame.state().get( 'selection' ).first().toJSON();
            setImageUrl( attachment.url );
        } );

        frame.open();
    };

    const handleSubmit = () => {
        if ( ! name || ! price ) {
            setError( 'Name and price are required.' );
            return;
        }
        setError( '' );

        const payload = {
            name,
            duration_minutes:       Number( duration ),
            padding_before_minutes: Number( paddingBefore ),
            padding_after_minutes:  Number( paddingAfter ),
            price:                  Number( price ),
            image_url:              imageUrl,
        };

        const isEditing = editingId !== null;
        const url    = isEditing ? `/wp-json/mitii/v1/services/${ editingId }` : '/wp-json/mitii/v1/services';
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
        if ( ! window.confirm( 'Delete this service? This cannot be undone.' ) ) return;

        fetch( `/wp-json/mitii/v1/services/${ id }`, {
            method: 'DELETE',
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => res.json() )
            .then( () => loadServices() )
            .catch( () => setError( 'Could not delete service.' ) );
    };

    return (
        <div className="mitii-admin">
            <h1>Services</h1>
            <p className="mitii-subtitle">Manage what customers can book.</p>

            <div className="mitii-card">
                <h2>{ editingId !== null ? 'Edit Service' : 'Add New Service' }</h2>

                {/* Name */}
                <div className="mitii-field">
                    <label>Name</label>
                    <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } />
                </div>

                {/* Duration + Price */}
                <div className="mitii-two-col">
                    <div className="mitii-field">
                        <label>Duration (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            value={ duration }
                            onChange={ ( e ) => setDuration( e.target.value ) }
                        />
                        <p className="mitii-hint">How long the service takes</p>
                    </div>
                    <div className="mitii-field">
                        <label>Price ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ price }
                            onChange={ ( e ) => setPrice( e.target.value ) }
                        />
                    </div>
                </div>

                {/* Gap before + Gap after */}
                <div className="mitii-two-col">
                    <div className="mitii-field">
                        <label>Gap Before (minutes)</label>
                        <input
                            type="number"
                            min="0"
                            value={ paddingBefore }
                            onChange={ ( e ) => setPaddingBefore( e.target.value ) }
                        />
                        <p className="mitii-hint">Prep time before service starts (blocks earlier slots)</p>
                    </div>
                    <div className="mitii-field">
                        <label>Gap After (minutes)</label>
                        <input
                            type="number"
                            min="0"
                            value={ paddingAfter }
                            onChange={ ( e ) => setPaddingAfter( e.target.value ) }
                        />
                        <p className="mitii-hint">Cleanup / travel time after service ends</p>
                    </div>
                </div>

                {/* Image */}
                <div className="mitii-field">
                    <label>Service Image</label>
                    <div className="mitii-upload-zone">
                        { imageUrl && (
                            <img
                                src={ imageUrl }
                                alt="Service preview"
                                className="mitii-upload-preview"
                                style={ { width: '160px', height: '110px', borderRadius: '8px' } }
                            />
                        ) }
                        <div className="mitii-btn-row" style={ { justifyContent: 'center' } }>
                            <button type="button" className="mitii-btn mitii-btn-secondary" onClick={ openMediaPicker }>
                                { imageUrl ? 'Change Image' : 'Choose Image' }
                            </button>
                            { imageUrl && (
                                <button type="button" className="mitii-btn mitii-btn-secondary" onClick={ () => setImageUrl( '' ) }>
                                    Remove
                                </button>
                            ) }
                        </div>
                        { ! imageUrl && <p className="mitii-hint">No image selected yet</p> }
                    </div>
                </div>

                { error && <p className="mitii-error">{ error }</p> }

                <div className="mitii-btn-row">
                    <button className="mitii-btn mitii-btn-primary" onClick={ handleSubmit }>
                        { editingId !== null ? 'Save Changes' : 'Add Service' }
                    </button>
                    { editingId !== null && (
                        <button className="mitii-btn mitii-btn-secondary" onClick={ resetForm }>Cancel</button>
                    ) }
                </div>
            </div>

            {/* Services list */}
            <h2>Existing Services</h2>
            { loading && <p className="mitii-subtitle">Loading...</p> }
            { ! loading && services.length === 0 && (
                <div className="mitii-empty-state">No services yet — add your first one above.</div>
            ) }
            { ! loading && services.length > 0 && (
                <div className="mitii-table-wrap">
                    <table className="mitii-table">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Duration</th>
                                <th>Gap Before</th>
                                <th>Gap After</th>
                                <th>Price</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            { services.map( ( s ) => (
                                <tr key={ s.id }>
                                    <td>
                                        { s.image_url ? (
                                            <img
                                                src={ s.image_url }
                                                alt={ s.name }
                                                style={ { width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' } }
                                            />
                                        ) : (
                                            <span className="mitii-hint">No image</span>
                                        ) }
                                    </td>
                                    <td>{ s.name }</td>
                                    <td>{ s.duration_minutes } min</td>
                                    <td>{ s.padding_before_minutes > 0 ? `${ s.padding_before_minutes } min` : '—' }</td>
                                    <td>{ s.padding_after_minutes  > 0 ? `${ s.padding_after_minutes  } min` : '—' }</td>
                                    <td>${ s.price }</td>
                                    <td>
                                        <div className="mitii-btn-row">
                                            <button
                                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                                onClick={ () => startEdit( s ) }
                                            >Edit</button>
                                            <button
                                                className="mitii-btn mitii-btn-danger mitii-btn-sm"
                                                onClick={ () => handleDelete( s.id ) }
                                            >Delete</button>
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