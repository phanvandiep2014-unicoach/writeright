/**
 * "Căn cứ chấm" dưới mỗi tiêu chí — dẫn chứng trích từ bài + descriptor tương ứng.
 * Chỉ có ở bài chấm bằng prompt A1 (feedback.prompt_version = 'a1'); bài cũ không có
 * hai trường này nên component tự ẩn.
 */
export default function CriterionEvidence({ evidence, descriptorMatch, color }: {
  evidence?: unknown; descriptorMatch?: unknown; color: string;
}) {
  const items = Array.isArray(evidence) ? evidence.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
  const match = typeof descriptorMatch === 'string' ? descriptorMatch.trim() : '';
  if (!items.length && !match) return null;
  return (
    <div className="mt-4 pt-4 border-t border-navy-700/50">
      <div className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color }}>Căn cứ chấm</div>
      {items.length > 0 && (
        <ul className="space-y-1.5 list-none">
          {items.map((e, i) => (
            <li key={i} className="text-sm text-navy-300 pl-4 relative italic">
              <span className="absolute left-0 not-italic" style={{ color }}>“</span>{e}
            </li>
          ))}
        </ul>
      )}
      {match && <p className="text-sm text-navy-400 mt-2 leading-relaxed">{match}</p>}
    </div>
  );
}
