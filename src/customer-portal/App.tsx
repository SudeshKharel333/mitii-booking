import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import BookingsList from './BookingsList';
// @ts-ignore: side-effect import for stylesheet without type declarations
import './portal-styles.css';

type CurrentUser = {
    logged_in: boolean;
    id?: number;
    name?: string;
    email?: string;
};

export default function App() {
    const [ user, setUser ] = useState<CurrentUser | null>( null );
    const [ mode, setMode ] = useState<'login' | 'register'>( 'login' );
    const [ loading, setLoading ] = useState( true );
    const [ loadError, setLoadError ] = useState( '' );

    const checkLoginStatus = () => {
        fetch( '/wp-json/mitii/v1/customer/me', { credentials: 'same-origin' } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setUser( data );
                setLoading( false );
            } )
            .catch( () => {
                setLoadError( 'Could not connect to the server. Please refresh the page.' );
                setLoading( false );
            } );
    };

    useEffect( () => {
        checkLoginStatus();
    }, [] );

    const handleLogout = () => {
        fetch( '/wp-json/mitii/v1/customer/logout', {
            method: 'POST',
            credentials: 'same-origin',
        } ).then( () => checkLoginStatus() );
    };

    if ( loading ) {
        return (
            <div className="mitii-portal-ticket">
                <div className="mitii-portal-ticket-header">
                    <p className="mitii-portal-ticket-eyebrow">Mitii Booking</p>
                    <h2 className="mitii-portal-ticket-title">Your Account</h2>
                </div>
                <div className="mitii-portal-ticket-body">Loading...</div>
            </div>
        );
    }

    if ( loadError ) {
        return (
            <div className="mitii-portal-ticket">
                <div className="mitii-portal-ticket-header">
                    <p className="mitii-portal-ticket-eyebrow">Mitii Booking</p>
                    <h2 className="mitii-portal-ticket-title">Your Account</h2>
                </div>
                <div className="mitii-portal-ticket-body">{ loadError }</div>
            </div>
        );
    }

    if ( ! user?.logged_in ) {
        return (
            <div className="mitii-portal-ticket">
                <div className="mitii-portal-ticket-header">
                    <p className="mitii-portal-ticket-eyebrow">Mitii Booking</p>
                    <h2 className="mitii-portal-ticket-title">
                        { mode === 'login' ? 'Log In' : 'Create Account' }
                    </h2>
                </div>
                <div className="mitii-portal-ticket-body">
                    { mode === 'login' ? (
                        <LoginForm onSuccess={ checkLoginStatus } onSwitchToRegister={ () => setMode( 'register' ) } />
                    ) : (
                        <RegisterForm onSuccess={ checkLoginStatus } onSwitchToLogin={ () => setMode( 'login' ) } />
                    ) }
                </div>
            </div>
        );
    }

    return (
        <div className="mitii-portal-ticket" style={ { maxWidth: '640px' } }>
            <div className="mitii-portal-ticket-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' } }>
                <div>
                    <p className="mitii-portal-ticket-eyebrow">Mitii Booking</p>
                    <h2 className="mitii-portal-ticket-title">{ user.name }</h2>
                </div>
                <button
                    onClick={ handleLogout }
                    style={ {
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: '#fff',
                        padding: '7px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    } }
                >
                    Log out
                </button>
            </div>
            <div className="mitii-portal-ticket-body">
                <BookingsList onChanged={ checkLoginStatus } />
            </div>
        </div>
    );
}