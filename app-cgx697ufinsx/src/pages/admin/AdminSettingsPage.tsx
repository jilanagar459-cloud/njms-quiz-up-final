import { useEffect, useState } from 'react';
import { Settings, Save, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getAppSetting, setAppSetting } from '@/services/api';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [winnersCount, setWinnersCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAppSetting('top_winners_count').then(val => {
      if (val) setWinnersCount(Math.max(1, Math.min(10, Number(val))));
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await setAppSetting('top_winners_count', String(winnersCount));
    toast.success(`Top winners display set to ${winnersCount}`);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure quiz display and behaviour</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Winners display config */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Winners Podium</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal text-muted-foreground">
                    Number of top winners to display
                  </Label>
                  <span className="text-2xl font-bold text-primary mono-num tabular-nums w-8 text-right">
                    {winnersCount}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[winnersCount]}
                  onValueChange={([v]) => setWinnersCount(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <span key={n} className={n === winnersCount ? 'text-primary font-semibold' : ''}>{n}</span>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview</Label>
                <div className="flex items-end justify-center gap-2 h-20">
                  {Array.from({ length: Math.min(winnersCount, 5) }, (_, i) => {
                    const heights = [56, 72, 48, 40, 36];
                    const colors = [
                      'bg-yellow-400/30 border-yellow-400/60',
                      'bg-slate-400/30 border-slate-400/60',
                      'bg-amber-600/30 border-amber-600/60',
                      'bg-primary/10 border-primary/30',
                      'bg-primary/10 border-primary/30',
                    ];
                    const podiumOrder = [1, 0, 2, 3, 4];
                    const idx = podiumOrder[i] ?? i;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded border ${colors[idx]} flex items-end justify-center pb-1`}
                        style={{ height: heights[idx] ?? 32 }}
                      >
                        <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                      </div>
                    );
                  })}
                  {winnersCount > 5 && (
                    <div className="flex items-center justify-center flex-1">
                      <span className="text-xs text-muted-foreground">+{winnersCount - 5} more</span>
                    </div>
                  )}
                </div>
              </div>

              <Button className="w-full h-10 font-semibold gap-2" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Placeholder for future settings */}
          <Card className="border-border bg-card/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground/50">
              <Settings className="w-8 h-8" />
              <p className="text-sm">More settings coming soon</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
