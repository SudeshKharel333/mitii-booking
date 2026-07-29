import { useEffect, useState } from 'react';
import type { Service } from '../App';

type Props = {
    staffId: number;
    onSelect: ( service: Service ) => void;
    onBack: () => void;
};

export default function SelectServiceForStaff( { staffId, onSelect, onBack }: Props ) {
    const [ services, setServices ] = useState<Service[]>( [] );
    const [ loading, setLoading ] = useState( true );

    useEffect( () => {
        setLoading( true );
        fetch( `/wp-json/mitii/v1/staff/${ staffId }/services` )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setServices( Array.isArray( data ) ? data : [] );
                setLoading( false );
            } );
    }, [ staffId ] );

    return (
        <div>
            <button className="mitii-widget-btn-back" onClick={ onBack }>← Back</button>

            { loading && <p className="mitii-widget-loading">Loading services...</p> }

            { ! loading && services.length === 0 && (
                <p className="mitii-widget-empty">This staff member doesn't offer any services yet.</p>
            ) }

            { ! loading && services.length > 0 && (
                <div className="mitii-option-grid">
                    { services.map( ( service ) => (
                        <div
                            key={ service.id }
                            className="mitii-option-card"
                            onClick={ () => onSelect( service ) }
                        >
                            <div className="mitii-option-name">{ service.name }</div>
                            <div className="mitii-option-meta">{ service.duration_minutes } minutes</div>
                            <span className="mitii-option-price">${ service.price }</span>
                        </div>
                    ) ) }
                </div>
            ) }
        </div>
    );
}