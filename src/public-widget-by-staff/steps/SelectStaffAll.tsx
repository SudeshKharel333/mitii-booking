import { useEffect, useState } from 'react';
import type { Staff } from '../App';

type Props = {
    onSelect: ( staff: Staff ) => void;
};

export default function SelectStaffAll( { onSelect }: Props ) {
    const [ staffList, setStaffList ] = useState<Staff[]>( [] );
    const [ loading, setLoading ] = useState( true );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/staff' )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setStaffList( Array.isArray( data ) ? data : [] );
                setLoading( false );
            } );
    }, [] );

    if ( loading ) return <p className="mitii-widget-loading">Loading staff...</p>;

    if ( staffList.length === 0 ) {
        return <p className="mitii-widget-empty">No staff members available yet.</p>;
    }

    return (
        <div className="mitii-option-grid">
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
    );
}