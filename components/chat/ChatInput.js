import { useState, useRef } from 'react';
import { PaperClipIcon, SendIcon } from 'lucide-react';

export default function ChatInput({ onSendMessage }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() || files.length > 0) {
      onSendMessage(message, files);
      setMessage('');
      setFiles([]);
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
      <div className="flex items-center">
        <button 
          type="button" 
          onClick={() => fileInputRef.current.click()}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <PaperClipIcon size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <SendIcon size={20} />
        </button>
      </div>
      {files.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          {files.length} file(s) selected
        </div>
      )}
    </form>
  );
}