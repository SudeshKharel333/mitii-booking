import { useState } from 'react';
import SelectService from './steps/SelectService';
import SelectStaff from './steps/SelectStaff';
import SelectDateTime from './steps/SelectDateTime';
import ConfirmDetails from './steps/ConfirmDetails';
// @ts-ignore: side-effect import for stylesheet without type declarations
import './widget-styles.css';

export type Service = {
    id: number;
    name: string;
    duration_minutes: number;
    price: string;
};

export type Staff = {
    id: number;
    name: string;
    email: string;
    bio: string;
};

export type BookingData = {
    service: Service | null;
    staff: Staff | null;
    date: string;
    time: string;
    customerName: string;
    customerEmail: string;
};

const STEP_LABELS = [ 'Service', 'Staff', 'Date & Time', 'Confirm' ];

function ProgressSteps( { step }: { step: number } ) {
    return (
        <div className="mitii-steps">
            { STEP_LABELS.map( ( _, index ) => {
                const stepNumber = index + 1;
                const state = stepNumber < step ? 'is-done' : stepNumber === step ? 'is-active' : 'is-pending';
                return (
                    <div key={ stepNumber } style={ { display: 'flex', alignItems: 'center', flex: stepNumber < STEP_LABELS.length ? 1 : 'initial' } }>
                        <div className={ `mitii-step-dot ${ state }` }>
                            { stepNumber < step ? '✓' : stepNumber }
                        </div>
                        { stepNumber < STEP_LABELS.length && (
                            <div className={ `mitii-step-line ${ stepNumber < step ? 'is-done' : '' }` } />
                        ) }
                    </div>
                );
            } ) }
        </div>
    );
}

export default function App() {
    const [ step, setStep ] = useState( 1 );
    const [ booking, setBooking ] = useState<BookingData>( {
        service: null,
        staff: null,
        date: '',
        time: '',
        customerName: '',
        customerEmail: '',
    } );

    const goNext = () => setStep( ( s ) => s + 1 );
    const goBack = () => setStep( ( s ) => s - 1 );

    return (
        <div className="mitii-widget">
            <div className="mitii-ticket">
                <div className="mitii-ticket-header">
                    <p className="mitii-ticket-eyebrow">Book an appointment</p>
                    <h2 className="mitii-ticket-title">{ STEP_LABELS[ step - 1 ] }</h2>
                </div>

                <div className="mitii-ticket-body">
                    <ProgressSteps step={ step } />

                    { step === 1 && (
                        <SelectService
                            onSelect={ ( service ) => {
                                setBooking( { ...booking, service } );
                                goNext();
                            } }
                        />
                    ) }

                    { step === 2 && booking.service && (
    <SelectStaff
        serviceId={ booking.service.id }
        onSelect={ ( staff ) => {
            setBooking( { ...booking, staff } );
            goNext();
        } }
        onBack={ goBack }
    />
) }

                    { step === 3 && (
                        <SelectDateTime
                            onSelect={ ( date, time ) => {
                                setBooking( { ...booking, date, time } );
                                goNext();
                            } }
                            onBack={ goBack }
                        />
                    ) }

                    { step === 4 && (
                        <ConfirmDetails
                            booking={ booking }
                            onSubmitDetails={ ( name, email ) => {
                                setBooking( { ...booking, customerName: name, customerEmail: email } );
                            } }
                            onBack={ goBack }
                        />
                    ) }
                </div>
            </div>
        </div>
    );
}