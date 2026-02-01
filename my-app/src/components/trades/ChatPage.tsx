import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../superbaseClient'; // Adjust path as needed
import '../../css/app.css';
import {toast} from 'sonner';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const setupChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMyId(user?.id || null);
  
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
    };
  
    setupChat();
  
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
  
        // Alert logic: Only alert if the sender is NOT me
        if (payload.new.sender_id !== myId) {
          toast.info(`New message: ${payload.new.content}`, {
            description: "Click to view",
            duration: 3000,
          });
          
          // Optional: still play sound if you want
          const audio = new Audio('/notification-sound.mp3');
          audio.play().catch(() => {});
        }
      })
      .subscribe();
  
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, myId]);
  
  

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !myId) return;
  
    const messageContent = newMessage;
    setNewMessage(''); // Clear input immediately
  
    // 1. Create a temporary message object for the UI
    const optimisticMessage = {
      id: crypto.randomUUID(), // temporary ID
      conversation_id: conversationId,
      sender_id: myId,
      content: messageContent,
      created_at: new Date().toISOString(),
    };
  
    // 2. Update state immediately so it shows up right away
    setMessages((prev) => [...prev, optimisticMessage]);
  
    // 3. Send to Supabase
    const { error } = await supabase.from('messages').insert([{
      conversation_id: conversationId,
      sender_id: myId,
      content: messageContent
    }]);
  
    if (error) {
      // Optional: Handle error by removing the optimistic message or showing an alert
      console.error("Error sending message:", error);
    }
  };
  

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        <h2 className="font-bold text-lg">Chat</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === myId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
              msg.sender_id === myId ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Send</button>
      </form>
    </div>
  );
};

export default ChatPage;
