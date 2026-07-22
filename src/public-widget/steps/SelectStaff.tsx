import { useEffect, useState } from 'react';
import type { Staff } from '../App';

type Props = {
    onSelect: ( staff: Staff ) => void;
    onBack: () => void;
};

export default function SelectStaff( { onSelect, onBack }: Props ) {
    const [ staffList, setStaffList ] = useState<Staff[]>( [] );
    const [ loading, setLoading ] = useState( true );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/staff' )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setStaffList( data );
                setLoading( false );
            } );
    }, [] );

    if ( loading ) return <p>Loading staff...</p>;

    return (
        <div>
            <h2>Step 2: Choose a Staff Member</h2>
            <button onClick={ onBack }>← Back</button>
            { staffList.length === 0 && <p>No staff members available yet.</p> }
            { staffList.map( ( staff ) => (
                <div
                    key={ staff.id }
                    onClick={ () => onSelect( staff ) }
                    style={ { border: '1px solid #ccc', padding: '10px', marginBottom: '8px', cursor: 'pointer' } }
                >
                    <strong>{ staff.name }</strong>
                </div>
            ) ) }
        </div>
    );
}