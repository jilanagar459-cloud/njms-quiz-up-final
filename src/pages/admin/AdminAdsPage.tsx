import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { getAllAds, createAd, updateAd, deleteAd } from '@/services/api';
import type { Advertisement } from '@/types/types';
import { toast } from 'sonner';

const emptyForm = { title: '', content: '', image_url: '', link_url: '', is_active: true, display_order: 0 };

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const data = await getAllAds();
    setAds(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setEditing(ad);
    setForm({
      title: ad.title,
      content: ad.content ?? '',
      image_url: ad.image_url ?? '',
      link_url: ad.link_url ?? '',
      is_active: ad.is_active,
      display_order: ad.display_order,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      content: form.content || null,
      image_url: form.image_url || null,
      link_url: form.link_url || null,
      is_active: form.is_active,
      display_order: Number(form.display_order),
    };
    if (editing) {
      await updateAd(editing.id, payload);
      toast.success('Advertisement updated');
    } else {
      await createAd(payload);
      toast.success('Advertisement created');
    }
    setSaving(false);
    setOpen(false);
    await load();
  };

  const handleToggleActive = async (ad: Advertisement) => {
    await updateAd(ad.id, { is_active: !ad.is_active });
    toast.success(ad.is_active ? 'Ad deactivated' : 'Ad activated');
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAd(deleteId);
    toast.success('Ad deleted');
    setDeleteId(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Advertisements</h1>
          <p className="text-sm text-muted-foreground">Manage ads shown during quiz sessions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 gap-2 font-semibold" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Advertisement' : 'New Advertisement'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-muted-foreground">Title *</Label>
                <Input
                  placeholder="Ad title"
                  className="bg-input border-border"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-muted-foreground">Content</Label>
                <Textarea
                  placeholder="Optional description or call-to-action text"
                  className="bg-input border-border resize-none"
                  rows={3}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-muted-foreground">Image URL</Label>
                <Input
                  placeholder="https://..."
                  className="bg-input border-border"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-muted-foreground">Link URL</Label>
                <Input
                  placeholder="https://..."
                  className="bg-input border-border"
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal text-muted-foreground">Display Order</Label>
                  <Input
                    type="number"
                    className="bg-input border-border mono-num"
                    value={form.display_order}
                    onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal text-muted-foreground">Status</Label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="flex items-center gap-2 h-10 px-3 rounded border border-border bg-input w-full"
                  >
                    {form.is_active
                      ? <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-sm text-foreground">Active</span></>
                      : <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Inactive</span></>
                    }
                  </button>
                </div>
              </div>
              <Button className="w-full h-10 font-semibold" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ads.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No advertisements yet. Click "Add Ad" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {ads.map(ad => (
            <Card key={ad.id} className={`border-border bg-card h-full flex flex-col ${!ad.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base text-balance">{ad.title}</CardTitle>
                </div>
                <Badge variant={ad.is_active ? 'default' : 'secondary'} className="shrink-0 text-xs">
                  {ad.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {ad.content && (
                  <p className="text-sm text-muted-foreground text-pretty line-clamp-2">{ad.content}</p>
                )}
                {ad.link_url && (
                  <p className="text-xs text-primary truncate">{ad.link_url}</p>
                )}
                <p className="text-xs text-muted-foreground">Order: {ad.display_order}</p>
              </CardContent>
              <div className="flex gap-2 px-4 pb-4 mt-auto shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => handleToggleActive(ad)}
                >
                  {ad.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                  {ad.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(ad)}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-destructive ml-auto"
                  onClick={() => setDeleteId(ad.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advertisement?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
