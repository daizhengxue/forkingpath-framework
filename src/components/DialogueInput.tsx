import React, { useState } from 'react';
import { Plus, GitBranch, Loader2 } from 'lucide-react';
import { useDialogueStore } from '../store/dialogueStore';
import { DialogueMessage } from '../types/dialogue';
import { getAIResponse } from '../services/openRouterService';

export const DialogueInput: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isBranching, setIsBranching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addNode, currentState, getDialogueHistory, nodes } = useDialogueStore();

  const handleSubmit = async () => {
    if (!content.trim() || isLoading) return;

    try {
      setIsLoading(true);

      const newMessage: DialogueMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: Date.now()
      };

      const currentNode = nodes.get(currentState.currentNodeId);
      if (!currentNode) {
        throw new Error('Current node not found');
      }

      if (isBranching) {
        const newId = crypto.randomUUID();
        
        const branchPointId = currentNode.parentId!;
        currentState.currentNodeId = branchPointId;
        
        const history = getDialogueHistory(branchPointId, true);
        const updatedHistory = [...history, newMessage];
        console.log('API Call:', updatedHistory);
        const aiResponseContent = await getAIResponse(updatedHistory);
        
        const aiResponse: DialogueMessage = {
          role: 'assistant',
          content: aiResponseContent,
          timestamp: Date.now()
        };

        const newMessages = [newMessage, aiResponse];
        addNode(newMessages, {
          universe: `branch-${newId.slice(0, 8)}`,
          branchType: 'alternate',
          tags: [],
          title: newMessage.content.slice(0, 30) + '...'
        });
      } else {
        const history = getDialogueHistory(currentState.currentNodeId, true);
        const updatedHistory = [...history, newMessage];
        console.log('API Call:', updatedHistory);
        const aiResponseContent = await getAIResponse(updatedHistory);
        
        const aiResponse: DialogueMessage = {
          role: 'assistant',
          content: aiResponseContent,
          timestamp: Date.now()
        };

        const newMessages = [newMessage, aiResponse];
        addNode(newMessages, {
          universe: 'main',
          branchType: 'main',
          tags: [],
          title: newMessage.content.slice(0, 30) + '...'
        });
      }

      setContent('');
      setIsOpen(false);
      setIsBranching(false);
    } catch (error) {
      console.error('Error processing dialogue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4 w-[800px]">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setIsBranching(false)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-base ${
                !isBranching ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus className="w-5 h-5" />
              Continue Timeline
            </button>
            <button
              onClick={() => setIsBranching(true)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-base ${
                isBranching ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <GitBranch className="w-5 h-5" />
              Create Branch
            </button>
          </div>
          <div className="flex gap-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your message..."
              disabled={isLoading}
              className="flex-1 p-4 border rounded-lg resize-none h-[200px] text-base focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !content.trim()}
              className="bg-blue-500 text-white px-8 rounded-lg hover:bg-blue-600 self-end disabled:opacity-50 disabled:cursor-not-allowed h-14 font-medium text-lg"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="bg-blue-500 text-white w-16 h-16 rounded-full shadow-lg hover:bg-blue-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
};