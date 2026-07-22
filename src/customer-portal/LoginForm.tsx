import { useState } from 'react';

type Props = {
    onSuccess: () => void;
    onSwitchToRegister: () => void;
};

export default function LoginForm( { onSuccess, onSwitchToRegister }: Props ) {
    const [ email, setEmail ] = useState( '' );
    const [ password, setPassword ] = useState( '' );
    const [ error, setError ] = useState( '' );
    const [ submitting, setSubmitting ] = useState( false );

    const handleSubmit = () => {
        if ( ! email || ! password ) {
            setError( 'Please enter your email and password.' );
            return;
        }
        setError( '' );
        setSubmitting( true );

        fetch( '/wp-json/mitii/v1/customer/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': ( window as any ).mitiiPortalData?.nonce,
    },
    body: JSON.stringify( { email, password } ),
} )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setSubmitting( false );
                if ( data.code ) {
                    setError( data.message || 'Login failed.' );
                } else {
                    onSuccess();
                }
            } )
            .catch( () => {
                setSubmitting( false );
                setError( 'Network error. Please try again.' );
            } );
    };

    return (
        <div style={ { maxWidth: '360px' } }>
            <h2>Log In</h2>
            <div>
                <label>Email: <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } /></label>
            </div>
            <div style={ { marginTop: '8px' } }>
                <label>Password: <input type="password" value={ password } onChange={ ( e ) => setPassword( e.target.value ) } /></label>
            </div>
            { error && <p style={ { color: 'red' } }>{ error }</p> }
            <button style={ { marginTop: '10px' } } onClick={ handleSubmit } disabled={ submitting }>
                { submitting ? 'Logging in...' : 'Log In' }
            </button>
            <p style={ { marginTop: '12px' } }>
                Don't have an account?{ ' ' }
                <a href="#" onClick={ ( e ) => { e.preventDefault(); onSwitchToRegister(); } }>Register here</a>
            </p>
        </div>
    );
}