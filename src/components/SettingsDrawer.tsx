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
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed left-0 top-0 bottom-0 w-72 z-50 shadow-xl"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>設定</h2>
          <button
            onClick={onClose}
            className="p-2 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Sync Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              同期キー
            </label>
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="32文字の同期キーを入力"
              className="w-full px-3 py-2 rounded text-sm font-mono"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />
            <button
              onClick={handleSave}
              className="w-full px-3 py-2 text-white rounded text-sm transition-colors"
              style={{ backgroundColor: 'var(--accent-green)' }}
            >
              保存
            </button>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Androidアプリの同期キーを入力すると、データを同期できます
            </p>
          </div>

          {/* Device ID */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              デバイスID
            </label>
            <p className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
              {syncState.device_id}
            </p>
          </div>

          {/* Sync Status */}
          {syncState.sync_key && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>同期状態:</span>
                {isSyncing ? (
                  <span className="text-sm" style={{ color: 'var(--accent-blue)' }}>同期中...</span>
                ) : lastSyncResult === 'success' ? (
                  <span className="text-sm" style={{ color: 'var(--grass-4)' }}>同期済み</span>
                ) : lastSyncResult === 'error' ? (
                  <span className="text-sm" style={{ color: 'var(--accent-red)' }}>エラー</span>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>未同期</span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
                className="w-full px-3 py-2 text-white rounded text-sm disabled:opacity-50 transition-colors"
                style={{ backgroundColor: 'var(--accent-blue)' }}
              >
                {isSyncing ? '同期中...' : '今すぐ同期'}
              </button>

              <button
                onClick={() => setShowConfirmRepair(true)}
                disabled={isSyncing}
                className="w-full px-3 py-2 text-white rounded text-sm disabled:opacity-50 transition-colors"
                style={{ backgroundColor: 'var(--accent-orange)' }}
              >
                データを修復
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Repair Confirmation */}
      {showConfirmRepair && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div
            className="rounded-lg p-6 max-w-sm mx-4"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>データを修復</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              サーバーからすべてのデータを取得し、ローカルデータを上書きします。この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRepair}
                className="flex-1 px-4 py-2 text-white rounded transition-colors"
                style={{ backgroundColor: 'var(--accent-orange)' }}
              >
                修復する
              </button>
              <button
                onClick={() => setShowConfirmRepair(false)}
                className="flex-1 px-4 py-2 rounded transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
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
