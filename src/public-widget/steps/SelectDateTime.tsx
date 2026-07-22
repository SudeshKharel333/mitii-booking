import { useState } from 'react';

type Props = {
    onSelect: ( date: string, time: string ) => void;
    onBack: () => void;
};

export default function SelectDateTime( { onSelect, onBack }: Props ) {
    const [ date, setDate ] = useState( '' );
    const [ time, setTime ] = useState( '' );

    const handleContinue = () => {
        if ( ! date || ! time ) {
            alert( 'Please choose both a date and a time.' );
            return;
        }
        onSelect( date, time );
    };

    return (
        <div>
            <h2>Step 3: Pick Date & Time</h2>
            <button onClick={ onBack }>← Back</button>
            <div style={ { marginTop: '12px' } }>
                <label>
                    Date: <input type="date" value={ date } onChange={ ( e ) => setDate( e.target.value ) } />
                </label>
            </div>
            <div style={ { marginTop: '8px' } }>
                <label>
                    Time: <input type="time" value={ time } onChange={ ( e ) => setTime( e.target.value ) } />
                </label>
            </div>
            <button style={ { marginTop: '12px' } } onClick={ handleContinue }>
                Continue
            </button>
        </div>
    );
}