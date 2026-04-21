import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Check, ExternalLink, RefreshCw, Loader2, AlertTriangle, Mic, MicOff } from 'lucide-react';

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  screenType: string;
  screenNumber: number;
  priority: number;
  enabled: boolean;
};

type BossTab = 'home' | 'items' | 'featured' | 'kasa' | '86report';

function InviteCodeScreen({ onAuth }: { onAuth: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const deviceId = crypto.randomUUID();
      const res = await fetch('/api/invite-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), deviceId }),
      });
      if (!res.ok) {
        setError('Invalid code. Please try again.');
        setCode('');
      } else {
        localStorage.setItem('kod-boss-token', deviceId);
        onAuth();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6" data-testid="boss-invite-screen">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white tracking-wider mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '4px' }} data-testid="boss-logo">
          KING OF DELANCEY
        </h1>
        <div className="w-12 h-0.5 bg-[#E8102E] mx-auto mt-2" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter invite code"
          maxLength={8}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-white text-center text-lg tracking-[0.3em] font-mono placeholder-gray-600 focus:outline-none focus:border-[#E8102E]"
          autoFocus
          data-testid="input-invite-code"
        />
        <button
          type="submit"
          disabled={loading || code.length < 4}
          className="w-full bg-[#E8102E] text-white py-3 rounded-lg font-semibold text-sm tracking-wider uppercase disabled:opacity-40 active:bg-[#c00d25]"
          data-testid="btn-submit-code"
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
        {error && (
          <p className="text-red-500 text-sm text-center" data-testid="text-invite-error">{error}</p>
        )}
      </form>
    </div>
  );
}

function BossApp() {
  const [tab, setTab] = useState<BossTab>('home');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [featuredName, setFeaturedName] = useState('');
  const [featuredDesc, setFeaturedDesc] = useState('');
  const [featuredActive, setFeaturedActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchItems = useCallback(() => {
    fetch('/api/menu-items')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'MENU_UPDATE') fetchItems();
      } catch {}
    };
    ws.onclose = () => {
      setTimeout(() => {
        const newWs = new WebSocket(`${protocol}//${window.location.host}/ws`);
        wsRef.current = newWs;
        newWs.onmessage = ws.onmessage;
      }, 5000);
    };
    return () => { ws.close(); };
  }, [fetchItems]);

  const pushToScreens = async () => {
    setPushing(true);
    try { await fetch('/api/refresh-screens', { method: 'POST' }); }
    catch {}
    finally { setPushing(false); }
  };

  const toggle86 = useCallback(async (item: MenuItem) => {
    setTogglingId(item.id);
    try {
      const res = await fetch(`/api/menu-items/${item.id}/enabled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      }
    } catch {}
    finally { setTogglingId(null); }
  }, []);

  const savePrice = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/menu-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: editPriceValue }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      }
    } catch {}
    setEditingPriceId(null);
    setEditPriceValue('');
  }, [editPriceValue]);

  const getBossToken = () => localStorage.getItem('kod-boss-token') || '';

  const setFeatured = async () => {
    if (!featuredName.trim()) return;
    try {
      await fetch('/api/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getBossToken()}` },
        body: JSON.stringify({ name: featuredName, description: featuredDesc }),
      });
      setFeaturedActive(true);
    } catch {}
  };

  const clearFeatured = async () => {
    try {
      await fetch('/api/featured/clear', { method: 'POST', headers: { 'Authorization': `Bearer ${getBossToken()}` } });
      setFeaturedActive(false);
      setFeaturedName('');
      setFeaturedDesc('');
    } catch {}
  };

  const startVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceResult('Voice recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceResult('Listening...');
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceResult(`Processing: "${transcript}"`);

      try {
        const res = await fetch('/api/voice-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: transcript }),
        });
        const data = await res.json();
        
        if (data.success) {
          setVoiceResult(`✓ ${data.message}`);
          fetchItems();
        } else {
          setVoiceResult(`✗ ${data.message || 'Command not recognized'}`);
        }
      } catch {
        setVoiceResult('✗ Connection error');
      }

      setTimeout(() => setVoiceResult(''), 5000);
    };

    recognition.onerror = () => {
      setVoiceResult('✗ Voice recognition error');
      setIsListening(false);
      setTimeout(() => setVoiceResult(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopVoiceCommand = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const screenLabel = (item: MenuItem) => {
    const type = item.screenType === 'sushi' ? 'Sushi' : 'Main';
    return `${type} ${item.screenNumber}`;
  };

  const searchLower = search.toLowerCase();
  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(searchLower) ||
    i.category.toLowerCase().includes(searchLower)
  );

  const disabledItems = items.filter(i => !i.enabled);

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col" data-testid="boss-app">
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;600&display=swap" rel="stylesheet" />

      <header className="sticky top-0 z-20 bg-[#111] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '3px' }} data-testid="boss-header-logo">KOD</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={isListening ? stopVoiceCommand : startVoiceCommand}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-gray-800 text-gray-300 active:bg-gray-700'
            }`}
            data-testid="btn-voice-command"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={pushToScreens}
            disabled={pushing}
            className="bg-[#E8102E] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center gap-2 active:bg-[#c00d25] disabled:opacity-50"
            data-testid="btn-boss-push"
          >
            {pushing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Push to Screens
          </button>
        </div>
      </header>

      {voiceResult && (
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2 text-sm text-center" data-testid="voice-result">
          {voiceResult}
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && (
          <div className="p-4 space-y-4" data-testid="boss-home">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                data-testid="input-boss-search"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-1">
                {filtered.map(item => (
                  <div
                    key={item.id}
                    className={`rounded-lg border border-gray-800/50 p-3 ${!item.enabled ? 'bg-red-950/20 border-red-900/30' : 'bg-[#1a1a1a]'}`}
                    data-testid={`boss-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-semibold ${!item.enabled ? 'text-red-400 line-through' : ''}`}>{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{item.category}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{screenLabel(item)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {editingPriceId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editPriceValue}
                              onChange={e => setEditPriceValue(e.target.value)}
                              className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white text-right focus:outline-none"
                              autoFocus
                              data-testid={`input-price-${item.id}`}
                            />
                            <button
                              onClick={() => savePrice(item.id)}
                              className="p-1 text-green-500"
                              data-testid={`btn-save-price-${item.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingPriceId(null); setEditPriceValue(''); }}
                              className="p-1 text-gray-500"
                              data-testid={`btn-cancel-price-${item.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingPriceId(item.id); setEditPriceValue(item.price); }}
                            className="text-sm font-mono text-[#E8102E] bg-[#E8102E]/10 px-2 py-1 rounded"
                            data-testid={`btn-edit-price-${item.id}`}
                          >
                            ${item.price}
                          </button>
                        )}
                        <button
                          onClick={() => toggle86(item)}
                          disabled={togglingId === item.id}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                            item.enabled
                              ? 'bg-gray-800 text-gray-300 active:bg-gray-700'
                              : 'bg-red-600 text-white active:bg-red-700'
                          } ${togglingId === item.id ? 'opacity-50' : ''}`}
                          data-testid={`btn-boss-toggle-${item.id}`}
                        >
                          {item.enabled ? '86' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'items' && (
          <div className="p-4" data-testid="boss-items">
            <h2 className="text-lg font-bold mb-4">All Items</h2>
            <p className="text-sm text-gray-500 mb-4">{items.length} total items across all screens</p>
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-gray-800/50">
                  <div>
                    <span className="text-sm font-medium">{item.name}</span>
                    <div className="flex gap-1 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{item.category}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{screenLabel(item)}</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-[#E8102E]">${item.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'featured' && (
          <div className="p-4 space-y-4" data-testid="boss-featured">
            <h2 className="text-lg font-bold">Featured Item</h2>
            <p className="text-sm text-gray-500">Set a featured item to display on Main Screen 1</p>

            <input
              type="text"
              value={featuredName}
              onChange={e => setFeaturedName(e.target.value)}
              placeholder="Featured item name"
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-[#E8102E]"
              data-testid="input-featured-name"
            />
            <textarea
              value={featuredDesc}
              onChange={e => setFeaturedDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#E8102E] resize-none"
              data-testid="input-featured-desc"
            />
            <div className="flex gap-3">
              <button
                onClick={setFeatured}
                disabled={!featuredName.trim()}
                className="flex-1 bg-[#E8102E] text-white py-3 rounded-lg font-semibold text-sm tracking-wider uppercase disabled:opacity-40 active:bg-[#c00d25]"
                data-testid="btn-set-featured"
              >
                Set Featured Item
              </button>
              <button
                onClick={clearFeatured}
                disabled={!featuredActive}
                className="px-6 bg-gray-800 text-gray-300 py-3 rounded-lg font-semibold text-sm tracking-wider uppercase disabled:opacity-40 active:bg-gray-700"
                data-testid="btn-clear-featured"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {tab === 'kasa' && (
          <div className="p-4 space-y-4" data-testid="boss-kasa">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold">Screen Schedule</h2>
              <p className="text-sm text-gray-400">Use the Kasa app to adjust when screens turn on and off.</p>
              <a
                href="https://www.kasasmart.com/us/products/smart-plugs"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-[#E8102E] text-white py-3.5 rounded-lg font-semibold text-sm tracking-wider uppercase text-center active:bg-[#c00d25] flex items-center justify-center gap-2"
                data-testid="link-kasa"
              >
                <ExternalLink className="w-4 h-4" />
                Open Kasa App
              </a>
              <p className="text-xs text-gray-600 text-center">Contact your system administrator to adjust Kasa account access.</p>
            </div>
          </div>
        )}

        {tab === '86report' && (
          <div className="p-4 space-y-4" data-testid="boss-86report">
            <h2 className="text-lg font-bold">86 Report</h2>
            {disabledItems.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center" data-testid="text-all-active">All items active</p>
            ) : (
              <div className="space-y-2">
                {disabledItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-950/20 border border-red-900/30" data-testid={`86-item-${item.id}`}>
                    <div>
                      <span className="text-sm font-medium text-red-400">{item.name}</span>
                      <div className="flex gap-1 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{item.category}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{screenLabel(item)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle86(item)}
                      disabled={togglingId === item.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold active:bg-red-700 disabled:opacity-50"
                      data-testid={`btn-86-reenable-${item.id}`}
                    >
                      Re-Enable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-gray-800 flex z-30" data-testid="boss-nav">
        {[
          { id: 'home' as BossTab, label: 'Home', icon: '🏠' },
          { id: 'items' as BossTab, label: 'Items', icon: '📋' },
          { id: 'featured' as BossTab, label: 'Featured', icon: '⭐' },
          { id: 'kasa' as BossTab, label: 'Kasa', icon: '🔌' },
          { id: '86report' as BossTab, label: '86', icon: '🚫' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] uppercase tracking-wider transition-colors ${
              tab === t.id ? 'text-[#E8102E]' : 'text-gray-600'
            }`}
            data-testid={`nav-${t.id}`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function Boss() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kod-boss-token');
    if (token) {
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authed) {
    return <InviteCodeScreen onAuth={() => setAuthed(true)} />;
  }

  return <BossApp />;
}
