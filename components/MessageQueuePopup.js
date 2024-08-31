import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import greenApi from '../utils/greenApi';

const MessageQueuePopup = () => {
    const [queueLength, setQueueLength] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const queue = greenApi.getQueue();
            setQueueLength(queue.length);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="message-queue-popup">
            <h4>תור הודעות</h4>
            <p>{queueLength} הודעות בתור</p>
            <Link href="/queue">
                נהל תור
            </Link>
        </div>
    );
};

export default MessageQueuePopup;
