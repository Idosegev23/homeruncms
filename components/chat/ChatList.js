import { useState } from 'react';
import { format } from 'date-fns';

// Helper function to clean phone number
const cleanPhoneNumber = (phoneNumber) => {
  if (typeof phoneNumber !== 'string') {
    console.warn('Invalid phone number:', phoneNumber);
    return '';
  }
  return phoneNumber.replace(/\D/g, '').replace(/^972/, '0');
};

export default function ChatList({ chats, customers, onChatSelect, selectedChat }) {
  const [searchTerm, setSearchTerm] = useState('');

  const customerLookup = customers.reduce((acc, customer) => {
    const cleanedCell = cleanPhoneNumber(customer.Cell);
    acc[cleanedCell] = customer;
    return acc;
  }, {});

  const filteredChats = chats?.filter(chat => {
    const chatId = chat?.senderData?.chatId || chat?.senderData?.sender || '';
    const phoneNumber = cleanPhoneNumber(chatId.split('@')[0]);
    const customer = customerLookup[phoneNumber];
    const customerName = customer ? `${customer.First_name} ${customer.Last_name}` : 'Unknown';
    return customerName.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search chats..."
          className="w-full p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map(chat => {
          const chatId = chat?.senderData?.chatId || chat?.senderData?.sender || '';
          const phoneNumber = cleanPhoneNumber(chatId.split('@')[0]);
          const customer = customerLookup[phoneNumber];
          const customerName = customer ? `${customer.First_name} ${customer.Last_name}` : 'Unknown';
          const lastMessage = chat?.messageData?.textMessageData?.textMessage || 'No message';
          const timestamp = chat?.timestamp 
            ? format(new Date(chat.timestamp * 1000), 'dd/MM/yyyy HH:mm')
            : 'Unknown time';

          return (
            <div
              key={chat.idMessage}
              className={`p-4 border-b cursor-pointer ${
                selectedChat?.idMessage === chat.idMessage ? 'bg-blue-100' : ''
              }`}
              onClick={() => onChatSelect(chat)}
            >
              <div className="font-bold">{customerName}</div>
              <div className="text-sm text-gray-500">{phoneNumber}</div>
              <div className="text-sm text-gray-500">
                {lastMessage.substring(0, 30)}...
              </div>
              <div className="text-xs text-gray-400">
                {timestamp}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}