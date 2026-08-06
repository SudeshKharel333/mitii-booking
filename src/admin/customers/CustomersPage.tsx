import { useEffect, useState } from 'react';
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../admin-styles.css';

type Customer = {
    id: number;
    name: string;
    email: string;
    created_at: string;
    booking_count: number;
    total_spent: string;
};

const PER_PAGE = 20;

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

export default function CustomersPage() {
    const [ customers, setCustomers ] = useState<Customer[]>( [] );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( '' );

    const [ page, setPage ] = useState( 1 );
    const [ totalPages, setTotalPages ] = useState( 1 );
    const [ totalCount, setTotalCount ] = useState( 0 );
    const [ search, setSearch ] = useState( '' );

    const [ showAddForm, setShowAddForm ] = useState( false );
    const [ newName, setNewName ] = useState( '' );
    const [ newEmail, setNewEmail ] = useState( '' );
    const [ addError, setAddError ] = useState( '' );
    const [ adding, setAdding ] = useState( false );
    const [ createdCredentials, setCreatedCredentials ] = useState<{ email: string; password: string } | null>( null );

    const loadCustomers = ( pageToLoad: number, searchTerm: string ) => {
        setLoading( true );
        const params = new URLSearchParams( {
            page: String( pageToLoad ),
            per_page: String( PER_PAGE ),
        } );
        if ( searchTerm ) params.set( 'search', searchTerm );

        fetch( `/wp-json/mitii/v1/customers?${ params.toString() }`, {
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => {
                setTotalCount( parseInt( res.headers.get( 'X-WP-Total' ) || '0', 10 ) );
                setTotalPages( parseInt( res.headers.get( 'X-WP-TotalPages' ) || '1', 10 ) );
                return res.json();
            } )
            .then( ( data ) => {
                setCustomers( Array.isArray( data ) ? data : [] );
                setLoading( false );
            } )
            .catch( () => {
                setError( 'Could not load customers.' );
                setLoading( false );
            } );
    };

    useEffect( () => {
        loadCustomers( page, search );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ page ] );

    const handleSearchSubmit = ( e: React.FormEvent ) => {
        e.preventDefault();
        setPage( 1 );
        loadCustomers( 1, search );
    };

    const handleAddCustomer = () => {
        if ( ! newName || ! newEmail ) {
            setAddError( 'Name and email are required.' );
            return;
        }
        setAddError( '' );
        setAdding( true );

        fetch( '/wp-json/mitii/v1/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce,
            },
            body: JSON.stringify( { name: newName, email: newEmail } ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setAdding( false );
                if ( data.code ) {
                    setAddError( data.message || 'Could not add customer.' );
                } else {
                    setCreatedCredentials( { email: data.email, password: data.password } );
                    setNewName( '' );
                    setNewEmail( '' );
                    setShowAddForm( false );
                    loadCustomers( 1, search );
                    setPage( 1 );
                }
            } )
            .catch( () => {
                setAdding( false );
                setAddError( 'Network error. Please try again.' );
            } );
    };

    const handleDelete = ( id: number ) => {
        if ( ! window.confirm( 'Delete this customer? Their booking history is kept, but they will no longer be able to log in. This cannot be undone.' ) ) {
            return;
        }

        fetch( `/wp-json/mitii/v1/customers/${ id }`, {
            method: 'DELETE',
            headers: { 'X-WP-Nonce': ( window as any ).mitiiAdminData?.nonce },
        } )
            .then( ( res ) => res.json() )
            .then( () => loadCustomers( page, search ) )
            .catch( () => setError( 'Could not delete customer.' ) );
    };

    return (
        <div className="mitii-admin">
            <NavPills active="customers" />
            <h1>Customers</h1>
            <p className="mitii-subtitle">Everyone who has registered a customer account.</p>
            { error && <p className="mitii-error">{ error }</p> }

            { createdCredentials && (
                <div className="mitii-card" style={ { borderColor: 'var(--mitii-teal)' } }>
                    <h2 style={ { margin: '0 0 8px' } }>Customer Added</h2>
                    <p className="mitii-hint" style={ { margin: '0 0 10px' } }>
                        There's no "forgot password" flow yet, so share this temporary password with the
                        customer directly — this is the only time it's shown.
                    </p>
                    <p style={ { fontSize: '14px', margin: '0 0 4px' } }><strong>Email:</strong> { createdCredentials.email }</p>
                    <p style={ { fontSize: '14px', margin: '0 0 12px' } }><strong>Password:</strong> <code>{ createdCredentials.password }</code></p>
                    <button className="mitii-btn mitii-btn-secondary mitii-btn-sm" onClick={ () => setCreatedCredentials( null ) }>
                        Dismiss
                    </button>
                </div>
            ) }

            <div className="mitii-btn-row" style={ { marginBottom: '20px', justifyContent: 'space-between' } }>
                <form onSubmit={ handleSearchSubmit } style={ { display: 'flex', gap: '8px' } }>
                    <input
                        type="text"
                        placeholder="Search name or email…"
                        value={ search }
                        onChange={ ( e ) => setSearch( e.target.value ) }
                        style={ {
                            padding: '9px 12px',
                            border: '1px solid var(--mitii-border)',
                            borderRadius: '7px',
                            fontSize: '14px',
                            minWidth: '220px',
                        } }
                    />
                    <button type="submit" className="mitii-btn mitii-btn-secondary mitii-btn-sm">Search</button>
                </form>
                <button className="mitii-btn mitii-btn-primary" onClick={ () => setShowAddForm( ( v ) => ! v ) }>
                    { showAddForm ? 'Cancel' : '+ Add Customer' }
                </button>
            </div>

            { showAddForm && (
                <div className="mitii-card">
                    <h2 style={ { margin: '0 0 14px' } }>Add Customer</h2>
                    <div className="mitii-two-col">
                        <div className="mitii-field">
                            <label>Name</label>
                            <input type="text" value={ newName } onChange={ ( e ) => setNewName( e.target.value ) } />
                        </div>
                        <div className="mitii-field">
                            <label>Email</label>
                            <input type="email" value={ newEmail } onChange={ ( e ) => setNewEmail( e.target.value ) } />
                        </div>
                    </div>
                    { addError && <p className="mitii-error">{ addError }</p> }
                    <button className="mitii-btn mitii-btn-primary" onClick={ handleAddCustomer } disabled={ adding }>
                        { adding ? 'Adding...' : 'Add Customer' }
                    </button>
                </div>
            ) }

            { loading && customers.length === 0 && <p className="mitii-subtitle">Loading...</p> }

            { ! loading && customers.length === 0 && (
                <div className="mitii-empty-state">No customers found.</div>
            ) }

            { customers.length > 0 && (
                <>
                    <div className="mitii-table-wrap">
                        <table className="mitii-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Bookings</th>
                                    <th>Total Spent</th>
                                    <th>Joined</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                { customers.map( ( c ) => (
                                    <tr key={ c.id }>
                                        <td>{ c.name }</td>
                                        <td>{ c.email }</td>
                                        <td>{ c.booking_count }</td>
                                        <td>${ parseFloat( c.total_spent ).toFixed( 2 ) }</td>
                                        <td>{ c.created_at?.slice( 0, 10 ) }</td>
                                        <td>
                                            <button
                                                className="mitii-btn mitii-btn-danger mitii-btn-sm"
                                                onClick={ () => handleDelete( c.id ) }
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>

                    { totalPages > 1 && (
                        <div className="mitii-btn-row" style={ { marginTop: '14px', alignItems: 'center' } }>
                            <button
                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                onClick={ () => setPage( ( p ) => p - 1 ) }
                                disabled={ page <= 1 }
                            >
                                ← Previous
                            </button>
                            <span className="mitii-hint" style={ { margin: '0 8px' } }>
                                Page { page } of { totalPages } ({ totalCount } total)
                            </span>
                            <button
                                className="mitii-btn mitii-btn-secondary mitii-btn-sm"
                                onClick={ () => setPage( ( p ) => p + 1 ) }
                                disabled={ page >= totalPages }
                            >
                                Next →
                            </button>
                        </div>
                    ) }
                </>
            ) }
        </div>
    );
}