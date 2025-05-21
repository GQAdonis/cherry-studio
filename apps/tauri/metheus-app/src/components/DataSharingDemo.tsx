import { useState } from 'react';
import { invoke } from '../utils/tauri';
import { syncStorage } from '../utils/syncStorage';
import { syncDb } from '../utils/syncDatabase';
import { Button } from './ui/button';

/**
 * DataSharingDemo component demonstrates the data sharing mechanisms between windows
 * in the Tauri application. It showcases:
 * 1. Shared state using Tauri commands
 * 2. Synchronized localStorage across windows
 * 3. Synchronized IndexedDB across windows
 */
export function DataSharingDemo() {
  // State for shared state demo
  const [sharedStateKey, setSharedStateKey] = useState('demo-key');
  const [sharedStateValue, setSharedStateValue] = useState('');
  const [retrievedSharedValue, setRetrievedSharedValue] = useState<string | null>(null);

  // State for localStorage demo
  const [storageKey, setStorageKey] = useState('demo-storage-key');
  const [storageValue, setStorageValue] = useState('');
  const [retrievedStorageValue, setRetrievedStorageValue] = useState<string | null>(null);

  // State for IndexedDB demo
  const [dbKey, setDbKey] = useState('demo-db-key');
  const [dbValue, setDbValue] = useState('');
  const [retrievedDbValue, setRetrievedDbValue] = useState<string | null>(null);

  // Generate a random ID for this window instance
  const windowInstanceId = useState(() =>
    `window-${Math.random().toString(36).substring(2, 9)}`
  )[0];

  // Shared State Functions
  const setSharedState = async () => {
    try {
      await invoke('set_shared_state', {
        key: sharedStateKey,
        value: sharedStateValue,
      });
      alert(`Shared state set: ${sharedStateKey} = ${sharedStateValue}`);
    } catch (error) {
      console.error('Error setting shared state:', error);
      alert(`Error setting shared state: ${error}`);
    }
  };

  const getSharedState = async () => {
    try {
      const value = await invoke<string | null>('get_shared_state', {
        key: sharedStateKey,
      });
      setRetrievedSharedValue(value);
    } catch (error) {
      console.error('Error getting shared state:', error);
      alert(`Error getting shared state: ${error}`);
    }
  };

  // Sync Storage Functions
  const setSyncStorage = () => {
    try {
      syncStorage.setItem(storageKey, storageValue);
      alert(`Storage set: ${storageKey} = ${storageValue}`);
    } catch (error) {
      console.error('Error setting sync storage:', error);
      alert(`Error setting sync storage: ${error}`);
    }
  };

  const getSyncStorage = () => {
    try {
      const value = syncStorage.getItem<string>(storageKey);
      setRetrievedStorageValue(value);
    } catch (error) {
      console.error('Error getting sync storage:', error);
      alert(`Error getting sync storage: ${error}`);
    }
  };

  // Sync Database Functions
  const setSyncDb = async () => {
    try {
      await syncDb.putItem(dbKey, dbValue);
      alert(`Database set: ${dbKey} = ${dbValue}`);
    } catch (error) {
      console.error('Error setting sync database:', error);
      alert(`Error setting sync database: ${error}`);
    }
  };

  const getSyncDb = async () => {
    try {
      const value = await syncDb.getItem<string>(dbKey);
      setRetrievedDbValue(value || null);
    } catch (error) {
      console.error('Error getting sync database:', error);
      alert(`Error getting sync database: ${error}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Data Sharing Demo (Instance ID: {windowInstanceId})</h1>
      <p className="mb-4 text-gray-600">
        This demo showcases the data sharing mechanisms between windows in the Tauri application.
        Open multiple windows to test the synchronization.
      </p>

      {/* Shared State Demo */}
      <div className="mb-8 p-4 border border-gray-200 rounded-md">
        <h2 className="text-xl font-semibold mb-4">1. Shared State (Rust Backend)</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={sharedStateKey}
              onChange={(e) => setSharedStateKey(e.target.value)}
              placeholder="Key"
              className="border p-2 rounded w-1/3"
            />
            <input
              type="text"
              value={sharedStateValue}
              onChange={(e) => setSharedStateValue(e.target.value)}
              placeholder="Value"
              className="border p-2 rounded w-1/3"
            />
            <Button onClick={setSharedState}>Set Shared State</Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={getSharedState}>Get Shared State</Button>
            <span className="ml-2">
              Retrieved value: {retrievedSharedValue !== null ? retrievedSharedValue : '(none)'}
            </span>
          </div>
        </div>
      </div>

      {/* Sync Storage Demo */}
      <div className="mb-8 p-4 border border-gray-200 rounded-md">
        <h2 className="text-xl font-semibold mb-4">2. Synchronized localStorage</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={storageKey}
              onChange={(e) => setStorageKey(e.target.value)}
              placeholder="Key"
              className="border p-2 rounded w-1/3"
            />
            <input
              type="text"
              value={storageValue}
              onChange={(e) => setStorageValue(e.target.value)}
              placeholder="Value"
              className="border p-2 rounded w-1/3"
            />
            <Button onClick={setSyncStorage}>Set Storage</Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={getSyncStorage}>Get Storage</Button>
            <span className="ml-2">
              Retrieved value: {retrievedStorageValue !== null ? retrievedStorageValue : '(none)'}
            </span>
          </div>
        </div>
      </div>

      {/* Sync Database Demo */}
      <div className="mb-8 p-4 border border-gray-200 rounded-md">
        <h2 className="text-xl font-semibold mb-4">3. Synchronized IndexedDB</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={dbKey}
              onChange={(e) => setDbKey(e.target.value)}
              placeholder="Key"
              className="border p-2 rounded w-1/3"
            />
            <input
              type="text"
              value={dbValue}
              onChange={(e) => setDbValue(e.target.value)}
              placeholder="Value"
              className="border p-2 rounded w-1/3"
            />
            <Button onClick={setSyncDb}>Set Database</Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={getSyncDb}>Get Database</Button>
            <span className="ml-2">
              Retrieved value: {retrievedDbValue !== null ? retrievedDbValue : '(none)'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>
          Instructions:
        </p>
        <ol className="list-decimal pl-5 mt-2">
          <li>Open multiple windows of this application</li>
          <li>Set values in one window</li>
          <li>Retrieve the values in another window</li>
          <li>Observe that the data is synchronized across windows</li>
        </ol>
      </div>
    </div>
  );
}
