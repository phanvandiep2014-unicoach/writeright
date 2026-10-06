// Ghi chú minh bạch dưới điểm band: điểm AI là ước lượng luyện tập, không phải điểm thi.
// Số liệu: đối chiếu 21 bài có điểm cựu giám khảo (06/10/2026) — AI xếp hạng bài đúng (r≈0.9)
// nhưng chấm chặt hơn ~1 band ở bài từ 7.0 trở lên. Chỉ dùng "có xu hướng", không cam kết con số.
export default function BandDisclaimer({ className = '' }: { className?: string }) {
  return (
    <details className={`mt-4 text-xs text-navy-400 leading-relaxed ${className}`}>
      <summary className="cursor-pointer select-none text-navy-300 hover:text-white">
        Band AI là ước lượng để luyện tập, không phải điểm thi chính thức
        <span className="block text-navy-500">AI bands are practice estimates, not official IELTS scores</span>
      </summary>
      <p className="mt-2">
        Khi đối chiếu với một cựu giám khảo IELTS, AI có xu hướng chấm chặt hơn khoảng 1 band ở những bài từ 7.0 trở lên,
        nhưng xếp hạng bài tốt/kém rất ổn định. Hãy theo dõi xu hướng điểm của bạn qua nhiều bài thay vì một con số đơn lẻ.
      </p>
      <p className="mt-1 text-navy-500">
        Compared with a former IELTS examiner, the AI tends to mark about one band lower on essays at 7.0 and above, but
        ranks stronger and weaker essays reliably. Track your trend across essays rather than a single number.
      </p>
    </details>
  );
}
