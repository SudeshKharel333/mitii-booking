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

function getInitials( name: string ) {
    return name
        .split( ' ' )
        .map( ( part ) => part[ 0 ] )
        .join( '' )
        .toUpperCase()
        .slice( 0, 2 );
}

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
        return <div className="mitii-portal"><div className="mitii-portal-body">Loading...</div></div>;
    }

    if ( loadError ) {
        return <div className="mitii-portal"><div className="mitii-portal-body">{ loadError }</div></div>;
    }

    if ( ! user?.logged_in ) {
        return (
            <div style={ { padding: '20px 0' } }>
                { mode === 'login' ? (
                    <LoginForm onSuccess={ checkLoginStatus } onSwitchToRegister={ () => setMode( 'register' ) } />
                ) : (
                    <RegisterForm onSuccess={ checkLoginStatus } onSwitchToLogin={ () => setMode( 'login' ) } />
                ) }
            </div>
        );
    }

    return (
        <div className="mitii-portal">
            <div className="mitii-portal-appbar">
                <div className="mitii-portal-identity">
                    <div className="mitii-portal-avatar">{ getInitials( user.name || '?' ) }</div>
                    <div>
                        <p className="mitii-portal-name">{ user.name }</p>
                        <p className="mitii-portal-email">{ user.email }</p>
                    </div>
                </div>
                <button className="mitii-portal-logout" onClick={ handleLogout }>Log out</button>
            </div>

            <div className="mitii-portal-body">
                <BookingsList onChanged={ checkLoginStatus } />
            </div>
        </div>
    );
}