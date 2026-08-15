import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { Settings } from 'lucide-react';

interface MeetingSidebarProps {
  roomId: string;
  peerId: string;    // server-assigned participantId (not used for chat ownership)
  userId: string;    // JWT userId — matches msg.senderId in chat messages
  peers: { id: string; name: string }[];
  userName: string;
}

export const MeetingSidebar: React.FC<MeetingSidebarProps> = ({ roomId, peerId, userId, peers, userName }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'settings'>('chat');
  const { messages, sendMessage } = useChat(roomId, peerId);
  const [inputText, setInputText] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(setDevices).catch(console.error);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="w-full h-full bg-slate-800 flex flex-col" data-meeting-chat>
      <div className="flex border-b border-slate-700">
        <button
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'participants' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('participants')}
        >
          People
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium flex items-center justify-center ${activeTab === 'settings' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('settings')}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'chat' ? (
          <div className="flex flex-col gap-3">
            {messages.map(msg => {
              // senderId is the backend userId (from JWT) — NOT participantId
              const isOwn = msg.senderId === userId;
              const senderLabel = isOwn ? 'You' : (msg.senderName || msg.senderId);
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                  data-meeting-chat-message
                  data-sender={senderLabel}
                  data-own={isOwn ? '1' : '0'}
                  data-content={msg.content}
                >
                  <span className="text-xs text-slate-400 mb-1">{senderLabel}</span>
                  <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] ${isOwn ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : activeTab === 'participants' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">You ({userName})</span>
            </div>
            {peers.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-xs font-bold text-white">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Microphone</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200">
                {devices.filter(d => d.kind === 'audioinput').map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Camera</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200">
                {devices.filter(d => d.kind === 'videoinput').map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="p-4 border-t border-slate-700">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
            >
              🚀
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
