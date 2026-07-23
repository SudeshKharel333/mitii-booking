import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import BookingsList from './BookingsList';

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

const checkLoginStatus = () => {
    fetch( '/wp-json/mitii/v1/customer/me', {
        headers: { 'X-WP-Nonce': ( window as any ).mitiiPortalData?.nonce },
    } )
        .then( ( res ) => {
            console.log( 'Response status:', res.status );
            return res.json();
        } )
        .then( ( data ) => {
            console.log( 'Response data:', data );
            setUser( data );
            setLoading( false );
        } )
        .catch( ( err ) => {
            console.error( 'Fetch failed:', err );
            setLoading( false );
        } );
};

const handleLogout = () => {
    fetch( '/wp-json/mitii/v1/customer/logout', {
        method: 'POST',
        headers: { 'X-WP-Nonce': ( window as any ).mitiiPortalData?.nonce },
    } )
        .then( () => checkLoginStatus() );
};

    if ( loading ) return <p>Loading...</p>;

    if ( ! user?.logged_in ) {
        return (
            <div>
                { mode === 'login' ? (
                    <LoginForm onSuccess={ checkLoginStatus } onSwitchToRegister={ () => setMode( 'register' ) } />
                ) : (
                    <RegisterForm onSuccess={ checkLoginStatus } onSwitchToLogin={ () => setMode( 'login' ) } />
                ) }
            </div>
        );
    }

    return (
        <div>
            <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
                <h2>Welcome, { user.name }</h2>
                <button onClick={ handleLogout }>Log out</button>
            </div>
            <BookingsList onChanged={ checkLoginStatus } />
        </div>
    );
}