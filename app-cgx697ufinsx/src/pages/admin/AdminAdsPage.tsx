import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Upload, Loader2, ImageIcon, Link2, X } from 'lucide-react';
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
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const emptyForm = { title: '', content: '', image_url: '', link_url: '', is_active: true, display_order: 0 };

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('upload');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const data = await getAllAds();
    setAds(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPreviewUrl('');
    setImageMode('upload');
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
    setPreviewUrl(ad.image_url ?? '');
    setImageMode(ad.image_url ? 'upload' : 'upload');
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `ad_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('ad-images').upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error('Upload failed: ' + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from('ad-images').getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setPreviewUrl(data.publicUrl);
    toast.success('Image uploaded');
    setUploading(false);
    e.target.value = '';
  };

  const clearImage = () => {
    setForm(f => ({ ...f, image_url: '' }));
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              {/* Title */}
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

              {/* Content */}
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-muted-foreground">Content</Label>
                <Textarea
                  placeholder="Optional description or call-to-action text"
                  className="bg-input border-border resize-none"
                  rows={2}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>

              {/* Image — toggle between upload & URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal text-muted-foreground">Banner Image</Label>
                  <div className="flex gap-1 p-0.5 bg-secondary rounded">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        imageMode === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        imageMode === 'url' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Link2 className="w-3 h-3" /> URL
                    </button>
                  </div>
                </div>

                {imageMode === 'upload' ? (
                  previewUrl ? (
                    <div className="relative group w-full aspect-video rounded border border-border overflow-hidden bg-secondary">
                      <img src={previewUrl} alt="Ad preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={cn(
                      'flex flex-col items-center justify-center gap-2 w-full h-28 rounded border-2 border-dashed cursor-pointer transition-colors',
                      uploading ? 'border-primary/40 bg-primary/5 cursor-not-allowed' : 'border-border hover:border-primary/50 hover:bg-secondary/40'
                    )}>
                      {uploading ? (
                        <><Loader2 className="w-6 h-6 text-primary animate-spin" /><span className="text-xs text-muted-foreground">Uploading...</span></>
                      ) : (
                        <><ImageIcon className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground">Click to upload image (JPG, PNG, WebP — max 5 MB)</span></>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={handleImageUpload} />
                    </label>
                  )
                ) : (
                  <div className="space-y-1.5">
                    <Input
                      placeholder="https://example.com/banner.jpg"
                      className="bg-input border-border"
                      value={form.image_url}
                      onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); setPreviewUrl(e.target.value); }}
                    />
                    {previewUrl && (
                      <div className="w-full aspect-video rounded border border-border overflow-hidden bg-secondary">
                        <img src={previewUrl} alt="preview" className="w-full h-full object-cover" onError={() => setPreviewUrl('')} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Link URL */}
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-muted-foreground">Link URL (optional)</Label>
                <Input
                  placeholder="https://..."
                  className="bg-input border-border"
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                />
              </div>

              {/* Order + Status */}
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

              <Button className="w-full h-10 font-semibold" onClick={handleSave} disabled={saving || uploading}>
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
            <Card key={ad.id} className={cn('border-border bg-card h-full flex flex-col', !ad.is_active && 'opacity-60')}>
              {/* Image preview on card */}
              {ad.image_url && (
                <div className="w-full aspect-video overflow-hidden rounded-t-lg bg-secondary">
                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                </div>
              )}
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
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => handleToggleActive(ad)}>
                  {ad.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                  {ad.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => openEdit(ad)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-destructive ml-auto" onClick={() => setDeleteId(ad.id)}>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
