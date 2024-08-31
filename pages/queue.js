import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import greenApi from '../utils/greenApi';
import { fetchCustomers } from '../utils/airtable';

const QueuePage = () => {
    const [queue, setQueue] = useState([]);

    useEffect(() => {
        const loadQueue = async () => {
            const storedQueue = greenApi.getQueue(); // קבלת התור מ-greenApi
            const customerDetails = await fetchCustomers(); // קבלת פרטי הלקוחות מ-Airtable

            const enrichedQueue = storedQueue.map(msg => {
                // הסרת @c.us והקידומת 972 מה-chatId כדי למצוא את הלקוח המתאים
                let formattedPhone = msg.chatId.replace('@c.us', ''); // הסרת @c.us מה-chatId
                if (formattedPhone.startsWith('972')) {
                    formattedPhone = formattedPhone.slice(3); // הסרת הקידומת 972
                }

                const customer = customerDetails.find(c => greenApi.formatPhoneNumber(c.Cell).slice(3) === formattedPhone);
                
                return {
                    ...msg,
                    customer: customer || { First_name: 'Unknown', Last_name: 'Customer' },
                };
            });

            setQueue(enrichedQueue);
        };

        loadQueue();
    }, []);

    const handleEdit = (index, newMessage) => {
        greenApi.updateQueueItem(index, newMessage);
        setQueue(greenApi.getQueue());
    };

    const handleDelete = (index) => {
        greenApi.removeFromQueue(index);
        setQueue(greenApi.getQueue());
    };

    const handleSendNow = async (index) => {
        const messageToSend = queue[index];
        try {
            await greenApi.sendNow(messageToSend.chatId, messageToSend.message);
            handleDelete(index);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <Layout>
            <div className="container mx-auto p-8 bg-gray-50 rounded-xl shadow-2xl">
                <h1 className="text-4xl font-bold mb-8 text-blue-800 text-center">ניהול תור הודעות</h1>
                {queue.length === 0 ? (
                    <p className="text-gray-500">אין הודעות בתור כרגע.</p>
                ) : (
                    <ul>
                        {queue.map((msg, index) => (
                            <li key={index} className="mb-4 p-4 border rounded-lg bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold">
                                        {msg.customer.First_name} {msg.customer.Last_name}
                                    </h3>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleSendNow(index)}
                                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition duration-300"
                                        >
                                            שלח עכשיו
                                        </button>
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300"
                                        >
                                            מחק
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={msg.message}
                                    onChange={(e) => handleEdit(index, e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    rows="3"
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Layout>
    );
};

export default QueuePage;
