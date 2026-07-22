import { useEffect, useState } from 'react';
import type { Service } from '../App';

type Props = {
    onSelect: ( service: Service ) => void;
};

export default function SelectService( { onSelect }: Props ) {
    const [ services, setServices ] = useState<Service[]>( [] );
    const [ loading, setLoading ] = useState( true );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/services' )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setServices( data );
                setLoading( false );
            } );
    }, [] );

    if ( loading ) return <p>Loading services...</p>;

    return (
        <div>
            <h2>Step 1: Choose a Service</h2>
            { services.length === 0 && <p>No services available yet.</p> }
            { services.map( ( service ) => (
                <div
                    key={ service.id }
                    onClick={ () => onSelect( service ) }
                    style={ { border: '1px solid #ccc', padding: '10px', marginBottom: '8px', cursor: 'pointer' } }
                >
                    <strong>{ service.name }</strong> — ${ service.price } ({ service.duration_minutes } min)
                </div>
            ) ) }
        </div>
    );
}