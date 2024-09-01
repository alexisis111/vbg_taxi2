import {useCallback, useEffect, useState} from 'react';
import './App.css';
import {useTelegram} from "./hooks/useTelegram.js";


const App = () => {

    const [phoneNumber, setPhoneNumber] = useState('');
    const {tg, user, userId, queryId} = useTelegram();
    //onSendData - отправляем все из хука на сервер, для проверки БД
    const onSendData = useCallback(() => {
        const data = {
            phoneNumber,
            user,
            queryId,
            userId
        }
        fetch('https://6089-185-108-19-43.ngrok-free.app/web-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        tg.sendData(JSON.stringify(data))
    }, [phoneNumber, user, queryId, userId])

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

    const handlePhoneNumberChange = (e) => {
        let input = e.target.value;

        // Начинается только с +7 и далее 10 цифр
        if (input === '') {
            setPhoneNumber('');
            tg.MainButton.hide();
            return;
        }

        if (input.startsWith('+7') && /^\+7\d{0,10}$/.test(input)) {
            setPhoneNumber(input);

            if (input.length === 12) { // Полный номер (+7 + 10 цифр)
                tg.MainButton.show();
            } else {
                tg.MainButton.hide();
            }
        } else if (input.length === 1 && input === '+') {
            // Если введен только символ +, показать кнопку, иначе скрыть
            tg.MainButton.hide();
            setPhoneNumber(input);
        } else {
            // Если введен некорректный номер, очищаем ввод
            setPhoneNumber(input.slice(0, -1)); // Убираем последний введенный символ
        }
    };

    return (
        <>
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
