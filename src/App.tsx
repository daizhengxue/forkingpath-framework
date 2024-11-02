import React from 'react';
import { TimelineVisualizer } from './components/TimelineVisualizer';
import { DialogueInput } from './components/DialogueInput';
import { Flower } from 'lucide-react';
import { useDialogueStore } from './store/dialogueStore';

const App: React.FC = () => {
  const { reset } = useDialogueStore();

  React.useEffect(() => {
    reset();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flower className="w-7 h-7 text-purple-500" />
              <h1 className="text-2xl font-bold text-gray-900">The Garden of Forking Paths</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto p-8">
        <TimelineVisualizer />
        <DialogueInput />
      </main>
    </div>
  );
};

export default App;