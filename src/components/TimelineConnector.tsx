import React from 'react';
import { DialogueNode } from '../types/dialogue';

interface TimelineConnectorProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
  isActive: boolean;
  targetNode: DialogueNode;
}

export const TimelineConnector: React.FC<TimelineConnectorProps> = ({ 
  start, 
  end, 
  isActive,
  targetNode
}) => {
  const midX = start.x + (end.x - start.x) * 0.5;
  
  const getConnectorStyle = () => {
    if (targetNode.metadata.branchType === 'alternate') {
      return {
        stroke: isActive ? '#22C55E' : '#86EFAC',
        strokeDasharray: '4,4',
        strokeWidth: isActive ? 3 : 2
      };
    }
    if (targetNode.metadata.branchType === 'merged') {
      return {
        stroke: isActive ? '#A855F7' : '#D8B4FE',
        strokeDasharray: '8,4',
        strokeWidth: isActive ? 3 : 2
      };
    }
    return {
      stroke: isActive ? '#3B82F6' : '#93C5FD',
      strokeDasharray: 'none',
      strokeWidth: isActive ? 4 : 3
    };
  };

  const style = getConnectorStyle();

  return (
    <path
      d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`}
      fill="none"
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeDasharray={style.strokeDasharray}
      className="transition-all duration-300"
    />
  );
};