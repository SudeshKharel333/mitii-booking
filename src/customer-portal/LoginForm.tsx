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
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
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
        <div className="mitii-portal-auth-card">
            <h2 className="mitii-portal-auth-title">Log In</h2>

            <div className="mitii-portal-field">
                <label>Email</label>
                <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } />
            </div>
            <div className="mitii-portal-field">
                <label>Password</label>
                <input type="password" value={ password } onChange={ ( e ) => setPassword( e.target.value ) } />
            </div>

            { error && <p className="mitii-portal-error">{ error }</p> }

            <button className="mitii-portal-btn-primary" onClick={ handleSubmit } disabled={ submitting }>
                { submitting ? 'Logging in...' : 'Log In' }
            </button>

            <p className="mitii-portal-switch">
                Don't have an account?{ ' ' }
                <a href="#" onClick={ ( e ) => { e.preventDefault(); onSwitchToRegister(); } }>Register here</a>
            </p>
        </div>
    );
}