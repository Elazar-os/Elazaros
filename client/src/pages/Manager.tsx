import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';

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

function PinPad({ onSuccess }: { onSuccess: (name: string, token: string) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      setLoading(true);
      fetch('/api/manager/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            onSuccess(data.name, data.token);
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 600);
          }
        })
        .catch(() => {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        })
        .finally(() => setLoading(false));
    }
  }, [pin, onSuccess]);

  const handleDelete = useCallback(() => {
    setPin(p => p.slice(0, -1));
    setError(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      if (e.key === 'Backspace') handleDelete();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDigit, handleDelete]);

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center p-4" data-testid="pin-screen">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" data-testid="pin-title">King of Delancey</h1>
        <p className="text-gray-400 text-sm">Enter your manager PIN</p>
      </div>

      <div className={`flex gap-4 mb-8 ${error ? 'animate-shake' : ''}`} data-testid="pin-dots">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? error ? 'bg-red-500 border-red-500' : 'bg-white border-white'
                : error ? 'border-red-500' : 'border-gray-500'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xs w-full" data-testid="pin-pad">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === '⌫') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                disabled={loading}
                className="h-16 rounded-xl bg-gray-800 text-white text-xl font-medium active:bg-gray-700 transition-colors"
                data-testid="btn-pin-delete"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={loading}
              className="h-16 rounded-xl bg-gray-800 text-white text-2xl font-medium active:bg-gray-600 transition-colors hover:bg-gray-700"
              data-testid={`btn-pin-${d}`}
            >
              {d}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}

function ItemList({ managerName, token }: { managerName: string; token: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchItems = useCallback(() => {
    fetch('/api/menu-items')
      .then(r => r.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      })
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
        if (msg.type === 'MENU_UPDATE') {
          fetchItems();
        }
      } catch {}
    };

    ws.onclose = () => {
      setTimeout(() => {
        const newWs = new WebSocket(`${protocol}//${window.location.host}/ws`);
        wsRef.current = newWs;
        newWs.onmessage = ws.onmessage;
      }, 3000);
    };

    return () => { ws.close(); };
  }, [fetchItems]);

  const toggle86 = useCallback((item: MenuItem) => {
    setTogglingId(item.id);
    fetch('/api/manager/toggle-86', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    })
      .then(r => r.json())
      .then(updated => {
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      })
      .finally(() => setTogglingId(null));
  }, [token]);

  const searchLower = search.toLowerCase();
  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(searchLower) ||
    i.category.toLowerCase().includes(searchLower)
  );

  const disabledFirst = [...filtered].sort((a, b) => {
    if (a.enabled === b.enabled) return 0;
    return a.enabled ? 1 : -1;
  });

  const screenLabel = (item: MenuItem) => {
    const type = item.screenType === 'sushi' ? 'Sushi' : 'Main';
    return `${type} ${item.screenNumber}`;
  };

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col" data-testid="manager-item-list">
      <div className="sticky top-0 z-10 bg-[#111] border-b border-gray-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" data-testid="manager-title">86 Manager</h1>
            <p className="text-xs text-gray-500">Logged in as {managerName}</p>
          </div>
          <div className="text-xs text-gray-500" data-testid="text-item-count">
            {items.filter(i => !i.enabled).length} item{items.filter(i => !i.enabled).length !== 1 ? 's' : ''} 86'd
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search items or categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            data-testid="input-search"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              data-testid="btn-clear-search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
        ) : disabledFirst.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-gray-500">No items found</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {disabledFirst.map(item => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 ${!item.enabled ? 'bg-red-950/20' : ''}`}
                data-testid={`item-row-${item.id}`}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${!item.enabled ? 'text-red-400 line-through' : ''}`} data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 whitespace-nowrap" data-testid={`badge-screen-${item.id}`}>
                      {screenLabel(item)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate" data-testid={`text-category-${item.id}`}>{item.category}</p>
                </div>

                <button
                  onClick={() => toggle86(item)}
                  disabled={togglingId === item.id}
                  className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    item.enabled
                      ? 'bg-gray-800 text-white active:bg-gray-700 hover:bg-gray-700'
                      : 'bg-red-600 text-white active:bg-red-700 hover:bg-red-700'
                  } ${togglingId === item.id ? 'opacity-50' : ''}`}
                  data-testid={`btn-toggle-${item.id}`}
                >
                  {item.enabled ? '86 Item' : 'Re-Enable'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Manager() {
  const [authed, setAuthed] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerToken, setManagerToken] = useState('');
  const [slideIn, setSlideIn] = useState(false);

  const handlePinSuccess = (name: string, token: string) => {
    setManagerName(name);
    setManagerToken(token);
    setSlideIn(true);
    setTimeout(() => setAuthed(true), 300);
  };

  if (authed) {
    return <ItemList managerName={managerName} token={managerToken} />;
  }

  return (
    <div className={`transition-transform duration-300 ${slideIn ? '-translate-x-full' : ''}`}>
      <PinPad onSuccess={handlePinSuccess} />
    </div>
  );
}
