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

    if ( loading ) return <p className="mitii-widget-loading">Loading services...</p>;

    if ( services.length === 0 ) {
        return <p className="mitii-widget-empty">No services available yet.</p>;
    }

    return (
        <div className="mitii-option-grid">
            { services.map( ( service ) => (
                <div
                    key={ service.id }
                    className="mitii-option-card"
                    onClick={ () => onSelect( service ) }
                >
                    <div className="mitii-option-info">
                        <div className="mitii-option-name">{ service.name }</div>
                        <div className="mitii-option-meta">{ service.duration_minutes } minutes</div>
                    </div>
                    <span className="mitii-option-price">${ service.price }</span>
                </div>
            ) ) }
        </div>
    );
}