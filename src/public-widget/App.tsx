import { useState } from 'react';
import SelectService from './steps/SelectService.tsx';
import SelectStaff from './steps/SelectStaff.tsx'
import SelectDateTime from './steps/SelectDateTime.tsx';
import ConfirmDetails from './steps/ConfirmDetails.tsx';

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

    if ( step === 1 ) {
        return (
            <SelectService
                onSelect={ ( service ) => {
                    setBooking( { ...booking, service } );
                    goNext();
                } }
            />
        );
    }

    if ( step === 2 ) {
        return (
            <SelectStaff
                onSelect={ ( staff ) => {
                    setBooking( { ...booking, staff } );
                    goNext();
                } }
                onBack={ goBack }
            />
        );
    }

    if ( step === 3 ) {
        return (
            <SelectDateTime
                onSelect={ ( date, time ) => {
                    setBooking( { ...booking, date, time } );
                    goNext();
                } }
                onBack={ goBack }
            />
        );
    }

    return (
        <ConfirmDetails
            booking={ booking }
            onSubmitDetails={ ( name, email ) => {
                setBooking( { ...booking, customerName: name, customerEmail: email } );
            } }
            onBack={ goBack }
        />
    );
}