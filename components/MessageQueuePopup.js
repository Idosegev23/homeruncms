import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import greenApi from '../utils/greenApi';
import { X, Minimize2, Maximize2 } from 'lucide-react';

const MessageQueuePopup = () => {
    const [queueLength, setQueueLength] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const queue = greenApi.getQueue();
            setQueueLength(queue.length);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!isVisible) return null;

    return (
        <div className={`fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg border border-yellow-500 ${isMinimized ? 'w-auto' : 'w-64'}`}>
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-semibold text-yellow-500">תור הודעות</h4>
                <div>
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)} 
                        className="text-gray-400 hover:text-yellow-500 mx-2 transition-colors"
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)} 
                        className="text-gray-400 hover:text-yellow-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
            {!isMinimized && (
                <>
                    <p className="mb-4 text-gray-300">{queueLength} הודעות בתור</p>
                    <Link href="/queue" className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600 transition-colors inline-block">
                        נהל תור
                    </Link>
                </>
            )}
            {isMinimized && (
                <p className="text-yellow-500 font-bold">{queueLength}</p>
            )}
        </div>
    );
};

export default MessageQueuePopup;