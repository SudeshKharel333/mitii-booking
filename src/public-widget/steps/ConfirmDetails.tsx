import { useEffect, useState } from 'react';
import type { BookingData } from '../App';

type Props = {
    booking: BookingData;
    onSubmitDetails: ( name: string, email: string ) => void;
    onBack: () => void;
};

type CurrentCustomer = {
    logged_in: boolean;
    id?: number;
    name?: string;
    email?: string;
};

type Mode = 'checking' | 'login' | 'register' | 'guest' | 'authenticated';

export default function ConfirmDetails( { booking, onSubmitDetails, onBack }: Props ) {
    const [ mode, setMode ] = useState<Mode>( 'checking' );
    const [ customer, setCustomer ] = useState<CurrentCustomer | null>( null );

    // Login form fields
    const [ loginEmail, setLoginEmail ] = useState( '' );
    const [ loginPassword, setLoginPassword ] = useState( '' );

    // Register form fields
    const [ regName, setRegName ] = useState( '' );
    const [ regEmail, setRegEmail ] = useState( '' );
    const [ regPassword, setRegPassword ] = useState( '' );

    // Guest checkout fields
    const [ guestName, setGuestName ] = useState( '' );
    const [ guestEmail, setGuestEmail ] = useState( '' );

    const [ error, setError ] = useState( '' );
    const [ submitting, setSubmitting ] = useState( false );
    const [ submitted, setSubmitted ] = useState( false );

    const checkAuth = () => {
        fetch( '/wp-json/mitii/v1/customer/me', { credentials: 'same-origin' } )
            .then( ( res ) => res.json() )
            .then( ( data: CurrentCustomer ) => {
                setCustomer( data );
                setMode( data.logged_in ? 'authenticated' : 'login' );
            } )
            .catch( () => {
                setMode( 'login' );
            } );
    };

    useEffect( () => {
        checkAuth();
    }, [] );

    const handleLogin = () => {
        if ( ! loginEmail || ! loginPassword ) {
            setError( 'Please enter your email and password.' );
            return;
        }
        setError( '' );
        setSubmitting( true );

        fetch( '/wp-json/mitii/v1/customer/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( { email: loginEmail, password: loginPassword } ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setSubmitting( false );
                if ( data.code ) {
                    setError( data.message || 'Login failed.' );
                } else {
                    checkAuth();
                }
            } )
            .catch( () => {
                setSubmitting( false );
                setError( 'Network error. Please try again.' );
            } );
    };

    const handleRegister = () => {
        if ( ! regName || ! regEmail || ! regPassword ) {
            setError( 'All fields are required.' );
            return;
        }
        setError( '' );
        setSubmitting( true );

        fetch( '/wp-json/mitii/v1/customer/register', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( { name: regName, email: regEmail, password: regPassword } ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setSubmitting( false );
                if ( data.code ) {
                    setError( data.message || 'Registration failed.' );
                } else {
                    checkAuth();
                }
            } )
            .catch( () => {
                setSubmitting( false );
                setError( 'Network error. Please try again.' );
            } );
    };

    const submitBooking = ( name: string, email: string ) => {
        setError( '' );
        setSubmitting( true );

        fetch( '/wp-json/mitii/v1/bookings', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( {
                service_id: booking.service?.id,
                staff_id: booking.staff?.id,
                customer_name: name,
                customer_email: email,
                booking_date: booking.date,
                booking_time: booking.time,
            } ),
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setSubmitting( false );
                if ( data.code ) {
                    setError( data.message || 'Something went wrong.' );
                } else {
                    setSubmitted( true );
                    onSubmitDetails( name, email );
                }
            } )
            .catch( () => {
                setSubmitting( false );
                setError( 'Network error. Please try again.' );
            } );
    };

    const handleConfirmAsCustomer = () => {
        if ( ! customer?.name || ! customer?.email ) return;
        submitBooking( customer.name, customer.email );
    };

    const handleConfirmAsGuest = () => {
        if ( ! guestName || ! guestEmail ) {
            setError( 'Please enter your name and email.' );
            return;
        }
        submitBooking( guestName, guestEmail );
    };

    if ( submitted ) {
        return (
            <div className="mitii-success">
                <div className="mitii-success-icon">✓</div>
                <p className="mitii-success-title">Booking confirmed!</p>
                <p className="mitii-success-subtitle">
                    We'll see you on { booking.date } at { booking.time }.
                    { mode === 'authenticated' && ' You can view this booking anytime in your account.' }
                </p>
            </div>
        );
    }

    return (
        <div>
            <button className="mitii-widget-btn-back" onClick={ onBack } disabled={ submitting }>← Back</button>

            <div className="mitii-summary">
                <div className="mitii-summary-row">
                    <span className="mitii-summary-label">Service</span>
                    <span className="mitii-summary-value">{ booking.service?.name }</span>
                </div>
                <div className="mitii-summary-row">
                    <span className="mitii-summary-label">Staff</span>
                    <span className="mitii-summary-value">{ booking.staff?.name }</span>
                </div>
                <div className="mitii-summary-row">
                    <span className="mitii-summary-label">When</span>
                    <span className="mitii-summary-value">{ booking.date } at { booking.time }</span>
                </div>
            </div>

            { mode === 'checking' && <p className="mitii-widget-loading">Checking your account...</p> }

            { mode === 'authenticated' && customer && (
                <div>
                    <p style={ { fontSize: '14px', marginBottom: '16px' } }>
                        Booking as <strong>{ customer.name }</strong> ({ customer.email })
                    </p>
                    { error && <p className="mitii-widget-error">{ error }</p> }
                    <div className="mitii-widget-btn-row">
                        <button
                            className="mitii-widget-btn mitii-widget-btn-primary"
                            onClick={ handleConfirmAsCustomer }
                            disabled={ submitting }
                        >
                            { submitting ? 'Submitting...' : 'Confirm Booking' }
                        </button>
                    </div>
                </div>
            ) }

            { mode === 'login' && (
                <div>
                    <div className="mitii-widget-field">
                        <label>Email</label>
                        <input type="email" value={ loginEmail } onChange={ ( e ) => setLoginEmail( e.target.value ) } />
                    </div>
                    <div className="mitii-widget-field">
                        <label>Password</label>
                        <input type="password" value={ loginPassword } onChange={ ( e ) => setLoginPassword( e.target.value ) } />
                    </div>

                    { error && <p className="mitii-widget-error">{ error }</p> }

                    <div className="mitii-widget-btn-row">
                        <button className="mitii-widget-btn mitii-widget-btn-primary" onClick={ handleLogin } disabled={ submitting }>
                            { submitting ? 'Logging in...' : 'Log In & Confirm' }
                        </button>
                    </div>

                    <p style={ { fontSize: '13px', textAlign: 'center', margin: '14px 0 0' } }>
                        <a href="#" onClick={ ( e ) => { e.preventDefault(); setError( '' ); setMode( 'register' ); } }>
                            Create an account
                        </a>
                        { ' · ' }
                        <a href="#" onClick={ ( e ) => { e.preventDefault(); setError( '' ); setMode( 'guest' ); } }>
                            Continue as guest
                        </a>
                    </p>
                </div>
            ) }

            { mode === 'register' && (
                <div>
                    <div className="mitii-widget-field">
                        <label>Name</label>
                        <input type="text" value={ regName } onChange={ ( e ) => setRegName( e.target.value ) } />
                    </div>
                    <div className="mitii-widget-field">
                        <label>Email</label>
                        <input type="email" value={ regEmail } onChange={ ( e ) => setRegEmail( e.target.value ) } />
                    </div>
                    <div className="mitii-widget-field">
                        <label>Password</label>
                        <input type="password" value={ regPassword } onChange={ ( e ) => setRegPassword( e.target.value ) } />
                    </div>

                    { error && <p className="mitii-widget-error">{ error }</p> }

                    <div className="mitii-widget-btn-row">
                        <button className="mitii-widget-btn mitii-widget-btn-primary" onClick={ handleRegister } disabled={ submitting }>
                            { submitting ? 'Creating account...' : 'Create Account & Confirm' }
                        </button>
                    </div>

                    <p style={ { fontSize: '13px', textAlign: 'center', margin: '14px 0 0' } }>
                        <a href="#" onClick={ ( e ) => { e.preventDefault(); setError( '' ); setMode( 'login' ); } }>
                            Already have an account? Log in
                        </a>
                        { ' · ' }
                        <a href="#" onClick={ ( e ) => { e.preventDefault(); setError( '' ); setMode( 'guest' ); } }>
                            Continue as guest
                        </a>
                    </p>
                </div>
            ) }

            { mode === 'guest' && (
                <div>
                    <div className="mitii-widget-field">
                        <label>Your Name</label>
                        <input type="text" value={ guestName } onChange={ ( e ) => setGuestName( e.target.value ) } />
                    </div>
                    <div className="mitii-widget-field">
                        <label>Your Email</label>
                        <input type="email" value={ guestEmail } onChange={ ( e ) => setGuestEmail( e.target.value ) } />
                    </div>

                    { error && <p className="mitii-widget-error">{ error }</p> }

                    <div className="mitii-widget-btn-row">
                        <button className="mitii-widget-btn mitii-widget-btn-primary" onClick={ handleConfirmAsGuest } disabled={ submitting }>
                            { submitting ? 'Submitting...' : 'Confirm Booking' }
                        </button>
                    </div>

                    <p style={ { fontSize: '13px', textAlign: 'center', margin: '14px 0 0' } }>
                        <a href="#" onClick={ ( e ) => { e.preventDefault(); setError( '' ); setMode( 'login' ); } }>
                            Have an account? Log in instead
                        </a>
                    </p>
                </div>
            ) }
        </div>
    );
}