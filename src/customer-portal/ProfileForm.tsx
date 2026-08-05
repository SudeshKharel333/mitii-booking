import { useEffect, useState } from 'react';

type CurrentUser = {
    logged_in: boolean;
    id?: number;
    name?: string;
    email?: string;
};

type Booking = {
    id: number;
    status: string;
    service_price: string | null;
};

type Props = {
    user: CurrentUser;
    onUpdated: () => void;
    onAccountDeleted: () => void;
};

export default function ProfileForm( { user, onUpdated, onAccountDeleted }: Props ) {
    const [ name, setName ] = useState( user.name || '' );
    const [ email, setEmail ] = useState( user.email || '' );
    const [ currentPassword, setCurrentPassword ] = useState( '' );
    const [ newPassword, setNewPassword ] = useState( '' );
    const [ showPasswordFields, setShowPasswordFields ] = useState( false );

    const [ error, setError ] = useState( '' );
    const [ success, setSuccess ] = useState( '' );
    const [ saving, setSaving ] = useState( false );

    const [ deletePassword, setDeletePassword ] = useState( '' );
    const [ deleteError, setDeleteError ] = useState( '' );
    const [ showDeleteConfirm, setShowDeleteConfirm ] = useState( false );
    const [ deleting, setDeleting ] = useState( false );

    const [ totalSpent, setTotalSpent ] = useState( 0 );
    const [ statsLoading, setStatsLoading ] = useState( true );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/my-bookings?per_page=50', { credentials: 'same-origin' } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                const bookings: Booking[] = Array.isArray( data ) ? data : [];
                const completed = bookings.filter( ( b ) => b.status === 'completed' );
                const spent = completed.reduce(
                    ( sum, b ) => sum + ( b.service_price ? parseFloat( b.service_price ) : 0 ),
                    0
                );
                setTotalSpent( spent );
                setStatsLoading( false );
            } )
            .catch( () => setStatsLoading( false ) );
    }, [] );

    const handleSave = () => {
        if ( ! name || ! email ) {
            setError( 'Name and email are required.' );
            setSuccess( '' );
            return;
        }
        if ( showPasswordFields && newPassword && newPassword.length < 8 ) {
            setError( 'New password must be at least 8 characters.' );
            setSuccess( '' );
            return;
        }

        setError( '' );
        setSuccess( '' );
        setSaving( true );

        const body: Record<string, string> = { name, email };
        if ( showPasswordFields && newPassword ) {
            body.current_password = currentPassword;
            body.new_password = newPassword;
        }

        fetch( '/wp-json/mitii/v1/customer/me', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( body ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setSaving( false );
                if ( data.code ) {
                    setError( data.message || 'Could not update your profile.' );
                } else {
                    setSuccess( 'Profile updated.' );
                    setCurrentPassword( '' );
                    setNewPassword( '' );
                    setShowPasswordFields( false );
                    onUpdated();
                }
            } )
            .catch( () => {
                setSaving( false );
                setError( 'Network error. Please try again.' );
            } );
    };

    const handleDelete = () => {
        if ( ! deletePassword ) {
            setDeleteError( 'Enter your password to confirm.' );
            return;
        }
        if ( ! window.confirm( 'Delete your account? This cannot be undone.' ) ) return;

        setDeleteError( '' );
        setDeleting( true );

        fetch( '/wp-json/mitii/v1/customer/me', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( { password: deletePassword } ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setDeleting( false );
                if ( data.code ) {
                    setDeleteError( data.message || 'Could not delete your account.' );
                } else {
                    onAccountDeleted();
                }
            } )
            .catch( () => {
                setDeleting( false );
                setDeleteError( 'Network error. Please try again.' );
            } );
    };

    return (
        <div>
            <div className="mitii-stat-single">
                <div className="mitii-stat-card">
                    <div className="mitii-stat-icon is-gold">$</div>
                    <div className="mitii-stat-value">
                        { statsLoading ? '—' : `$${ totalSpent.toFixed( 2 ) }` }
                    </div>
                    <div className="mitii-stat-label">Total Spent</div>
                    <div className="mitii-stat-sub">From completed appointments only</div>
                </div>
            </div>

            <p className="mitii-portal-section-title">Account Details</p>

            <div className="mitii-portal-field">
                <label>Name</label>
                <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } />
            </div>
            <div className="mitii-portal-field">
                <label>Email</label>
                <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } />
            </div>

            { showPasswordFields ? (
                <>
                    <div className="mitii-portal-field">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={ currentPassword }
                            onChange={ ( e ) => setCurrentPassword( e.target.value ) }
                        />
                    </div>
                    <div className="mitii-portal-field">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={ newPassword }
                            onChange={ ( e ) => setNewPassword( e.target.value ) }
                        />
                    </div>
                </>
            ) : (
                <button
                    type="button"
                    className="mitii-portal-btn-text mitii-portal-btn-text-neutral"
                    onClick={ () => setShowPasswordFields( true ) }
                >
                    Change password
                </button>
            ) }

            { error && <p className="mitii-portal-error">{ error }</p> }
            { success && <p className="mitii-portal-success">{ success }</p> }

            <button className="mitii-portal-btn-primary" onClick={ handleSave } disabled={ saving }>
                { saving ? 'Saving...' : 'Save Changes' }
            </button>

            <div className="mitii-portal-danger-zone">
                <p className="mitii-portal-danger-title">Danger Zone</p>
                <p className="mitii-portal-danger-copy">
                    Deleting your account is permanent and cannot be undone. Your past booking history is kept
                    for the business's records, but you will no longer be able to log in.
                </p>

                { ! showDeleteConfirm ? (
                    <button
                        type="button"
                        className="mitii-portal-btn-danger-outline"
                        onClick={ () => setShowDeleteConfirm( true ) }
                    >
                        Delete Account
                    </button>
                ) : (
                    <div>
                        <div className="mitii-portal-field">
                            <label>Confirm your password</label>
                            <input
                                type="password"
                                value={ deletePassword }
                                onChange={ ( e ) => setDeletePassword( e.target.value ) }
                            />
                        </div>

                        { deleteError && <p className="mitii-portal-error">{ deleteError }</p> }

                        <div className="mitii-portal-danger-actions">
                            <button
                                type="button"
                                className="mitii-portal-btn-text mitii-portal-btn-text-neutral"
                                onClick={ () => {
                                    setShowDeleteConfirm( false );
                                    setDeletePassword( '' );
                                    setDeleteError( '' );
                                } }
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="mitii-portal-btn-danger"
                                onClick={ handleDelete }
                                disabled={ deleting }
                            >
                                { deleting ? 'Deleting...' : 'Permanently Delete' }
                            </button>
                        </div>
                    </div>
                ) }
            </div>
        </div>
    );
}