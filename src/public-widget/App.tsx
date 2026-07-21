import { useEffect, useState } from 'react';

type Service = {
    id: number;
    name: string;
    duration_minutes: number;
    price: string;
};

export default function App() {
    const [ services, setServices ] = useState<Service[]>( [] );
    const [ loading, setLoading ] = useState( true );
    const [ selectedService, setSelectedService ] = useState<Service | null>( null );

    useEffect( () => {
        fetch( '/wp-json/mitii/v1/services' )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setServices( data );
                setLoading( false );
            } );
    }, [] );

    if ( loading ) {
        return <p>Loading services...</p>;
    }

    if ( selectedService ) {
        return (
            <div>
                <h2>You selected: { selectedService.name }</h2>
                <p>Duration: { selectedService.duration_minutes } minutes</p>
                <p>Price: ${ selectedService.price }</p>
                <button onClick={ () => setSelectedService( null ) }>
                    ← Back to services
                </button>
            </div>
        );
    }

    return (
        <div>
            <h2>Choose a Service</h2>
            { services.length === 0 && <p>No services available yet.</p> }
            { services.map( ( service ) => (
                <div
                    key={ service.id }
                    onClick={ () => setSelectedService( service ) }
                    style={ { border: '1px solid #ccc', padding: '10px', marginBottom: '8px', cursor: 'pointer' } }
                >
                    <strong>{ service.name }</strong> — ${ service.price } ({ service.duration_minutes } min)
                </div>
            ) ) }
        </div>
    );
}