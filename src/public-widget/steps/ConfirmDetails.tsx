import { useState } from 'react';
import type { BookingData } from '../App';

type Props = {
    booking: BookingData;
    onSubmitDetails: ( name: string, email: string ) => void;
    onBack: () => void;
};

export default function ConfirmDetails( { booking, onSubmitDetails, onBack }: Props ) {
    const [ name, setName ] = useState( '' );
    const [ email, setEmail ] = useState( '' );
    const [ submitting, setSubmitting ] = useState( false );
    const [ submitted, setSubmitted ] = useState( false );
    const [ error, setError ] = useState( '' );

    const handleSubmit = () => {
        if ( ! name || ! email ) {
            setError( 'Please enter your name and email.' );
            return;
        }
        setError( '' );
        setSubmitting( true );

        fetch( '/wp-json/mitii/v1/bookings', {
            method: 'POST',
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

    if ( submitted ) {
        return (
            <div className="mitii-success">
                <div className="mitii-success-icon">✓</div>
                <p className="mitii-success-title">Booking confirmed!</p>
                <p className="mitii-success-subtitle">We'll see you soon. A confirmation has been noted for { booking.date } at { booking.time }.</p>
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

            <div className="mitii-widget-field">
                <label>Your Name</label>
                <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } />
            </div>

            <div className="mitii-widget-field">
                <label>Your Email</label>
                <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } />
            </div>

            { error && <p className="mitii-widget-error">{ error }</p> }

            <div className="mitii-widget-btn-row">
                <button className="mitii-widget-btn mitii-widget-btn-primary" onClick={ handleSubmit } disabled={ submitting }>
                    { submitting ? 'Submitting...' : 'Confirm Booking' }
                </button>
            </div>
        </div>
    );
}