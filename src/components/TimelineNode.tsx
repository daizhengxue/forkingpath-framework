import React, { useState, useRef } from 'react';
import { Activity, GitBranch, GitMerge, Zap, Settings, Lock } from 'lucide-react';
import { DialogueNode } from '../types/dialogue';

interface TimelineNodeProps {
  node: DialogueNode;
  isActive: boolean;
  hasBeenExplored: boolean;
  onClick: () => void;
  onJumpClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrag: (e: React.DragEvent) => void;
  position: { x: number; y: number };
  onSystemPromptEdit?: (content: string) => void;
  totalNodes: number;
}

interface DragOffset {
  x: number;
  y: number;
}

export const TimelineNode: React.FC<TimelineNodeProps> = ({
  node,
  isActive,
  hasBeenExplored,
  onClick,
  onJumpClick,
  onDragStart,
  onDragEnd,
  onDrag,
  position,
  onSystemPromptEdit,
  totalNodes
}) => {
  const [size, setSize] = useState({ width: 300, height: 200 });
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    node.messages.find(m => m.role === 'system')?.content || ''
  );
  const [dragOffset, setDragOffset] = useState<DragOffset | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const isRootNode = node.id === 'root';
  
  const systemMessage = node.messages.find(m => m.role === 'system');
  const userMessage = node.messages.find(m => m.role === 'user');
  const aiMessage = node.messages.find(m => m.role === 'assistant');
  const formattedTime = new Date(userMessage?.timestamp || Date.now()).toLocaleTimeString();
  
  // Lock system prompt only after second conversation (when there are more than 2 nodes including root)
  const isSystemPromptLocked = totalNodes > 2;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    
    function onMouseMove(e: MouseEvent) {
      requestAnimationFrame(() => {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newWidth = Math.max(300, startWidth + deltaX);
        const newHeight = Math.max(200, startHeight + deltaY);
        
        if (newWidth !== size.width || newHeight !== size.height) {
          setSize({ width: newWidth, height: newHeight });
        }
      });
    }
    
    function onMouseUp() {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleSystemPromptSave = () => {
    if (onSystemPromptEdit) {
      onSystemPromptEdit(systemPrompt);
    }
    setIsEditingSystem(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!nodeRef.current) return;

    // 获取节点的实际位置（考虑transform偏移）
    const rect = nodeRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 计算鼠标相对于节点中心的偏移
    setDragOffset({
      x: e.clientX - centerX,
      y: e.clientY - centerY
    });

    // 设置透明拖动图像
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);

    onDragStart(e);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!dragOffset || !nodeRef.current || (e.clientX === 0 && e.clientY === 0)) return;

    const containerRect = nodeRef.current.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    // 获取画布缩放比例
    const scale = parseFloat(nodeRef.current.parentElement?.style.transform.match(/scale\((.*?)\)/)?.[1] || '1');

    // 计算新位置（考虑缩放和偏移）
    const x = (e.clientX - containerRect.left) / scale;
    const y = (e.clientY - containerRect.top) / scale;

    onDrag({
      ...e,
      clientX: x,
      clientY: y
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragOffset(null);
    onDragEnd(e);
  };

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        willChange: 'transform'
      }}
      className={`
        timeline-node flex flex-col gap-2 p-6 rounded-xl
        ${isActive ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}
        ${hasBeenExplored ? 'opacity-100' : 'opacity-60'}
        ${isResizing ? 'cursor-se-resize select-none' : 'cursor-move'}
        border-2 shadow-lg
        transition-colors duration-300 hover:shadow-xl
        relative
      `}
      onClick={onClick}
    >
      <div className="absolute -left-4 top-8 transform -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center shadow-md">
        {node.metadata.branchType === 'main' && <Activity className="w-4 h-4 text-blue-500" />}
        {node.metadata.branchType === 'alternate' && <GitBranch className="w-4 h-4 text-green-500" />}
        {node.metadata.branchType === 'merged' && <GitMerge className="w-4 h-4 text-purple-500" />}
      </div>

      {isRootNode ? (
        <>
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-medium text-gray-900">System Prompt</h3>
            {isSystemPromptLocked ? (
              <div className="flex items-center gap-1 text-gray-400">
                <Lock className="w-4 h-4" />
                <span className="text-xs">Locked</span>
              </div>
            ) : (
              !isEditingSystem && onSystemPromptEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSystem(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                </button>
              )
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {isEditingSystem && !isSystemPromptLocked ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full p-2 border rounded resize-none h-[100px] text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingSystem(false);
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSystemPromptSave();
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className={`text-sm ${isSystemPromptLocked ? 'text-gray-500' : 'text-gray-600'}`}>
                {systemMessage?.content}
                {isSystemPromptLocked && (
                  <p className="mt-2 text-xs text-gray-400 italic">
                    System prompt cannot be modified after second conversation
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="border-b pb-2">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
              {userMessage?.content || 'Start of conversation'}
            </h3>
            <span className="text-xs text-gray-500">{formattedTime}</span>
          </div>
          <div className="flex-1 overflow-auto text-sm text-gray-600 pr-2">
            {aiMessage?.content || 'Waiting for response...'}
          </div>
        </>
      )}

      {!isRootNode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJumpClick();
          }}
          className="absolute -right-3 -top-3 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg hover:bg-purple-600 transition-colors"
          title="Jump to this timeline"
        >
          <Zap className="w-4 h-4" />
        </button>
      )}

      <div
        className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize"
        onMouseDown={handleMouseDown}
        style={{
          background: 'transparent',
          backgroundImage: `linear-gradient(135deg, transparent 50%, rgba(203, 213, 225, 0.7) 50%)`,
          borderBottomRightRadius: '0.75rem',
          zIndex: 10,
          touchAction: 'none'
        }}
      />
    </div>
  );
};