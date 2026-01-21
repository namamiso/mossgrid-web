import { useState } from 'react';
import { useStore } from '../store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: Props) {
  const { syncState, setSyncKey, sync, repairData, isSyncing, lastSyncResult } = useStore();
  const [inputKey, setInputKey] = useState(syncState.sync_key);
  const [showConfirmRepair, setShowConfirmRepair] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSyncKey(inputKey.trim());
    if (inputKey.trim()) {
      sync();
    }
  };

  const handleSync = async () => {
    await sync();
  };

  const handleRepair = async () => {
    setShowConfirmRepair(false);
    await repairData();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 z-50 shadow-xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">設定</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Sync Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              同期キー
            </label>
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="32文字の同期キーを入力"
              className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 font-mono"
            />
            <button
              onClick={handleSave}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              保存
            </button>
            <p className="text-xs text-gray-500">
              Androidアプリの同期キーを入力すると、データを同期できます
            </p>
          </div>

          {/* Device ID */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              デバイスID
            </label>
            <p className="text-xs font-mono text-gray-500 break-all">
              {syncState.device_id}
            </p>
          </div>

          {/* Sync Status */}
          {syncState.sync_key && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">同期状態:</span>
                {isSyncing ? (
                  <span className="text-blue-500 text-sm">同期中...</span>
                ) : lastSyncResult === 'success' ? (
                  <span className="text-green-500 text-sm">同期済み</span>
                ) : lastSyncResult === 'error' ? (
                  <span className="text-red-500 text-sm">エラー</span>
                ) : (
                  <span className="text-gray-500 text-sm">未同期</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                最終seq: {syncState.last_server_seq}
              </p>
            </div>
          )}

          {/* Sync Actions */}
          {syncState.sync_key && (
            <div className="space-y-2">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                {isSyncing ? '同期中...' : '今すぐ同期'}
              </button>

              <button
                onClick={() => setShowConfirmRepair(true)}
                disabled={isSyncing}
                className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
              >
                データを修復
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Repair Confirmation */}
      {showConfirmRepair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-2">データを修復</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              サーバーからすべてのデータを取得し、ローカルデータを上書きします。この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRepair}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                修復する
              </button>
              <button
                onClick={() => setShowConfirmRepair(false)}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
