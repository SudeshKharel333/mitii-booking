import { useEffect, useState } from 'react';

type Holiday = {
    id: number;
    holiday_date: string;
    name: string;
    created_at: string;
};

declare global {
    interface Window {
        mitiiSettingsData?: {
            restUrl: string;
            nonce: string;
        };
    }
}

export default function HolidaysManager() {
    const [ holidays, setHolidays ] = useState<Holiday[]>( [] );
    const [ loading, setLoading ] = useState( true );
    const [ saving, setSaving ] = useState( false );
    const [ date, setDate ] = useState( '' );
    const [ name, setName ] = useState( '' );
    const [ error, setError ] = useState( '' );
    const [ success, setSuccess ] = useState( '' );

    const data = window.mitiiSettingsData || { restUrl: '', nonce: '' };
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-WP-Nonce': data.nonce,
    };

    const fetchHolidays = () => {
        setLoading( true );
        fetch( `${ data.restUrl }/holidays`, { headers, credentials: 'same-origin' } )
            .then( r => r.json() )
            .then( ( d: Holiday[] ) => {
                setHolidays( d );
                setLoading( false );
            } )
            .catch( () => {
                setError( 'Failed to load holidays.' );
                setLoading( false );
            } );
    };

    useEffect( () => {
        fetchHolidays();
    }, [] );

    const handleAdd = ( e: React.FormEvent ) => {
        e.preventDefault();
        if ( ! date ) return;
        setSaving( true );
        setError( '' );
        setSuccess( '' );

        fetch( `${ data.restUrl }/holidays`, {
            method: 'POST',
            headers,
            credentials: 'same-origin',
            body: JSON.stringify( { holiday_date: date, name } ),
        } )
            .then( async r => {
                if ( ! r.ok ) {
                    const err = await r.json();
                    throw new Error( err.message || 'Failed to add holiday.' );
                }
                return r.json();
            } )
            .then( () => {
                setSuccess( 'Holiday added successfully.' );
                setDate( '' );
                setName( '' );
                fetchHolidays();
            } )
            .catch( ( err: Error ) => {
                setError( err.message );
            } )
            .finally( () => setSaving( false ) );
    };

    const handleDelete = ( id: number ) => {
        if ( ! confirm( 'Remove this holiday?' ) ) return;
        fetch( `${ data.restUrl }/holidays/${ id }`, {
            method: 'DELETE',
            headers,
            credentials: 'same-origin',
        } )
            .then( r => {
                if ( r.ok ) fetchHolidays();
            } );
    };

    const formatDate = ( d: string ) => {
        const obj = new Date( d + 'T00:00:00' );
        return obj.toLocaleDateString( undefined, {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        } );
    };

    return (
        <div>
            <h2 style={ { margin: '0 0 16px', fontSize: 20 } }>🌴 Global Holidays</h2>
            <p style={ { margin: '0 0 20px', color: '#646970', fontSize: 13 } }>
                Mark dates when the entire shop is closed. These apply to all staff members automatically.
            </p>

            {/* Add form */}
            <form
                onSubmit={ handleAdd }
                style={ {
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-end',
                    background: '#f0f6fc',
                    padding: '16px 18px',
                    borderRadius: 8,
                    marginBottom: 24,
                    flexWrap: 'wrap',
                } }
            >
                <div style={ { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' } }>
                    <label style={ { fontSize: 12, fontWeight: 600, color: '#1d2327' } }>Date</label>
                    <input
                        type="date"
                        required
                        value={ date }
                        onChange={ e => setDate( e.target.value ) }
                        style={ {
                            padding: '6px 10px',
                            borderRadius: 4,
                            border: '1px solid #c5c5c5',
                            fontSize: 13,
                        } }
                    />
                </div>
                <div style={ { display: 'flex', flexDirection: 'column', gap: 4, flex: '2 1 240px' } }>
                    <label style={ { fontSize: 12, fontWeight: 600, color: '#1d2327' } }>Name (optional)</label>
                    <input
                        type="text"
                        placeholder="e.g. Christmas, Staff Training Day"
                        value={ name }
                        onChange={ e => setName( e.target.value ) }
                        style={ {
                            padding: '6px 10px',
                            borderRadius: 4,
                            border: '1px solid #c5c5c5',
                            fontSize: 13,
                        } }
                    />
                </div>
                <button
                    type="submit"
                    disabled={ saving }
                    className="button button-primary"
                    style={ { height: 34, fontSize: 13 } }
                >
                    { saving ? 'Adding…' : 'Add Holiday' }
                </button>
            </form>

            { error && (
                <div className="notice notice-error" style={ { margin: '0 0 16px' } }>
                    <p style={ { margin: '8px 0', fontSize: 13 } }>{ error }</p>
                </div>
            ) }
            { success && (
                <div className="notice notice-success" style={ { margin: '0 0 16px' } }>
                    <p style={ { margin: '8px 0', fontSize: 13 } }>{ success }</p>
                </div>
            ) }

            {/* List */}
            { loading ? (
                <p style={ { color: '#646970', fontSize: 13 } }>Loading holidays…</p>
            ) : holidays.length === 0 ? (
                <p style={ { color: '#646970', fontSize: 13 } }>No holidays configured yet.</p>
            ) : (
                <table className="wp-list-table widefat fixed striped" style={ { fontSize: 13 } }>
                    <thead>
                        <tr>
                            <th style={ { width: 180 } }>Date</th>
                            <th>Name</th>
                            <th style={ { width: 80 } }></th>
                        </tr>
                    </thead>
                    <tbody>
                        { holidays.map( h => (
                            <tr key={ h.id }>
                                <td>{ formatDate( h.holiday_date ) }</td>
                                <td>{ h.name || '—' }</td>
                                <td>
                                    <button
                                        className="button-link delete"
                                        onClick={ () => handleDelete( h.id ) }
                                        style={ { color: '#b32d2e', fontSize: 12 } }
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ) ) }
                    </tbody>
                </table>
            ) }
        </div>
    );
}