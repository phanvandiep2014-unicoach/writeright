'use client';
import { useEffect, useState } from 'react';

/**
 * Hai ô đồng ý độc lập — KHÔNG tick sẵn:
 *  1. nhận email hướng dẫn học tập và tư vấn từ UNICOACH;
 *  2. cho phép dùng bài viết (đã ẩn danh, người duyệt xem trước) làm bài mẫu công khai.
 * Mỗi ô chỉ hiện nếu người dùng chưa trả lời. Kết quả chấm không bị chặn bởi các ô này.
 */
export function NurtureConsent({ band }: { band?: number }) {
  const [needed, setNeeded] = useState(false);
  const [sampleNeeded, setSampleNeeded] = useState(false);
  const [email, setEmail] = useState(false);
  const [sample, setSample] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/nurture-consent').then(r => r.json()).then(d => {
      setNeeded(!!d.needed);
      setSampleNeeded(!!d.sampleNeeded);
    }).catch(() => {});
  }, []);

  if (!needed && !sampleNeeded && state !== 'done') return null;
  if (state === 'done') {
    return <div className="rounded-xl border border-navy-700 bg-navy-800 p-4 text-sm text-navy-300">Cảm ơn bạn — lựa chọn của bạn đã được lưu. Bạn có thể hủy nhận email bất cứ lúc nào trong email, và rút lại việc dùng bài làm bài mẫu bằng cách nhắn UNICOACH.</div>;
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
        body: JSON.stringify({ band, utm, nurture: needed && email, sample: sampleNeeded && sample }),
      });
      setState(r.ok ? 'done' : 'error');
    } catch { setState('error'); }
  }

  const anyChecked = (needed && email) || (sampleNeeded && sample);

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800 p-4 text-sm text-navy-300 space-y-3">
      {needed && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} className="mt-1" />
          <span>Tôi đồng ý nhận email hướng dẫn học tập và tư vấn từ UNICOACH (có thể hủy bất cứ lúc nào).</span>
        </label>
      )}
      {sampleNeeded && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={sample} onChange={e => setSample(e.target.checked)} className="mt-1" />
          <span>Tôi đồng ý để UNICOACH dùng bài viết của tôi làm bài mẫu công khai sau khi đã ẩn danh và được người duyệt xem trước (tôi có thể rút lại bất cứ lúc nào).</span>
        </label>
      )}
      <button disabled={!anyChecked || state === 'saving'} onClick={submit}
        className="px-4 py-2 rounded-lg bg-brand-500 text-navy-900 font-semibold disabled:opacity-40">
        {state === 'saving' ? 'Đang lưu…' : 'Xác nhận'}
      </button>
      {state === 'error' && <span className="text-red-400 ml-3">Chưa lưu được, vui lòng thử lại.</span>}
    </div>
  );
}
