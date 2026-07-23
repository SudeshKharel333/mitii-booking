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

    return (
        <div>
            <button className="mitii-widget-btn-back" onClick={ onBack }>← Back</button>

            { loading && <p className="mitii-widget-loading">Loading staff...</p> }

            { ! loading && staffList.length === 0 && (
                <p className="mitii-widget-empty">No staff members available yet.</p>
            ) }

            { ! loading && staffList.length > 0 && (
                <div className="mitii-option-list">
                    { staffList.map( ( staff ) => (
                        <div
                            key={ staff.id }
                            className="mitii-option-card"
                            onClick={ () => onSelect( staff ) }
                        >
                            <div className="mitii-option-name">{ staff.name }</div>
                            { staff.bio && <div className="mitii-option-meta">{ staff.bio }</div> }
                        </div>
                    ) ) }
                </div>
            ) }
        </div>
    );
}