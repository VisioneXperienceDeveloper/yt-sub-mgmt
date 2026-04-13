import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '../../shared/store/settingsStore';
import { useChannelStore } from '../../shared/store/channelStore';
import { useTagStore } from '../../shared/store/tagStore';
import { storageSet } from '../../shared/utils/storage';
import { STORAGE_KEYS } from '../../shared/constants';

export const SettingsView = () => {
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { analyzeInactivity, isLoading: isChannelsLoading } = useChannelStore();
  const { tags } = useTagStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleExport = () => {
    const data = {
      tags,
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yt-sub-mgmt-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup file downloaded');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.tags) await storageSet(STORAGE_KEYS.TAGS, data.tags);
        if (data.settings) await updateSettings(data.settings);
        
        toast.success('Restore successful! Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const runAnalysis = async () => {
    await analyzeInactivity();
    toast.success('Activity analysis complete');
  };

  return (
    <div className="flex-1 p-10 mx-auto space-y-12 pb-24">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-zinc-500 mt-2">Personalize your experience and manage data</p>
      </header>

      {/* Analysis Settings */}
      {/* <section className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Activity Analysis</h3>
            <p className="text-sm text-zinc-500 mt-1">Define when a channel is considered inactive.</p>
          </div>
          <button 
            onClick={runAnalysis}
            disabled={isChannelsLoading}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          >
            {isChannelsLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />}
            Refresh Activity Now
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-zinc-400">Inactivity Threshold</span>
            <span className="text-red-500">{settings.inactivityThresholdMonths} Months</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="12" 
            step="1"
            value={settings.inactivityThresholdMonths}
            onChange={(e) => updateSettings({ inactivityThresholdMonths: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 uppercase font-bold px-1">
            <span>1 Month</span>
            <span>6 Months</span>
            <span>12 Months</span>
          </div>
        </div>
      </section> */}

      {/* Display Settings */}
      <section className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-8 space-y-8">
        <div>
          <h3 className="text-lg font-bold">Display Preferences</h3>
          <p className="text-sm text-zinc-500 mt-1">Customize how dates and information are presented.</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-400">Date Format</p>
          <div className="grid grid-cols-3 gap-3">
            {(['YY/MM/dd', 'MM/dd/YY', 'dd/MM/YY'] as const).map((format) => (
              <button
                key={format}
                onClick={() => updateSettings({ dateFormat: format })}
                className={`
                  py-3 px-4 rounded-xl text-xs font-bold border transition-all
                  ${settings.dateFormat === format 
                    ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-500/5' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }
                `}
              >
                {format}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Storage & Recovery */}
      <section className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-8 space-y-8">
        <div>
          <h3 className="text-lg font-bold">Storage & Recovery</h3>
          <p className="text-sm text-zinc-500 mt-1">If you experience synchronization issues or outdated data, you can force a full reset of the local cache.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <button 
            onClick={() => {
              if (confirm('Warning: This will clear all local cache and reload the extension. Your tags will be preserved if they are synced with storage. Proceed?')) {
                useChannelStore.getState().clearCacheAndSync();
              }
            }}
            className="flex-1 flex items-center gap-4 p-4 bg-zinc-900 border border-red-900/20 rounded-2xl hover:bg-red-900/10 transition-all text-left group"
          >
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm text-red-500">Hard Reset</p>
              <p className="text-xs text-zinc-500">Clear cache and force full sync</p>
            </div>
          </button>
          <div className="flex-1 p-4 bg-zinc-900/30 rounded-2xl flex items-center justify-center text-center">
            <p className="text-[10px] text-zinc-600 italic">Version 2.0.4 • Diagnostics Enabled</p>
          </div>
        </div>
      </section>

      {/* Backup & Restore */}
      <section className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-8 space-y-8">
        <div>
          <h3 className="text-lg font-bold">Data Management</h3>
          <p className="text-sm text-zinc-500 mt-1">Export your tags and configuration for backup or import a previous backup.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleExport}
            className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all text-left group"
          >
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">Export Data</p>
              <p className="text-xs text-zinc-500">Save tags to JSON</p>
            </div>
          </button>

          <label className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all text-left group cursor-pointer">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">Import Data</p>
              <p className="text-xs text-zinc-500">Restore from JSON backup</p>
            </div>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </section>

      {/* About */}
      <div className="text-center pt-8">
        <p className="text-zinc-600 text-xs tracking-widest uppercase font-bold">YouTube Subscription Manager v2.0</p>
        <p className="text-zinc-500 text-[10px] mt-2 italic px-8">"Organize your digital life, one channel at a time."</p>
      </div>
    </div>
  );
};
