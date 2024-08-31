import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import ChatInterface from '../../components/chat/ChatInterface';

const queryClient = new QueryClient();

export default function ChatPage() {
  return (
    <QueryClientProvider client={queryClient}>
        <ChatInterface />
    </QueryClientProvider>
  );
}