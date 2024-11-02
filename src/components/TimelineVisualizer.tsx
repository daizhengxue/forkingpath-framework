import React, { useEffect, useRef, useState } from 'react';
import { useDialogueStore } from '../store/dialogueStore';
import { TimelineNode } from './TimelineNode';
import { TimelineConnector } from './TimelineConnector';

interface NodePosition {
  x: number;
  y: number;
}

interface DraggingState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ViewPort {
  scale: number;
  offsetX: number;
  offsetY: number;
}

//const NODE_DEFAULT_WIDTH = 300;  // 默认节点宽度
//const NODE_DEFAULT_HEIGHT = 200; // 默认节点高度
const HORIZONTAL_SPACING = 400;  // 水平间距
const VERTICAL_SPACING = 300;    // 垂直间距

export const TimelineVisualizer: React.FC = () => {
  const { nodes, currentState, navigate, jumpToTimeline, updateSystemPrompt } = useDialogueStore();
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNodePath, setActiveNodePath] = useState<Set<string>>(new Set());
  const [viewport, setViewport] = useState<ViewPort>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // 初始化节点位置
    nodes.forEach((node, nodeId) => {
      if (!nodePositions.has(nodeId)) {
        setNodePositions(prev => {
          const newPositions = new Map(prev);
          
          if (nodeId === 'root') {
            // root 节点放在中心位置
            newPositions.set(nodeId, {
              x: 400,
              y: 300
            });
          } else {
            // 获取父节点位置
            //const parentNode = nodes.get(node.parentId || '');
            const parentPos = nodePositions.get(node.parentId || '');
            
            if (parentPos) {
              let newX = parentPos.x;
              let newY = parentPos.y;

              // 根据分支类型决定位置
              switch (node.metadata.branchType) {
                case 'main':
                  // continue timeline - 放在右边
                  newX = parentPos.x + HORIZONTAL_SPACING;
                  newY = parentPos.y;
                  break;
                  
                case 'alternate':
                  // branch - 放在下面，并且稍微偏右
                  newX = parentPos.x + HORIZONTAL_SPACING * 0.5;
                  newY = parentPos.y + VERTICAL_SPACING;
                  break;
                  
                case 'merged':
                  // merged - 放在右边，并且稍微向上
                  newX = parentPos.x + HORIZONTAL_SPACING;
                  newY = parentPos.y - VERTICAL_SPACING * 0.3;
                  break;
              }

              // 检查新位置是否与现有节点重叠
              while (isPositionOccupied(newX, newY, nodeId)) {
                newY += VERTICAL_SPACING * 0.5;
              }

              newPositions.set(nodeId, { x: newX, y: newY });
            }
          }
          return newPositions;
        });
      }
    });
  }, [nodes]);

  // 检查位置是否被占用
  const isPositionOccupied = (x: number, y: number, excludeNodeId: string): boolean => {
    for (const [nodeId, pos] of nodePositions.entries()) {
      if (nodeId !== excludeNodeId) {
        const dx = Math.abs(pos.x - x);
        const dy = Math.abs(pos.y - y);
        if (dx < HORIZONTAL_SPACING * 0.8 && dy < VERTICAL_SPACING * 0.8) {
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    const path = new Set<string>();
    let currentNode = nodes.get(currentState.currentNodeId);
    while (currentNode) {
      path.add(currentNode.id);
      currentNode = currentNode.parentId ? nodes.get(currentNode.parentId) : undefined;
    }
    setActiveNodePath(path);
  }, [currentState.currentNodeId, nodes]);

  const handleDragStart = (nodeId: string, e: React.DragEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragging({
      nodeId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!dragging || !containerRef.current) return;
    if (e.clientX === 0 && e.clientY === 0) return;

    setNodePositions(prev => {
      const newPositions = new Map(prev);
      newPositions.set(dragging.nodeId, {
        x: e.clientX,
        y: e.clientY
      });
      return newPositions;
    });
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleSystemPromptEdit = (content: string) => {
    updateSystemPrompt(content);
  };

  const renderConnectors = () => {
    const connectors: JSX.Element[] = [];
    nodes.forEach((_, nodeId) => {
      if (nodeId !== 'root') {
        const node = nodes.get(nodeId);
        if (!node?.parentId) return;
        const startPos = nodePositions.get(node.parentId);
        const endPos = nodePositions.get(nodeId);
        if (startPos && endPos) {
          connectors.push(
            <TimelineConnector
              key={`${node.parentId}-${nodeId}`}
              start={{ x: startPos.x, y: startPos.y }}
              end={{ x: endPos.x, y: endPos.y }}
              isActive={activeNodePath.has(node.parentId) && activeNodePath.has(nodeId)}
              targetNode={node}
            />
          );
        }
      }
    });
    return connectors;
  };

  // 处理画布缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY;
    const newScale = viewport.scale * (1 + delta * zoomSensitivity);
    
    // 限制缩放范围
    const scale = Math.min(Math.max(newScale, 0.1), 3);
    
    // 计算鼠标位置相对于画布的坐标
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 计算新的偏移量，使缩放以鼠标位置为中心
    const newOffsetX = mouseX - (mouseX - viewport.offsetX) * (scale / viewport.scale);
    const newOffsetY = mouseY - (mouseY - viewport.offsetY) * (scale / viewport.scale);
    
    setViewport({ scale, offsetX: newOffsetX, offsetY: newOffsetY });
  };

  // 处理画布拖动
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 只响应空白处的点击，不包括节点
    if ((e.target as HTMLElement).closest('.timeline-node')) return;
    
    setIsDraggingCanvas(true);
    setLastMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return;
    
    const deltaX = e.clientX - lastMousePosition.x;
    const deltaY = e.clientY - lastMousePosition.y;
    
    setViewport(prev => ({
      ...prev,
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY
    }));
    
    setLastMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  // 添加键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 空格键切换拖动模式
      if (e.code === 'Space') {
        setIsDraggingCanvas(e.type === 'keydown');
      }
      // 0 键重置视图
      if (e.key === '0' && e.ctrlKey) {
        setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyPress);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[calc(100vh-120px)] overflow-hidden bg-gray-50 rounded-xl shadow-inner
        ${isDraggingCanvas ? 'cursor-grab' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      {/* 添加网格背景 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${20 * viewport.scale}px ${20 * viewport.scale}px`,
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px)`
        }}
      />

      {/* 内容容器 - 确保SVG和节点在同一个transform容器内 */}
      <div 
        style={{
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          width: '100%',
          height: '100%'
        }}
      >
        {/* SVG连接线层 */}
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }} // 重要：允许SVG内容超出边界
        >
          {renderConnectors()}
        </svg>
        
        {/* 节点层 */}
        {Array.from(nodes.entries()).map(([nodeId, node]) => {
          const position = nodePositions.get(nodeId) || { x: 0, y: 0 };
          return (
            <TimelineNode
              key={nodeId}
              node={node}
              position={position}
              isActive={nodeId === currentState.currentNodeId}
              hasBeenExplored={currentState.exploredBranches.has(nodeId)}
              onClick={() => navigate(nodeId)}
              onJumpClick={() => jumpToTimeline(nodeId)}
              onDragStart={(e) => handleDragStart(nodeId, e)}
              onDragEnd={handleDragEnd}
              onDrag={handleDrag}
              onSystemPromptEdit={nodeId === 'root' ? handleSystemPromptEdit : undefined}
              totalNodes={nodes.size}
            />
          );
        })}
      </div>

      {/* 添加缩放控制器 - 移到左下角 */}
      <div className="absolute bottom-24 left-4 flex gap-2 bg-white rounded-lg shadow p-2 z-10">
        <button 
          className="px-2 hover:bg-gray-100 rounded"
          onClick={() => setViewport(prev => ({ ...prev, scale: prev.scale * 1.2 }))}
        >
          +
        </button>
        <span className="px-2">{Math.round(viewport.scale * 100)}%</span>
        <button 
          className="px-2 hover:bg-gray-100 rounded"
          onClick={() => setViewport(prev => ({ ...prev, scale: prev.scale / 1.2 }))}
        >
          -
        </button>
      </div>
    </div>
  );
};