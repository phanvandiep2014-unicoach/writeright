'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Job = {
  id: string; status: 'queued' | 'running' | 'done' | 'failed'; task_type: number; title: string | null;
  evaluation_id: string | null; error: string | null; error_code: string | null;
  created_at: string; finished_at: string | null;
};

/**
 * Bảng "Đang chấm nền": các bài học viên đã xếp hàng. Tự cập nhật (poll) khi còn bài chờ/đang chấm;
 * bài xong thì báo `onDone` để trang cha tải lại lịch sử. Bài xong hiện 15 phút rồi nhường chỗ cho lịch sử.
 * `refreshKey` đổi giá trị = có bài mới vừa xếp hàng → tải ngay.
 */
export function GradingQueue({ refreshKey = 0, onDone }: { refreshKey?: number; onDone?: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const seenDone = useRef<Set<string> | null>(null);
  const timer = useRef<any>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/evaluate/queue', { cache: 'no-store' });
      if (!r.ok) return false;
      const d = await r.json();
      const list: Job[] = d.jobs || [];
      if (!alive.current) return false;
      setJobs(list);
      const doneIds = new Set(list.filter(j => j.status === 'done').map(j => j.id));
      if (seenDone.current === null) seenDone.current = doneIds; // lần đầu: không báo bài đã xong từ trước
      else {
        let fresh = false;
        doneIds.forEach(id => { if (!seenDone.current!.has(id)) fresh = true; });
        seenDone.current = doneIds;
        if (fresh) onDone?.();
      }
      return list.some(j => j.status === 'queued' || j.status === 'running');
    } catch { return false; }
  }, [onDone]);

  useEffect(() => {
    alive.current = true;
    let stopped = false;
    const tick = async () => {
      const pending = await load();
      if (stopped) return;
      timer.current = setTimeout(tick, pending ? 4000 : 30000);
    };
    tick();
    return () => { stopped = true; alive.current = false; clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function openResult(j: Job) {
    if (!j.evaluation_id || busy) return;
    setBusy(j.id); setMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch('/api/share-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ evaluationId: j.evaluation_id }),
      });
      const d = await r.json();
      if (!d.token) throw new Error(d.error || 'failed');
      router.push(`/e/${d.token}`);
    } catch { setMsg('Không mở được bài. Vui lòng thử lại.'); setBusy(null); }
  }

  async function act(j: Job, action: 'retry' | 'dismiss') {
    setBusy(j.id); setMsg('');
    try {
      const r = await fetch('/api/evaluate/queue', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: j.id, action }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.error || 'Không thực hiện được.'); }
    } catch { setMsg('Không thực hiện được. Vui lòng thử lại.'); }
    setBusy(null);
    await load();
    if (action === 'retry') { clearTimeout(timer.current); timer.current = setTimeout(async function t() { const p = await load(); timer.current = setTimeout(t, p ? 4000 : 30000); }, 4000); }
  }

  const now = Date.now();
  const visible = jobs.filter(j => j.status !== 'done' || (j.finished_at && now - new Date(j.finished_at).getTime() < 15 * 60 * 1000));
  if (visible.length === 0) return null;
  const pendingN = visible.filter(j => j.status === 'queued' || j.status === 'running').length;

  const label = (j: Job) =>
    j.status === 'queued' ? (j.error ? 'Chờ thử lại…' : 'Đang xếp hàng…')
    : j.status === 'running' ? 'Mentor đang chấm…'
    : j.status === 'done' ? 'Đã chấm xong' : 'Chưa chấm được';

  return (
    <section aria-live="polite" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(200,161,75,.25)', borderRadius: 14, padding: '16px 18px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', letterSpacing: '.14em', color: 'rgba(200,161,75,.75)', textTransform: 'uppercase', margin: 0 }}>Chấm nền</h2>
        {pendingN > 0 && <span style={{ fontSize: '.78rem', color: 'rgba(231,206,142,.7)' }}>{pendingN} bài đang chờ — bạn có thể dán bài tiếp hoặc rời trang, kết quả sẽ có trong Dashboard</span>}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(j => (
          <li key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,.18)', borderRadius: 10, padding: '10px 12px' }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: j.status === 'done' ? '#6fcf97' : j.status === 'failed' ? '#eb5757' : '#E7CE8E',
              animation: j.status === 'running' || j.status === 'queued' ? 'pulse 1.4s ease-in-out infinite' : undefined }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#fff', fontSize: '.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ color: 'rgba(231,206,142,.7)', marginRight: 6 }}>Task {j.task_type}</span>{j.title || 'Bài viết'}
              </div>
              <div style={{ fontSize: '.78rem', color: j.status === 'failed' ? '#f2a3a3' : 'rgba(231,206,142,.55)' }}>
                {label(j)}{j.status === 'failed' && j.error ? ` — ${j.error}` : ''}
              </div>
            </div>
            {j.status === 'done' && j.evaluation_id && (
              <button onClick={() => openResult(j)} disabled={busy === j.id} style={btn(true)}>{busy === j.id ? '…' : 'Xem kết quả'}</button>
            )}
            {j.status === 'failed' && (<>
              <button onClick={() => act(j, 'retry')} disabled={busy === j.id} style={btn(true)}>Chấm lại</button>
              <button onClick={() => act(j, 'dismiss')} disabled={busy === j.id} style={btn(false)}>Bỏ</button>
            </>)}
          </li>
        ))}
      </ul>
      {msg && <p style={{ margin: '10px 0 0', fontSize: '.8rem', color: '#f2a3a3' }}>{msg}</p>}
    </section>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    fontSize: '.8rem', fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
    border: primary ? 'none' : '1px solid rgba(200,161,75,.35)',
    background: primary ? 'linear-gradient(135deg,#8A6A28,#E7CE8E 40%,#C8A14B 65%,#A9863A)' : 'transparent',
    color: primary ? '#11183A' : 'rgba(231,206,142,.8)',
  };
}
