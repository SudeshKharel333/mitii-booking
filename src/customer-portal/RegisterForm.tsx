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
        <div style={ { maxWidth: '360px' } }>
            <h2>Create an Account</h2>
            <div>
                <label>Name: <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } /></label>
            </div>
            <div style={ { marginTop: '8px' } }>
                <label>Email: <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } /></label>
            </div>
            <div style={ { marginTop: '8px' } }>
                <label>Password: <input type="password" value={ password } onChange={ ( e ) => setPassword( e.target.value ) } /></label>
            </div>
            { error && <p style={ { color: 'red' } }>{ error }</p> }
            <button style={ { marginTop: '10px' } } onClick={ handleSubmit } disabled={ submitting }>
                { submitting ? 'Creating account...' : 'Register' }
            </button>
            <p style={ { marginTop: '12px' } }>
                Already have an account?{ ' ' }
                <a href="#" onClick={ ( e ) => { e.preventDefault(); onSwitchToLogin(); } }>Log in here</a>
            </p>
        </div>
    );
}