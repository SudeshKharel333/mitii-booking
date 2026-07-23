import { useState } from 'react';

type Props = {
    onSelect: ( date: string, time: string ) => void;
    onBack: () => void;
};

export default function SelectDateTime( { onSelect, onBack }: Props ) {
    const [ date, setDate ] = useState( '' );
    const [ time, setTime ] = useState( '' );
    const [ error, setError ] = useState( '' );

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
                <input type="date" value={ date } onChange={ ( e ) => setDate( e.target.value ) } />
            </div>

            <div className="mitii-widget-field">
                <label>Time</label>
                <input type="time" value={ time } onChange={ ( e ) => setTime( e.target.value ) } />
            </div>

            { error && <p className="mitii-widget-error">{ error }</p> }

            <div className="mitii-widget-btn-row">
                <button className="mitii-widget-btn mitii-widget-btn-primary" onClick={ handleContinue }>
                    Continue
                </button>
            </div>
        </div>
    );
}