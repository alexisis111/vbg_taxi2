import React, {useCallback, useEffect, useState} from 'react';
import './App.css';
import {useTelegram} from "./hooks/useTelegram.js";
import Header from "./components/Header/Header.jsx";

const App = () => {
    const [country, setCountry] = useState('');
    const [street, setStreet] = useState('');
    const [subject, setSubject] = useState('physical');

    const [phoneNumber, setPhoneNumber] = useState('');

    const {tg} = useTelegram();

    const onSendData = useCallback(() => {
        const data = {
            country,
            street,
            subject,
            phoneNumber
        }
        tg.sendData(JSON.stringify(data));
    }, [country, street, subject, phoneNumber])

    useEffect(() => {
        tg.onEvent('mainButtonClicked', onSendData)
        return () => {
            tg.offEvent('mainButtonClicked', onSendData)
        }
    }, [onSendData])

    useEffect(() => {
        tg.MainButton.setParams({
            text: 'Отправить данные'
        })
    }, [])


    useEffect(() => {
        if(!street || !country) {
            tg.MainButton.hide();
        } else {
            tg.MainButton.show();
        }
    }, [country, street])

    const onChangeCountry = (e) => {
        setCountry(e.target.value)
    }

    const onChangeStreet = (e) => {
        setStreet(e.target.value)
    }

    const onChangeSubject = (e) => {
        setSubject(e.target.value)
    }

    const handlePhoneNumberChange = (e) => {
        let input = e.target.value;

        if (input === '') {
            setPhoneNumber('');
            tg.MainButton.hide();
            return;
        }

        if (/^\+?[78]\d*$/.test(input) || input === '+') {
            if ((input.startsWith('+7') && input.length <= 12) || (input.startsWith('8') && input.length <= 11) || input === '+') {
                setPhoneNumber(input);

                if ((input.startsWith('+7') && input.length === 12) || (input.startsWith('8') && input.length === 11)) {
                    tg.MainButton.show();
                } else {
                    tg.MainButton.hide();
                }
            }
        }
    };

    return (
        <>
            <Header/>
            <div className={"form"}>
                <h3>Введите ваши данные</h3>
                <input
                    className={'input'}
                    type="text"
                    placeholder={'Страна'}
                    value={country}
                    onChange={onChangeCountry}
                />
                <input
                    className={'input'}
                    type="text"
                    placeholder={'Улица'}
                    value={street}
                    onChange={onChangeStreet}
                />
                <select value={subject} onChange={onChangeSubject} className={'select'}>
                    <option value={'physical'}>Физ. лицо</option>
                    <option value={'legal'}>Юр. лицо</option>
                </select>
            </div>
            <div className='flex flex-col items-center justify-center pt-10'>
                <label className="text-gray-600">
                    Введите ваш номер телефона
                </label>
                <div className="relative mt-2 max-w-xs text-gray-500">
                    <div className="absolute inset-y-0 left-3 my-auto h-6 flex items-center border-r pr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                             stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="+79999999999"
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        className="w-full pl-[4.5rem] pr-3 py-2 appearance-none bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                    />
                </div>
            </div>
        </>

    );
};

export default App;
