import React, { useState } from 'react';
import { useDialogueStore } from '../store/dialogueStore';
import { Undo, GitBranch, GitMerge } from 'lucide-react';
import { DialogueMessage } from '../types/dialogue';  // 确保路径正确

export const DialogueControls: React.FC = () => {
  const { nodes, currentState, navigate, createBranch, mergeTimelines } = useDialogueStore();
  const [newContent, setNewContent] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  const canGoBack = currentState.history.length > 1;

  const handleBack = () => {
    if (canGoBack) {
      const previousNodeId = currentState.history[currentState.history.length - 2];
      navigate(previousNodeId);
    }
  };
/*
  const handleCreateBranch = () => {
    if (newContent.trim()) {
      createBranch(currentState.currentNodeId, newContent.trim());
      setNewContent('');
    }
  };*/
  const handleCreateBranch = () => {
    if (newContent.trim()) {
      const message: DialogueMessage = {
        role: 'user',
        content: newContent.trim(),
        timestamp: Date.now()
      };
      createBranch(currentState.currentNodeId, [message]);
      setNewContent('');
    }
  };

  const handleMerge = () => {
    if (selectedNodes.size >= 2) {
      mergeTimelines(Array.from(selectedNodes));
      setSelectedNodes(new Set());
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className={`p-2 rounded-full ${
            canGoBack ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-100'
          }`}
        >
          <Undo className="w-4 h-4" />
        </button>
        
        <div className="flex-1">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Enter new dialogue..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          onClick={handleCreateBranch}
          disabled={!newContent.trim()}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 flex items-center gap-2"
        >
          <GitBranch className="w-4 h-4" />
          Branch
        </button>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Merge Timelines</h3>
        <div className="flex flex-wrap gap-2">
          {Array.from(nodes.values())
            .filter(node => node.id !== 'root')
            .map(node => (
              <button
                key={node.id}
                onClick={() => {
                  const newSelected = new Set(selectedNodes);
                  if (selectedNodes.has(node.id)) {
                    newSelected.delete(node.id);
                  } else {
                    newSelected.add(node.id);
                  }
                  setSelectedNodes(newSelected);
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedNodes.has(node.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {node.messages[0].content.slice(0, 20)}...
              </button>
            ))}
        </div>
        {selectedNodes.size >= 2 && (
          <button
            onClick={handleMerge}
            className="mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <GitMerge className="w-4 h-4" />
            Merge Selected
          </button>
        )}
      </div>
    </div>
  );
};