import { useEffect, useState } from 'react';

type Props = {
    staffId: number;
    serviceId: number;
    onSelect: ( date: string, time: string ) => void;
    onBack: () => void;
};

/** Returns today's date as 'YYYY-MM-DD', in the visitor's local timezone. */
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String( now.getMonth() + 1 ).padStart( 2, '0' );
    const day = String( now.getDate() ).padStart( 2, '0' );
    return `${ year }-${ month }-${ day }`;
}

export default function SelectDateTime( { staffId, serviceId, onSelect, onBack }: Props ) {
    const [ date, setDate ] = useState( '' );
    const [ time, setTime ] = useState( '' );
    const [ slots, setSlots ] = useState<string[]>( [] );
    const [ loadingSlots, setLoadingSlots ] = useState( false );
    const [ error, setError ] = useState( '' );

    const today = getTodayString();

    useEffect( () => {
        if ( ! date ) {
            setSlots( [] );
            return;
        }

        setLoadingSlots( true );
        setTime( '' );

        fetch( `/wp-json/mitii/v1/staff/${ staffId }/available-slots?date=${ date }&service_id=${ serviceId }` )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setSlots( Array.isArray( data ) ? data : [] );
                setLoadingSlots( false );
            } )
            .catch( () => {
                setSlots( [] );
                setLoadingSlots( false );
            } );
    }, [ date, staffId, serviceId ] );

    const handleDateChange = ( newDate: string ) => {
        setDate( newDate );
        setError( '' );
    };

    const handleContinue = () => {
        if ( ! date || ! time ) {
            setError( 'Please choose both a date and a time.' );
            return;
        }
        setError( '' );
        onSelect( date, time );
    };

    return (
        <div>
            <button className="mitii-widget-btn-back" onClick={ onBack }>← Back</button>

            <div className="mitii-widget-field">
                <label>Date</label>
                <input
                    type="date"
                    value={ date }
                    min={ today }
                    onChange={ ( e ) => handleDateChange( e.target.value ) }
                />
            </div>

            { date && (
                <div className="mitii-widget-field">
                    <label>Time</label>

                    { loadingSlots && <p className="mitii-widget-loading">Checking availability...</p> }

                    { ! loadingSlots && (
                        <div className="mitii-slot-grid">
                            { slots.length === 0 && (
                                <p className="mitii-slot-empty">
                                    No availability on this date — please choose another day.
                                </p>
                            ) }
                            { slots.map( ( slot ) => (
                                <button
                                    key={ slot }
                                    type="button"
                                    className={ `mitii-slot-button${ slot === time ? ' is-selected' : '' }` }
                                    onClick={ () => setTime( slot ) }
                                >
                                    { slot }
                                </button>
                            ) ) }
                        </div>
                    ) }
                </div>
            ) }

            { error && <p className="mitii-widget-error">{ error }</p> }

            <div className="mitii-widget-btn-row">
                <button className="mitii-widget-btn mitii-widget-btn-primary" onClick={ handleContinue }>
                    Continue
                </button>
            </div>
        </div>
    );
}