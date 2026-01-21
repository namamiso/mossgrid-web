import { useState } from 'react';
import { GrassCalendar } from './components/GrassCalendar';
import { HabitSection } from './components/HabitSection';
import { TodoSection } from './components/TodoSection';
import { SettingsDrawer } from './components/SettingsDrawer';
import { useStore } from './store';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { syncState, isSyncing, lastSyncResult } = useStore();

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-green-600">MossGrid</h1>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-2">
          {syncState.sync_key ? (
            <>
              {isSyncing ? (
                <span className="text-xs text-blue-500 flex items-center gap-1">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  同期中
                </span>
              ) : lastSyncResult === 'success' ? (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  同期済み
                </span>
              ) : lastSyncResult === 'error' ? (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  エラー
                </span>
              ) : (
                <span className="text-xs text-gray-500">接続済み</span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">未接続</span>
          )}
        </div>
      </header>

      {/* Main content - scrollable sections */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Grass Calendar - fixed height */}
        <div className="flex-shrink-0">
          <GrassCalendar />
        </div>

        {/* Habit Section - fixed height with internal scroll */}
        <div className="flex-shrink-0 max-h-[30vh] overflow-y-auto">
          <HabitSection />
        </div>

        {/* Todo Section - fills remaining space */}
        <TodoSection />
      </main>

      {/* Settings Drawer */}
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
