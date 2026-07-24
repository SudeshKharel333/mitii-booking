import { useMemo, useState } from 'react';

type Props = {
    onSelect: ( date: string, time: string ) => void;
    onBack: () => void;
};

const START_HOUR = 9;  // 9:00 AM
const END_HOUR = 18;   // last slot starts before 6:00 PM
const SLOT_MINUTES = 30;

/** Returns today's date as 'YYYY-MM-DD', in the visitor's local timezone. */
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String( now.getMonth() + 1 ).padStart( 2, '0' );
    const day = String( now.getDate() ).padStart( 2, '0' );
    return `${ year }-${ month }-${ day }`;
}

/** Returns the current time as 'HH:MM', in the visitor's local timezone. */
function getCurrentTimeString() {
    const now = new Date();
    const hours = String( now.getHours() ).padStart( 2, '0' );
    const minutes = String( now.getMinutes() ).padStart( 2, '0' );
    return `${ hours }:${ minutes }`;
}

/** Builds every 'HH:MM' slot between START_HOUR and END_HOUR, every SLOT_MINUTES. */
function buildAllSlots(): string[] {
    const slots: string[] = [];
    for ( let hour = START_HOUR; hour < END_HOUR; hour++ ) {
        for ( let minute = 0; minute < 60; minute += SLOT_MINUTES ) {
            slots.push( `${ String( hour ).padStart( 2, '0' ) }:${ String( minute ).padStart( 2, '0' ) }` );
        }
    }
    return slots;
}

export default function SelectDateTime( { onSelect, onBack }: Props ) {
    const [ date, setDate ] = useState( '' );
    const [ time, setTime ] = useState( '' );
    const [ error, setError ] = useState( '' );

    const today = getTodayString();

    const availableSlots = useMemo( () => {
        const allSlots = buildAllSlots();
        if ( date !== today ) {
            return allSlots;
        }
        const nowTime = getCurrentTimeString();
        return allSlots.filter( ( slot ) => slot > nowTime );
    }, [ date, today ] );

    const handleDateChange = ( newDate: string ) => {
        setDate( newDate );
        setTime( '' ); // picking a new date always clears the previously chosen slot
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
                    <div className="mitii-slot-grid">
                        { availableSlots.length === 0 && (
                            <p className="mitii-slot-empty">No time slots left today — please choose another date.</p>
                        ) }
                        { availableSlots.map( ( slot ) => (
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