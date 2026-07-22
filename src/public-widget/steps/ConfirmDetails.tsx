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
                    // WordPress sends an object with a "code" field when there's a WP_Error
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
        return <h2>✅ Booking confirmed! We'll see you soon.</h2>;
    }

    return (
        <div>
            <h2>Step 4: Confirm Your Details</h2>
            <button onClick={ onBack } disabled={ submitting }>← Back</button>

            <div style={ { margin: '12px 0', padding: '10px', background: '#f5f5f0' } }>
                <p>Service: { booking.service?.name }</p>
                <p>Staff: { booking.staff?.name }</p>
                <p>Date: { booking.date } at { booking.time }</p>
            </div>

            <div>
                <label>
                    Your Name: <input type="text" value={ name } onChange={ ( e ) => setName( e.target.value ) } />
                </label>
            </div>
            <div style={ { marginTop: '8px' } }>
                <label>
                    Your Email: <input type="email" value={ email } onChange={ ( e ) => setEmail( e.target.value ) } />
                </label>
            </div>

            { error && <p style={ { color: 'red' } }>{ error }</p> }

            <button style={ { marginTop: '12px' } } onClick={ handleSubmit } disabled={ submitting }>
                { submitting ? 'Submitting...' : 'Confirm Booking' }
            </button>
        </div>
    );
}