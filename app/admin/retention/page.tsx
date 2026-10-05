'use client';
// UNICOACH BMS - Giữ chân khách WriteRight (cảnh báo sớm).
// Bốn danh sách đọc từ /api/admin/retention (service role, chỉ admin). Mục đích: thấy NGAY ai sắp rời,
// thay vì phát hiện muộn cả tháng như đợt 14/09 và 27/09-03/10/2026.
import { useEffect, useState, type ReactNode } from 'react';
import { BmsShell, Card, Empty, PageHead, TableWrap, Th, Td, fmtDate, btnSm } from '@/components/bms/ui';

type Person = { id: string; email: string | null; name: string; essays: number; last_essay: string | null; last_band: number | null };
type Data = {
  generatedAt: string;
  counts: Record<'expiringSoon' | 'lapsed' | 'paidNotStarted' | 'abandonedCheckouts', number>;
  expiringSoon: (Person & { tier: string; expires_at: string })[];
  lapsed: (Person & { tier: string; expires_at: string; wrote_after_expiry: boolean })[];
  paidNotStarted: (Person & { tier: string; auto_start: string })[];
  abandonedCheckouts: (Person & { attempts: number; last_attempt: string; amount: number; plan: string })[];
};

const band = (b: number | null) => (b == null ? '—' : b.toFixed(1));
const money = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const daysFrom = (iso: string) => Math.round((Date.parse(iso) - Date.now()) / 86_400_000);

function Section({ title, hint, count, children }: { title: string; hint: string; count: number; children: ReactNode }) {
  return (
    <Card className="mb-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-white font-semibold">{title}</h3>
        <span className={`text-sm ${count ? 'text-brand-500' : 'text-navy-400'}`}>{count} người</span>
      </div>
      <p className="text-navy-400 text-xs mb-3">{hint}</p>
      {count ? children : <Empty msg="Không có ai trong nhóm này." />}
    </Card>
  );
}

function Mail({ email }: { email: string | null }) {
  return email ? <a className={btnSm} href={`mailto:${email}`}>Email</a> : <span className="text-navy-500">—</span>;
}

function Inner() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/admin/retention', { cache: 'no-store' })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText); setData(j); })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <><PageHead title="Giữ chân khách" /><Empty msg={`Không tải được: ${err}`} /></>;
  if (!data) return <><PageHead title="Giữ chân khách" /><p className="text-navy-400 text-sm">Đang tải…</p></>;

  return (
    <>
      <PageHead title="Giữ chân khách WriteRight">
        <span className="text-navy-400 text-xs">Cập nhật {new Date(data.generatedAt).toLocaleString('vi-VN')}</span>
      </PageHead>

      <Section title="Bấm thanh toán nhưng đơn còn treo" count={data.counts.abandonedCheckouts}
        hint="Đơn 'pending' trong 14 ngày, chưa có đơn đã thanh toán nào sau đó. Kiểm tra trên PayOS xem họ đã chuyển tiền chưa, rồi nhắn hỏi có gặp lỗi không.">
        <TableWrap><thead><tr><Th>Khách</Th><Th>Số lần thử</Th><Th>Lần cuối</Th><Th>Gói</Th><Th>Số tiền</Th><Th>Bài đã chấm</Th><Th>{null}</Th></tr></thead>
          <tbody>{data.abandonedCheckouts.map((p) => (
            <tr key={p.id}><Td>{p.name}<div className="text-navy-500 text-xs">{p.email}</div></Td><Td>{p.attempts}</Td>
              <Td>{fmtDate(p.last_attempt)}</Td><Td>{p.plan}</Td><Td>{money(p.amount)}</Td><Td>{p.essays}</Td><Td><Mail email={p.email} /></Td></tr>
          ))}</tbody></TableWrap>
      </Section>

      <Section title="Đã hết hạn, chưa gia hạn (30 ngày qua)" count={data.counts.lapsed}
        hint="Xếp theo bài viết gần nhất. 'Vẫn viết sau hạn' = họ còn dùng bản miễn phí, dễ kéo về nhất. Email win-back tự gửi ở ngày 2-9 và 13-20 khi bật WINBACK_ENABLED.">
        <TableWrap><thead><tr><Th>Khách</Th><Th>Hết hạn</Th><Th>Bài</Th><Th>Band gần nhất</Th><Th>Bài cuối</Th><Th>{null}</Th><Th>{null}</Th></tr></thead>
          <tbody>{data.lapsed.map((p) => (
            <tr key={p.id}><Td>{p.name}<div className="text-navy-500 text-xs">{p.email}</div></Td><Td>{fmtDate(p.expires_at)}</Td>
              <Td>{p.essays}</Td><Td>{band(p.last_band)}</Td><Td>{fmtDate(p.last_essay)}</Td>
              <Td>{p.wrote_after_expiry ? <span className="text-brand-500 text-xs">Vẫn viết sau hạn</span> : null}</Td><Td><Mail email={p.email} /></Td></tr>
          ))}</tbody></TableWrap>
      </Section>

      <Section title="Sắp hết hạn (7 ngày tới)" count={data.counts.expiringSoon}
        hint="Đã có email nhắc tự động ở mốc còn 7 ngày và 1 ngày. Người viết nhiều mà sắp hết hạn: nhắn riêng một câu.">
        <TableWrap><thead><tr><Th>Khách</Th><Th>Hết hạn</Th><Th>Còn</Th><Th>Bài</Th><Th>Band gần nhất</Th><Th>{null}</Th></tr></thead>
          <tbody>{data.expiringSoon.map((p) => (
            <tr key={p.id}><Td>{p.name}<div className="text-navy-500 text-xs">{p.email}</div></Td><Td>{fmtDate(p.expires_at)}</Td>
              <Td>{daysFrom(p.expires_at)} ngày</Td><Td>{p.essays}</Td><Td>{band(p.last_band)}</Td><Td><Mail email={p.email} /></Td></tr>
          ))}</tbody></TableWrap>
      </Section>

      <Section title="Đã trả tiền, chưa chấm bài nào" count={data.counts.paidNotStarted}
        hint="Hạn dùng chưa chạy. Email onboarding tự gửi khi bật ONBOARDING_ENABLED; quá 7 ngày vẫn 0 bài thì gọi/nhắn trực tiếp.">
        <TableWrap><thead><tr><Th>Khách</Th><Th>Gói</Th><Th>Tự bắt đầu tính hạn</Th><Th>{null}</Th></tr></thead>
          <tbody>{data.paidNotStarted.map((p) => (
            <tr key={p.id}><Td>{p.name}<div className="text-navy-500 text-xs">{p.email}</div></Td><Td>{p.tier}</Td>
              <Td>{fmtDate(p.auto_start)}</Td><Td><Mail email={p.email} /></Td></tr>
          ))}</tbody></TableWrap>
      </Section>
    </>
  );
}

export default function Page() {
  return <BmsShell allow={['admin']}><Inner /></BmsShell>;
}
