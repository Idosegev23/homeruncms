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
        <div className={`message-queue-popup ${isMinimized ? 'minimized' : ''}`}>
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-semibold">תור הודעות</h4>
                <div>
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)} 
                        className="text-gray-500 hover:text-gray-700 mx-2"
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)} 
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
            {!isMinimized && (
                <>
                    <p className="mb-4">{queueLength} הודעות בתור</p>
                    <Link href="/queue" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
                        נהל תור
                    </Link>
                </>
            )}
            {isMinimized && (
                <p className="minimized-content">{queueLength} הודעות בתור</p>
            )}
        </div>
    );
};

export default MessageQueuePopup;