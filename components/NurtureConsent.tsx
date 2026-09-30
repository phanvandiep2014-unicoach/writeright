'use client';
import { useEffect, useState } from 'react';

/**
 * Ô đồng ý nhận email hướng dẫn/tư vấn — KHÔNG tick sẵn.
 * Chỉ hiện với người đăng nhập chưa đồng ý và chưa hủy. Kết quả chấm không bị chặn bởi ô này.
 */
export function NurtureConsent({ band }: { band?: number }) {
  const [needed, setNeeded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/nurture-consent').then(r => r.json()).then(d => setNeeded(!!d.needed)).catch(() => {});
  }, []);

  if (!needed && state !== 'done') return null;
  if (state === 'done') {
    return <div className="rounded-xl border border-navy-700 bg-navy-800 p-4 text-sm text-navy-300">Cảm ơn bạn — UNICOACH sẽ gửi email hướng dẫn học tập cho bạn. Bạn có thể hủy bất cứ lúc nào trong email.</div>;
  }

  async function submit() {
    setState('saving');
    let utm: Record<string, string> = {};
    try {
      const ft = JSON.parse(localStorage.getItem('uc_first_touch') || 'null');
      if (ft && typeof ft === 'object') utm = ft.utm || ft;
      const q = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(k => { const v = q.get(k); if (v && !utm[k]) utm[k] = v; });
    } catch {}
    try {
      const r = await fetch('/api/nurture-consent', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ band, utm }),
      });
      setState(r.ok ? 'done' : 'error');
    } catch { setState('error'); }
  }

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800 p-4 text-sm text-navy-300 space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1" />
        <span>Tôi đồng ý nhận email hướng dẫn học tập và tư vấn từ UNICOACH (có thể hủy bất cứ lúc nào).</span>
      </label>
      <button disabled={!checked || state === 'saving'} onClick={submit}
        className="px-4 py-2 rounded-lg bg-brand-500 text-navy-900 font-semibold disabled:opacity-40">
        {state === 'saving' ? 'Đang lưu…' : 'Xác nhận'}
      </button>
      {state === 'error' && <span className="text-red-400 ml-3">Chưa lưu được, vui lòng thử lại.</span>}
    </div>
  );
}
