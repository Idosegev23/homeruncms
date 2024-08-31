import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import { format } from 'date-fns';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import greenApi from '../../utils/greenApi';

export default function ChatWindow({ selectedChat, onSendMessage, customers }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isLoading 
  } = useInfiniteQuery({
    queryKey: ['chatHistory', selectedChat?.chatId],
    queryFn: ({ pageParam = 0 }) => greenApi.getChatHistory(selectedChat?.chatId, 20, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length * 20 : undefined;
    },
    enabled: !!selectedChat,
  });

  useEffect(() => {
    if (data) {
      const allMessages = data.pages.flatMap(page => page);
      setMessages(allMessages);
    }
  }, [data]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text, files) => {
    await onSendMessage(text, files);
  };

  if (!selectedChat) {
    return <div className="h-full flex items-center justify-center text-gray-500">Select a chat to start messaging</div>;
  }

  const customer = customers.find(c => c.Cell === selectedChat.chatId.split('@')[0]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm p-4 flex items-center">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold mr-3">
          {customer?.First_name?.[0] || '?'}
        </div>
        <div>
          <h2 className="font-bold">{customer?.First_name} {customer?.Last_name}</h2>
          <p className="text-sm text-gray-500">{selectedChat.chatId.split('@')[0]}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef} id="scrollableDiv">
        <InfiniteScroll
          dataLength={messages.length}
          next={fetchNextPage}
          hasMore={hasNextPage}
          loader={<h4>Loading...</h4>}
          scrollableTarget="scrollableDiv"
          inverse={true}
          style={{ display: 'flex', flexDirection: 'column-reverse' }}
        >
          {messages.map(message => (
            <MessageBubble 
              key={message.idMessage} 
              message={message} 
              isOutgoing={message.type === 'outgoing'}
            />
          ))}
        </InfiniteScroll>
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}