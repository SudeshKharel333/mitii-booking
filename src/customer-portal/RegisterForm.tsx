import { useState } from 'react';

type Props = {
    onSuccess: () => void;
    onSwitchToLogin: () => void;
};

export default function RegisterForm( { onSuccess, onSwitchToLogin }: Props ) {
    const [ name, setName ] = useState( '' );
    const [ email, setEmail ] = useState( '' );
    const [ password, setPassword ] = useState( '' );
    const [ error, setError ] = useState( '' );
    const [ submitting, setSubmitting ] = useState( false );

    const handleSubmit = () => {
        if ( ! name || ! email || ! password ) {
            setError( 'All fields are required.' );
            return;
        }
        setError( '' );
        setSubmitting( true );

        fetch( '/wp-json/mitii/v1/customer/register', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( { name, email, password } ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setSubmitting( false );
                if ( data.code ) {
                    setError( data.message || 'Registration failed.' );
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
            <h2 className="mitii-portal-auth-title">Create an Account</h2>

            <div className="mitii-portal-field">
                <label>Name</label>
                <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } />
            </div>
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
                { submitting ? 'Creating account...' : 'Register' }
            </button>

            <p className="mitii-portal-switch">
                Already have an account?{ ' ' }
                <a href="#" onClick={ ( e ) => { e.preventDefault(); onSwitchToLogin(); } }>Log in here</a>
            </p>
        </div>
    );
}