import { format } from 'date-fns';

export default function MessageBubble({ message, isOutgoing }) {
  return (
    <div className={`p-2 ${isOutgoing ? 'text-right' : 'text-left'}`}>
      <div 
        className={`inline-block p-2 rounded-lg ${
          isOutgoing ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}
      >
        {message.messageData.textMessageData.textMessage}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {format(new Date(message.timestamp * 1000), 'HH:mm')}
      </div>
    </div>
  );
}