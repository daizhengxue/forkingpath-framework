export interface DialogueMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  nodeId?: string; 
}

export interface DialogueNode {
  id: string;
  messages: DialogueMessage[];
  parentId: string | null;
  metadata: {
    universe: string;
    branchType?: 'alternate' | 'merged' | 'main';
    tags: string[];
    title: string;
  };
}

export interface TimelineState {
  currentNodeId: string;
  history: string[];
  exploredBranches: Set<string>;
}

export interface DialogueAction {
  type: 'NAVIGATE' | 'CREATE_BRANCH' | 'MERGE_TIMELINES' | 'RESET';
  payload: any;
}