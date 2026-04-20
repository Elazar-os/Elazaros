import { useState, useEffect, useMemo } from 'react';
import { Link, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Trash2, Plus, Search, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMenuItems, useScreens, useUpdateMenuItem, useUpdateAvailability, useDeleteMenuItem, useCreateMenuItem } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { MenuItem, InsertMenuItem } from '@shared/schema';

export default function Admin() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const screenFilter = urlParams.get('screen');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreen, setSelectedScreen] = useState<string>(screenFilter || 'all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: screens = [], isLoading: loadingScreens } = useScreens();
  const { data: items = [], isLoading: loadingItems } = useMenuItems();
  const updateMenuItem = useUpdateMenuItem();
  const updateAvailability = useUpdateAvailability();
  const deleteMenuItem = useDeleteMenuItem();
  const createMenuItem = useCreateMenuItem();
  const { toast } = useToast();

  useEffect(() => {
    if (screenFilter) {
      setSelectedScreen(screenFilter);
    }
  }, [screenFilter]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesScreen = true;
      if (selectedScreen !== 'all') {
        const [type, num] = selectedScreen.split('-');
        matchesScreen = item.screenType === type && item.screenNumber === parseInt(num);
      }
      
      return matchesSearch && matchesScreen;
    });
  }, [items, searchQuery, selectedScreen]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map(i => i.category))).sort();
  }, [items]);

  const handleToggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await updateAvailability.mutateAsync({ id, enabled });
      toast({
        title: 'Success',
        description: `Item ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update item',
      });
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await deleteMenuItem.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete item',
      });
    }
  };

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const screenValue = formData.get('screen') as string;
    const [screenType, screenNum] = screenValue.split('-');
    
    const itemData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      price: formData.get('price') as string,
      category: formData.get('category') as string,
      screenType,
      screenNumber: parseInt(screenNum),
      priority: parseInt(formData.get('priority') as string) || 0,
      enabled: formData.get('enabled') === 'on',
    };

    try {
      if (editingItem) {
        await updateMenuItem.mutateAsync({ id: editingItem.id, ...itemData });
        toast({
          title: 'Success',
          description: 'Item updated successfully',
        });
      } else {
        await createMenuItem.mutateAsync(itemData as InsertMenuItem);
        toast({
          title: 'Success',
          description: 'Item created successfully',
        });
        setIsCreateDialogOpen(false);
      }
      setEditingItem(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: editingItem ? 'Failed to update item' : 'Failed to create item',
      });
    }
  };

  if (loadingScreens || loadingItems) {
    return (
      <div className="min-h-screen bg-background noise flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const screenOptions = screens.map(s => ({
    id: `${s.screenType}-${s.screenNumber}`,
    name: s.name,
    type: s.screenType
  }));

  const getScreenLabel = (screenId: string) => {
    const screen = screens.find(s => `${s.screenType}-${s.screenNumber}` === screenId);
    return screen?.name || screenId;
  };

  return (
    <div className="bg-background noise p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link href="/">
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-wide">
            <span className="text-gradient">Menu Editor</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Edit menu items, prices, and availability
            {selectedScreen !== 'all' && (
              <span className="text-primary ml-2">- Showing {getScreenLabel(selectedScreen)}</span>
            )}
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={selectedScreen} onValueChange={setSelectedScreen}>
            <SelectTrigger className="w-[200px]" data-testid="select-screen">
              <SelectValue placeholder="Select screen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Screens</SelectItem>
              {screenOptions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/database">
            <Button
              variant="outline"
              className="gap-2"
              data-testid="btn-database"
            >
              <Database className="w-4 h-4" />
              Database
            </Button>
          </Link>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="btn-create-item">
                <Plus className="w-4 h-4" />
                New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Menu Item</DialogTitle>
                <DialogDescription>Add a new item to your menu</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveItem}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="create-screen">Screen</Label>
                    <Select name="screen" defaultValue={selectedScreen !== 'all' ? selectedScreen : 'sushi-1'} required>
                      <SelectTrigger id="create-screen">
                        <SelectValue placeholder="Select screen" />
                      </SelectTrigger>
                      <SelectContent>
                        {screenOptions.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="create-category">Category</Label>
                    <Input id="create-category" name="category" placeholder="e.g. Specialty Rolls" required />
                  </div>
                  <div>
                    <Label htmlFor="create-name">Name</Label>
                    <Input id="create-name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="create-description">Description (optional)</Label>
                    <Textarea id="create-description" name="description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="create-price">Price</Label>
                      <Input id="create-price" name="price" placeholder="14.95" required />
                    </div>
                    <div>
                      <Label htmlFor="create-priority">Priority (order)</Label>
                      <Input id="create-priority" name="priority" type="number" defaultValue="0" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="create-enabled" name="enabled" defaultChecked className="w-4 h-4" />
                    <Label htmlFor="create-enabled">Enabled (visible on displays)</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Item</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {filteredItems.map((item, index) => {
            const screenId = `${item.screenType}-${item.screenNumber}`;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="glass border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-display text-lg font-medium">{item.name}</h3>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <Badge variant="secondary" className="text-xs">{getScreenLabel(screenId)}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-display text-2xl font-medium text-primary">
                            ${item.price}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center gap-1">
                            <Label htmlFor={`enabled-${item.id}`} className="text-xs text-muted-foreground">
                              Enabled
                            </Label>
                            <Switch
                              id={`enabled-${item.id}`}
                              checked={item.enabled}
                              onCheckedChange={(checked) => handleToggleEnabled(item.id, checked)}
                              data-testid={`switch-enabled-${item.id}`}
                            />
                          </div>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setEditingItem(item)}
                                data-testid={`btn-edit-${item.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Menu Item</DialogTitle>
                                <DialogDescription>Make changes to {item.name}</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleSaveItem}>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label htmlFor="edit-screen">Screen</Label>
                                    <Select name="screen" defaultValue={screenId} required>
                                      <SelectTrigger id="edit-screen">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {screenOptions.map(s => (
                                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-category">Category</Label>
                                    <Input id="edit-category" name="category" defaultValue={item.category} required />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input id="edit-name" name="name" defaultValue={item.name} required />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-description">Description (optional)</Label>
                                    <Textarea id="edit-description" name="description" defaultValue={item.description || ''} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="edit-price">Price</Label>
                                      <Input id="edit-price" name="price" defaultValue={item.price} required />
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-priority">Priority (order)</Label>
                                      <Input id="edit-priority" name="priority" type="number" defaultValue={item.priority} />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input type="checkbox" id="edit-enabled" name="enabled" defaultChecked={item.enabled} className="w-4 h-4" />
                                    <Label htmlFor="edit-enabled">Enabled (visible on displays)</Label>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit">Save Changes</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            data-testid={`btn-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
