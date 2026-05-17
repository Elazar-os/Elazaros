import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Monitor, 
  ExternalLink, 
  RefreshCw,
  Plus,
  FolderPlus,
  Snowflake,
  Play,
  RotateCcw,
  Loader2,
  UtensilsCrossed,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useScreens, useMenuItems, useUpdateAvailability } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const screenDefs = [
  { screenType: 'main', screenNumber: 1, label: 'Main Screen 1', url: '/screen/main/1' },
  { screenType: 'main', screenNumber: 2, label: 'Main Screen 2', url: '/screen/main/2' },
  { screenType: 'main', screenNumber: 3, label: 'Main Screen 3', url: '/screen/main/3' },
  { screenType: 'sushi', screenNumber: 1, label: 'Sushi Screen 1', url: '/screen/sushi/1' },
  { screenType: 'sushi', screenNumber: 2, label: 'Sushi Screen 2', url: '/screen/sushi/2' },
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [pushing, setPushing] = useState(false);
  const [screensFrozen, setScreensFrozen] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceResult, setVoiceResult] = useState<{ success: boolean; message: string } | null>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [manualCommand, setManualCommand] = useState('');

  const { data: items = [], isLoading: loadingItems } = useMenuItems();
  const reEnableMutation = useUpdateAvailability();

  async function sendVoiceCommand(command: string) {
    setVoiceProcessing(true);
    setVoiceResult(null);
    try {
      const res = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      setVoiceResult({ success: data.success, message: data.message || data.error });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['menu-items'] });
        toast({ title: 'Hey Gary', description: data.message });
      } else {
        toast({ title: 'Hey Gary', description: data.message, variant: 'destructive' });
      }
    } catch {
      setVoiceResult({ success: false, message: 'Failed to process command' });
      toast({ title: 'Error', description: 'Voice command failed', variant: 'destructive' });
    } finally {
      setVoiceProcessing(false);
    }
  }

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Not supported', description: 'Speech recognition is not available in this browser.', variant: 'destructive' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setVoiceText('');
      setVoiceResult(null);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceText(transcript);

      if (event.results[0].isFinal) {
        setListening(false);
        sendVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error !== 'no-speech') {
        toast({ title: 'Mic Error', description: `Speech error: ${event.error}`, variant: 'destructive' });
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  const disabledItems = items.filter(i => !i.enabled);

  const groupedDisabled: Record<string, typeof disabledItems> = {};
  disabledItems.forEach(item => {
    const key = `${item.screenType === 'sushi' ? 'Sushi' : 'Main'} Screen ${item.screenNumber}`;
    if (!groupedDisabled[key]) groupedDisabled[key] = [];
    groupedDisabled[key].push(item);
  });

  async function pushToScreens() {
    setPushing(true);
    try {
      const res = await fetch('/api/refresh-screens', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Pushed to all screens', description: 'All TV displays will refresh now.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to push to screens.', variant: 'destructive' });
    } finally {
      setPushing(false);
    }
  }

  async function toggleFreeze() {
    setFreezing(true);
    try {
      const endpoint = screensFrozen ? '/api/unfreeze-screens' : '/api/freeze-screens';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setScreensFrozen(!screensFrozen);
      toast({ title: screensFrozen ? 'Screens Unfrozen' : 'Screens Frozen', description: screensFrozen ? 'Pagination and animations resumed.' : 'All screen animations paused.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle freeze.', variant: 'destructive' });
    } finally {
      setFreezing(false);
    }
  }

  function handleReEnable(id: number, name: string) {
    reEnableMutation.mutate({ id, enabled: true }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['menu-items'] });
        toast({ title: 'Re-enabled', description: `${name} is back on the menu.` });
      },
      onError: (error: any) => {
        toast({ 
          title: 'Error', 
          description: error?.message || 'Failed to re-enable item', 
          variant: 'destructive' 
        });
      }
    });
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="dashboard-title">Dashboard</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={pushToScreens}
          disabled={pushing}
          data-testid="btn-push-screens"
          className="gap-2"
        >
          {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Push to All Screens
        </Button>

        <Button
          variant="outline"
          onClick={() => setLocation('/admin/menu')}
          data-testid="btn-add-item"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>

        <Button
          variant="outline"
          onClick={() => setLocation('/admin/menu')}
          data-testid="btn-add-category"
          className="gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          Add Category
        </Button>

        <Button
          variant="outline"
          onClick={() => setLocation('/admin/menu')}
          data-testid="btn-menu-editor"
          className="gap-2"
        >
          <UtensilsCrossed className="w-4 h-4" />
          Menu Editor
        </Button>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFreeze}
            disabled={freezing}
            data-testid="btn-freeze"
            className="gap-2 text-muted-foreground"
          >
            {freezing ? <Loader2 className="w-3 h-3 animate-spin" /> : screensFrozen ? <Play className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
            {screensFrozen ? 'Unfreeze Screens' : 'Freeze Screens'}
          </Button>
        </div>
      </div>

      <Card data-testid="voice-command-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Hey Gary - Voice Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant={listening ? 'destructive' : 'default'}
              onClick={listening ? stopListening : startListening}
              disabled={voiceProcessing}
              data-testid="btn-voice"
              className="gap-2 min-w-[160px]"
            >
              {voiceProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : listening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              {voiceProcessing ? 'Processing...' : listening ? 'Stop Listening' : 'Hey Gary'}
            </Button>
            {listening && (
              <span className="flex items-center gap-2 text-sm text-red-500 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Listening...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualCommand}
              onChange={(e) => setManualCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCommand.trim()) {
                  sendVoiceCommand(manualCommand.trim());
                  setManualCommand('');
                }
              }}
              placeholder='Type a command, e.g. "Hey Gary, 86 M22 Roll"'
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
              data-testid="input-voice-command"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!manualCommand.trim() || voiceProcessing}
              onClick={() => {
                if (manualCommand.trim()) {
                  sendVoiceCommand(manualCommand.trim());
                  setManualCommand('');
                }
              }}
              data-testid="btn-send-command"
            >
              Send
            </Button>
          </div>

          {voiceText && (
            <div className="p-3 rounded-lg border bg-muted/30" data-testid="voice-transcript">
              <p className="text-xs text-muted-foreground mb-1">Heard:</p>
              <p className="text-sm font-medium">"{voiceText}"</p>
            </div>
          )}

          {voiceResult && (
            <div className={`p-3 rounded-lg border ${voiceResult.success ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`} data-testid="voice-result">
              <p className={`text-sm font-medium ${voiceResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {voiceResult.message}
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Examples:</strong></p>
            <p>"Hey Gary, 86 the M22 Roll"</p>
            <p>"Hey Gary, bring back the Dragon Roll"</p>
            <p>"Hey Gary, change the price of M22 Roll to 15 dollars"</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4" data-testid="screens-heading">Screens</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {screenDefs.map((screen) => (
            <Card key={screen.url} data-testid={`screen-card-${screen.screenType}-${screen.screenNumber}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  {screen.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" data-testid={`status-dot-${screen.screenType}-${screen.screenNumber}`}></span>
                  <span className="text-xs text-muted-foreground">Connected</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{screen.url}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => window.open(screen.url, '_blank')}
                  data-testid={`btn-open-${screen.screenType}-${screen.screenNumber}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Screen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4" data-testid="86-report-heading">86 Report</h2>
        <Card data-testid="86-report-card">
          <CardContent className="pt-6">
            {loadingItems ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : disabledItems.length === 0 ? (
              <p className="text-muted-foreground" data-testid="all-items-active">All items active</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedDisabled).map(([screenLabel, screenItems]) => (
                  <div key={screenLabel}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{screenLabel}</h3>
                    <div className="space-y-2">
                      {screenItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                          data-testid={`disabled-item-${item.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="destructive" className="text-xs">86'd</Badge>
                            <div>
                              <span className="font-medium text-sm">{item.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{item.category}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReEnable(item.id, item.name)}
                            disabled={reEnableMutation.isPending}
                            data-testid={`btn-reenable-${item.id}`}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Re-Enable
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
