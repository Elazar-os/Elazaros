import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MenuItem, InsertMenuItem, UpdateMenuItem, Screen, InsertScreen, UpdateScreen } from '@shared/schema';

export function useScreens() {
  return useQuery<Screen[]>({
    queryKey: ['screens'],
    queryFn: async () => {
      const res = await fetch('/api/screens');
      if (!res.ok) throw new Error('Failed to fetch screens');
      return res.json();
    },
  });
}

export function useUpdateScreen() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (screen: UpdateScreen) => {
      const res = await fetch(`/api/screens/${screen.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(screen),
      });
      if (!res.ok) throw new Error('Failed to update screen');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
    },
  });
}

export function useMenuItems() {
  return useQuery<MenuItem[]>({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const res = await fetch('/api/menu-items');
      if (!res.ok) throw new Error('Failed to fetch menu items');
      return res.json();
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: UpdateMenuItem) => {
      const res = await fetch(`/api/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error('Failed to update menu item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await fetch(`/api/menu-items/${id}/enabled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to update availability');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: InsertMenuItem) => {
      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error('Failed to create menu item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu-items/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete menu item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });
}
