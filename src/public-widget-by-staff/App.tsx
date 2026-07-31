import { useState } from 'react';
import SelectStaffAll from './steps/SelectStaffAll';
import SelectServiceForStaff from './steps/SelectServiceForStaff';
import SelectDateTime from './steps/SelectDateTime';
import ConfirmDetails from './steps/ConfirmDetails';
// Reuses the exact same ticket-stub theme as the regular booking widget.
// @ts-ignore: side-effect import for stylesheet without type declarations
import '../public-widget/widget-styles.css';

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
    image_url: string;
};

export type BookingData = {
    service: Service | null;
    staff: Staff | null;
    date: string;
    time: string;
    customerName: string;
    customerEmail: string;
};

const STEP_LABELS = [ 'Staff', 'Service', 'Date & Time', 'Confirm' ];

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
                        <SelectStaffAll
                            onSelect={ ( staff ) => {
                                setBooking( { ...booking, staff } );
                                goNext();
                            } }
                        />
                    ) }

                    { step === 2 && booking.staff && (
                        <SelectServiceForStaff
                            staffId={ booking.staff.id }
                            onSelect={ ( service ) => {
                                setBooking( { ...booking, service } );
                                goNext();
                            } }
                            onBack={ goBack }
                        />
                    ) }

                    { step === 3 && booking.staff && booking.service && (
                        <SelectDateTime
                            staffId={ booking.staff.id }
                            serviceId={ booking.service.id }
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