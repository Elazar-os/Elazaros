import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Check, KeyRound, Users, Ticket, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Manager = {
  id: number;
  name: string;
  pin: string;
  role: string;
};

type InviteCode = {
  id: number;
  code: string;
  used: boolean;
  usedBy: string | null;
};

function useManagers() {
  return useQuery<Manager[]>({
    queryKey: ['managers'],
    queryFn: async () => {
      const res = await fetch('/api/managers');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });
}

function useInviteCodes() {
  return useQuery<InviteCode[]>({
    queryKey: ['invite-codes'],
    queryFn: async () => {
      const res = await fetch('/api/invite-codes');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allManagers = [], isLoading: loadingManagers } = useManagers();
  const { data: inviteCodes = [], isLoading: loadingCodes } = useInviteCodes();

  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('manager');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const createManager = useMutation({
    mutationFn: async (data: { name: string; pin: string; role: string }) => {
      const res = await fetch('/api/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      setNewName('');
      setNewPin('');
      setNewRole('manager');
      toast({ title: 'User created' });
    },
  });

  const updateManager = useMutation({
    mutationFn: async (data: { id: number; name?: string; pin?: string; role?: string }) => {
      const res = await fetch(`/api/managers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      setEditingId(null);
      toast({ title: 'User updated' });
    },
  });

  const deleteManager = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/managers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      toast({ title: 'User deleted' });
    },
  });

  const generateCode = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/invite-codes', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      toast({ title: 'Invite code generated' });
    },
  });

  function startEdit(m: Manager) {
    setEditingId(m.id);
    setEditName(m.name);
    setEditPin(m.pin);
    setEditRole(m.role);
  }

  function saveEdit() {
    if (!editingId) return;
    updateManager.mutate({ id: editingId, name: editName, pin: editPin, role: editRole });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const roleColors: Record<string, string> = {
    developer: 'bg-red-950 text-red-300',
    boss: 'bg-neutral-800 text-neutral-200',
    manager: 'bg-neutral-900 text-neutral-400',
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" data-testid="settings-page">
      <h1 className="text-2xl font-bold" data-testid="settings-title">Settings</h1>

      <Card data-testid="card-users">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users & Roles
          </CardTitle>
          <CardDescription>
            Manage PINs and roles. Roles: <strong>developer</strong> (full access), <strong>boss</strong> (/boss panel), <strong>manager</strong> (/manager 86 only).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingManagers ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : (
            <div className="space-y-2">
              {allManagers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20" data-testid={`manager-row-${m.id}`}>
                  {editingId === m.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-32"
                        placeholder="Name"
                        data-testid="input-edit-name"
                      />
                      <Input
                        value={editPin}
                        onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-20 font-mono"
                        placeholder="PIN"
                        maxLength={4}
                        data-testid="input-edit-pin"
                      />
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="w-32" data-testid="select-edit-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="developer">Developer</SelectItem>
                          <SelectItem value="boss">Boss</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={saveEdit} disabled={updateManager.isPending} data-testid="btn-save-edit">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} data-testid="btn-cancel-edit">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm" data-testid={`text-manager-name-${m.id}`}>{m.name}</span>
                      </div>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded" data-testid={`text-manager-pin-${m.id}`}>
                        {m.pin}
                      </code>
                      <Badge variant="secondary" className={`text-xs ${roleColors[m.role] || ''}`} data-testid={`badge-role-${m.id}`}>
                        {m.role}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(m)} data-testid={`btn-edit-${m.id}`}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteManager.mutate(m.id)}
                        disabled={deleteManager.isPending}
                        className="text-destructive hover:text-destructive"
                        data-testid={`btn-delete-${m.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t" data-testid="add-user-form">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name"
              className="w-32"
              data-testid="input-new-name"
            />
            <Input
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="PIN"
              className="w-20 font-mono"
              maxLength={4}
              data-testid="input-new-pin"
            />
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="w-32" data-testid="select-new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="boss">Boss</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => {
                if (newName && newPin.length === 4) {
                  createManager.mutate({ name: newName, pin: newPin, role: newRole });
                }
              }}
              disabled={createManager.isPending || !newName || newPin.length !== 4}
              className="gap-1"
              data-testid="btn-add-user"
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-invite-codes">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Boss Invite Codes
          </CardTitle>
          <CardDescription>
            Generate single-use invite codes for boss panel access. Each code can only be used once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => generateCode.mutate()}
            disabled={generateCode.isPending}
            className="gap-2"
            data-testid="btn-generate-code"
          >
            {generateCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Generate Invite Code
          </Button>

          {loadingCodes ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : inviteCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invite codes generated yet.</p>
          ) : (
            <div className="space-y-2">
              {inviteCodes.map(code => (
                <div key={code.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20" data-testid={`invite-row-${code.id}`}>
                  <code className={`font-mono text-sm tracking-widest ${code.used ? 'line-through text-muted-foreground' : 'font-bold'}`} data-testid={`text-code-${code.id}`}>
                    {code.code}
                  </code>
                  <Badge variant={code.used ? 'secondary' : 'default'} className="text-xs" data-testid={`badge-status-${code.id}`}>
                    {code.used ? 'Used' : 'Available'}
                  </Badge>
                  {!code.used && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(code.code)}
                      className="gap-1"
                      data-testid={`btn-copy-${code.id}`}
                    >
                      {copiedCode === code.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedCode === code.code ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
