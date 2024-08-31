import React from 'react';
import Button from "../Button/Button";
import {useTelegram} from "../../hooks/useTelegram";
import './Header.css';

const Header = () => {
    const {user, onClose} = useTelegram();
    console.log(user);

    return (
        <div className="flex items-center justify-between p-4 bg-gray-100 shadow-md">
            <Button onClick={onClose}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                     stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
            </Button>
            <span className="text-lg font-semibold text-gray-800">
                    {user || 'User'}
            </span>
        </div>
    );
};

export default Header;
