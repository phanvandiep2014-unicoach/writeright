'use client';
import { useState } from 'react';
import { withBase } from '@/lib/base-path';
import { getFirstTouch } from '@/lib/track-client';

const field: React.CSSProperties = {
  width: '100%', padding: '11px 12px', borderRadius: 8, fontSize: 15,
  background: 'rgba(255,255,255,.04)', color: 'var(--ivory)',
  border: '1px solid rgba(200,161,75,.3)', fontFamily: 'var(--font-body)',
};
const label: React.CSSProperties = { display: 'block', fontSize: 13, color: '#9c8657', marginBottom: 6, fontFamily: 'var(--font-body)' };

export default function CentersLeadForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === 'sending') return;
    const f = new FormData(e.currentTarget);
    setState('sending'); setMsg('');
    let ft: unknown = undefined;
    try { ft = getFirstTouch() || undefined; } catch { /* bỏ qua */ }
    try {
      const r = await fetch(withBase('/api/centers-lead'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: f.get('name'), org: f.get('org'), type: f.get('type'), email: f.get('email'),
          phone: f.get('phone'), volume: f.get('volume'), message: f.get('message'),
          website: f.get('website'), consent: f.get('consent') === 'on', ft,
        }),
      });
      if (r.ok) { setState('done'); return; }
      const j = await r.json().catch(() => ({}));
      setState('error');
      setMsg(j.error === 'invalid_email' ? 'Email chưa đúng định dạng.'
        : j.error === 'missing_fields' ? 'Vui lòng điền họ tên và tên đơn vị.'
        : j.error === 'consent_required' ? 'Vui lòng tích đồng ý để chúng tôi liên hệ lại.'
        : j.error === 'too_many' ? 'Bạn gửi quá nhiều lần, vui lòng thử lại sau.'
        : 'Chưa gửi được. Vui lòng email trực tiếp cs@unicoach.vn.');
    } catch {
      setState('error'); setMsg('Mất kết nối. Vui lòng thử lại hoặc email cs@unicoach.vn.');
    }
  }

  if (state === 'done') {
    return (
      <div style={{ padding: 24, borderRadius: 12, border: '1px solid rgba(200,161,75,.4)', color: 'var(--ivory)', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--champagne)' }}>Đã nhận thông tin.</strong> UNICOACH sẽ liên hệ lại với bạn qua email hoặc số điện thoại đã để lại.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
      <div><label style={label} htmlFor="c-name">Họ tên *</label><input id="c-name" name="name" required maxLength={100} style={field} autoComplete="name" /></div>
      <div><label style={label} htmlFor="c-org">Tên đơn vị *</label><input id="c-org" name="org" required maxLength={150} style={field} autoComplete="organization" /></div>
      <div>
        <label style={label} htmlFor="c-type">Loại đơn vị</label>
        <select id="c-type" name="type" defaultValue="center" style={field}>
          <option value="center">Trung tâm ngoại ngữ</option>
          <option value="teacher">Giáo viên / gia sư</option>
          <option value="school">Trường học / tổ chức giáo dục</option>
          <option value="tech">Đơn vị công nghệ / có LMS riêng</option>
          <option value="other">Khác</option>
        </select>
      </div>
      <div><label style={label} htmlFor="c-email">Email *</label><input id="c-email" name="email" type="email" required maxLength={200} style={field} autoComplete="email" /></div>
      <div><label style={label} htmlFor="c-phone">Số điện thoại / Zalo</label><input id="c-phone" name="phone" maxLength={30} style={field} autoComplete="tel" /></div>
      <div>
        <label style={label} htmlFor="c-vol">Số bài Writing dự kiến chấm mỗi tháng</label>
        <select id="c-vol" name="volume" defaultValue="unknown" style={field}>
          <option value="unknown">Chưa rõ</option>
          <option value="<100">Dưới 100</option>
          <option value="100-500">100 – 500</option>
          <option value="500-2000">500 – 2.000</option>
          <option value=">2000">Trên 2.000</option>
        </select>
      </div>
      <div><label style={label} htmlFor="c-msg">Bạn muốn WriteRight hỗ trợ điều gì?</label><textarea id="c-msg" name="message" rows={4} maxLength={1500} style={{ ...field, resize: 'vertical' }} /></div>
      {/* Honeypot: người thật không thấy */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} />
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#cdbb8e', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
        <input type="checkbox" name="consent" style={{ marginTop: 4 }} />
        <span>Tôi đồng ý để UNICOACH lưu thông tin này và liên hệ lại về WriteRight cho trung tâm/giáo viên, theo <a href={withBase('/privacy')} style={{ color: 'var(--champagne)' }}>Chính sách bảo mật</a>.</span>
      </label>
      {msg && <div role="alert" style={{ color: '#e8a0a0', fontSize: 14, fontFamily: 'var(--font-body)' }}>{msg}</div>}
      <button type="submit" disabled={state === 'sending'} style={{
        padding: '13px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700,
        background: 'var(--imperial-gold)', color: '#11183a', fontFamily: 'var(--font-body)', opacity: state === 'sending' ? .6 : 1,
      }}>{state === 'sending' ? 'Đang gửi…' : 'Gửi thông tin liên hệ'}</button>
    </form>
  );
}
