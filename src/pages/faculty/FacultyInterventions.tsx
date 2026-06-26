import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { listInterventions, openIntervention, closeIntervention } from '@/services/facultyPortal';

export default function FacultyInterventions() {
  const [items, setItems] = useState<any[]>([]);
  const [scope, setScope] = useState<'student' | 'course' | 'program' | 'section'>('course');
  const [scopeId, setScopeId] = useState('');
  const [finding, setFinding] = useState('');
  const [rec, setRec] = useState('');
  const [target, setTarget] = useState('');
  const [closing, setClosing] = useState<string | null>(null);
  const [currentMetric, setCurrentMetric] = useState('');

  const reload = async () => setItems(await listInterventions());
  useEffect(() => { void reload(); }, []);

  const create = async () => {
    if (!scopeId || !finding || !rec) return toast.error('All fields required');
    try {
      await openIntervention({ scope, scopeId, finding, recommendation: rec, target: target ? Number(target) : undefined });
      toast.success('Intervention opened');
      setScopeId(''); setFinding(''); setRec(''); setTarget('');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const close = async () => {
    if (!closing) return;
    try {
      await closeIntervention(closing, currentMetric ? Number(currentMetric) : undefined);
      toast.success('Closed'); setClosing(null); setCurrentMetric(''); await reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PageTemplate title="Outcome Interventions" description="Open, track, and close targeted outcome improvements.">
      <Card>
        <CardHeader><CardTitle>Open New Intervention</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Scope</Label>
              <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Scope ID (UUID)</Label><Input value={scopeId} onChange={e => setScopeId(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Finding</Label><Textarea rows={2} value={finding} onChange={e => setFinding(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Recommendation</Label><Textarea rows={2} value={rec} onChange={e => setRec(e.target.value)} /></div>
            <div><Label>Target metric (%)</Label><Input type="number" value={target} onChange={e => setTarget(e.target.value)} /></div>
            <div className="flex items-end"><Button onClick={create}>Open Intervention</Button></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Intervention Queue</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">No interventions.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left">
                  <th className="p-2">Opened</th><th className="p-2">Scope</th>
                  <th className="p-2">Finding</th><th className="p-2 text-center">Target</th>
                  <th className="p-2 text-center">Current</th><th className="p-2">Status</th><th className="p-2">Action</th>
                </tr></thead>
                <tbody>
                  {items.map((i: any) => (
                    <tr key={i.id} className="border-b">
                      <td className="p-2 text-muted-foreground">{new Date(i.opened_at).toLocaleDateString()}</td>
                      <td className="p-2">{i.scope}<div className="font-mono text-xs text-muted-foreground">{i.scope_id?.slice(0,8)}</div></td>
                      <td className="p-2 max-w-md">{i.finding}</td>
                      <td className="p-2 text-center">{i.target_metric ?? '—'}</td>
                      <td className="p-2 text-center">{i.current_metric ?? '—'}</td>
                      <td className="p-2"><Badge variant={i.status === 'closed' ? 'secondary' : 'default'}>{i.status}</Badge></td>
                      <td className="p-2">{i.status === 'open' && (
                        <Dialog open={closing === i.id} onOpenChange={(o) => !o && setClosing(null)}>
                          <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setClosing(i.id)}>Close</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Close Intervention</DialogTitle></DialogHeader>
                            <div className="space-y-2">
                              <Label>Final metric (%)</Label>
                              <Input type="number" value={currentMetric} onChange={e => setCurrentMetric(e.target.value)} />
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setClosing(null)}>Cancel</Button>
                              <Button onClick={close}>Close</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
