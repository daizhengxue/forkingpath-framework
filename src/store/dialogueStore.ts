import { create } from 'zustand';
import { DialogueNode, TimelineState, DialogueMessage } from '../types/dialogue';

interface DialogueStore {
  nodes: Map<string, DialogueNode>;
  currentState: TimelineState;
  addNode: (messages: DialogueMessage[], metadata: {
    universe: string;
    branchType?: 'main' | 'alternate' | 'merged';
    tags: string[];
    title: string;
  }) => void;
  createBranch: (parentId: string, messages: DialogueMessage[]) => string;
  navigate: (nodeId: string) => void;
  jumpToTimeline: (nodeId: string) => void;
  mergeTimelines: (nodeIds: string[]) => string;
  reset: () => void;
  getDialogueHistory: (nodeId: string, recursive?: boolean) => DialogueMessage[];
  updateSystemPrompt: (content: string) => void;
}

export const useDialogueStore = create<DialogueStore>((set, get) => ({
  nodes: new Map(),
  currentState: {
    currentNodeId: 'root',
    history: ['root'],
    exploredBranches: new Set(['root'])
  },

  updateSystemPrompt: (content: string) => {
    set((state) => {
      const rootNode = state.nodes.get('root');
      if (!rootNode) return state;

      const updatedMessages = rootNode.messages.map(msg => 
        msg.role === 'system' ? { ...msg, content } : msg
      );

      const newNodes = new Map(state.nodes);
      newNodes.set('root', { ...rootNode, messages: updatedMessages });
      
      return { nodes: newNodes };
    });
  },

  getDialogueHistory: (nodeId: string, recursive: boolean = true) => {
    const nodes = get().nodes;
    const messages: DialogueMessage[] = [];
    let currentNode = nodes.get(nodeId);

    if (!currentNode) {
      return messages;
    }

    if (!recursive) {
      return [...currentNode.messages];
    }

    while (currentNode) {
      messages.unshift(...currentNode.messages);
      if (currentNode.parentId) {
        currentNode = nodes.get(currentNode.parentId);
      } else {
        break;
      }
    }

    return messages;
  },

  addNode: (messages: DialogueMessage[], metadata = {
    universe: 'main',
    branchType: 'main',
    tags: [],
    title: messages[0]?.content.slice(0, 30) + '...' || 'New node'
  }) => {
    //const currentNode = get().nodes.get(get().currentState.currentNodeId);
    const newId = crypto.randomUUID();
    
    const node: DialogueNode = {
      id: newId,
      messages,
      parentId: get().currentState.currentNodeId,
      metadata
    };

    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.set(node.id, node);
      return { 
        nodes: newNodes,
        currentState: {
          ...state.currentState,
          currentNodeId: node.id,
          history: [...state.currentState.history, node.id],
          exploredBranches: new Set([...state.currentState.exploredBranches, node.id])
        }
      };
    });
  },

  navigate: (nodeId) => {
    set((state) => {
      const newHistory = [...state.currentState.history, nodeId];
      const newExplored = new Set(state.currentState.exploredBranches);
      newExplored.add(nodeId);

      return {
        currentState: {
          currentNodeId: nodeId,
          history: newHistory,
          exploredBranches: newExplored
        }
      };
    });
  },

  jumpToTimeline: (nodeId) => {
    set((state) => {
      const newHistory = [nodeId];
      const newExplored = new Set(state.currentState.exploredBranches);
      newExplored.add(nodeId);

      return {
        currentState: {
          currentNodeId: nodeId,
          history: newHistory,
          exploredBranches: newExplored
        }
      };
    });
  },

  createBranch: (parentId, messages) => {
    if (parentId === 'root') return parentId; // Prevent branching from root

    const newId = crypto.randomUUID();
    
    const node: DialogueNode = {
      id: newId,
      messages,
      parentId,
      metadata: {
        universe: `branch-${newId.slice(0, 8)}`,
        branchType: 'alternate',
        tags: [],
        title: messages[messages.length - 1]?.content.slice(0, 30) + '...' || 'New branch'
      }
    };

    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.set(node.id, node);
      return { nodes: newNodes };
    });

    return newId;
  },

  mergeTimelines: (nodeIds) => {
    const newId = crypto.randomUUID();
    const nodes = nodeIds.map(id => get().nodes.get(id)!);
    const mergedMessages = nodes.flatMap(n => n.messages);

    const mergedNode: DialogueNode = {
      id: newId,
      messages: mergedMessages,
      parentId: nodes[0].parentId,
      metadata: {
        universe: `merged-${newId.slice(0, 8)}`,
        branchType: 'merged',
        tags: nodes.flatMap(n => n.metadata.tags),
        title: 'Merged timeline'
      }
    };

    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.set(newId, mergedNode);
      return { nodes: newNodes };
    });

    return newId;
  },

  reset: () => {
    const initialMessage: DialogueMessage = {
      role: 'system',
      content: 'You are a helpful assistant.',
      timestamp: Date.now()
    };

    set({
      nodes: new Map([['root', {
        id: 'root',
        messages: [initialMessage],
        parentId: null,
        metadata: {
          universe: 'main',
          branchType: 'main',
          tags: [],
          title: 'System Configuration'
        }
      }]]),
      currentState: {
        currentNodeId: 'root',
        history: ['root'],
        exploredBranches: new Set(['root'])
      }
    });
  }
}));