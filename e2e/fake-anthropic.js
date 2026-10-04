// Máy chủ Anthropic GIẢ cho test e2e: trả một kết quả chấm A1 cố định, không tốn tiền.
// Cố ý cho overall_band = 8.0 trong khi 4 tiêu chí trung bình 6.0 → server phải ghi đè thành 6.0.
const http = require('http');
const PORT = Number(process.env.FAKE_ANTHROPIC_PORT || 4010);
const bi = (en, vi) => ({ en, vi });

const RESULT = {
  error_corrections: [
    { original: 'people is', corrected: 'people are', category: 'grammar', explanation: bi('Subject-verb agreement.', 'Hoà hợp chủ ngữ – động từ.') },
    { original: 'a lot of', corrected: 'a considerable number of', category: 'register', explanation: bi('Too informal.', 'Quá thân mật cho văn học thuật.') },
  ],
  sentence_count: 12,
  error_free_sentence_count: 6,
  task_achievement: { evidence: ['Both views are discussed in body 1 and body 2', 'Opinion stated only in the conclusion'], descriptor_match: 'Band 6: addresses all parts, though some more fully than others.', band: 6.0, feedback: bi('Covers both views.', 'Có bàn cả hai quan điểm.'), improvements: [bi('State your position in the introduction.', 'Nêu quan điểm ngay mở bài.')] },
  coherence_cohesion: { evidence: ['Four of six paragraph openers are Moreover/Furthermore'], descriptor_match: 'Band 6: cohesive devices used but sometimes mechanical.', band: 6.0, feedback: bi('Logical order.', 'Trình tự hợp lý.'), improvements: [bi('Vary linking devices.', 'Đa dạng từ nối.')] },
  lexical_resource: { evidence: ['"a lot of" used three times'], descriptor_match: 'Band 6: adequate range, some inaccuracy.', band: 6.0, feedback: bi('Adequate range.', 'Vốn từ đủ dùng.'), improvements: [bi('Use topic collocations.', 'Dùng cụm từ theo chủ đề.')] },
  grammatical_range: { evidence: ['"people is" agreement error', '6 of 12 sentences error-free'], descriptor_match: 'Band 6: mix of simple and complex forms, some errors.', band: 6.0, feedback: bi('Mix of structures.', 'Có kết hợp nhiều cấu trúc.'), improvements: [bi('Check agreement.', 'Kiểm tra hoà hợp chủ – vị.')] },
  language_insights: {
    register: { rating: 'mixed', notes: [bi('"a lot of" is informal.', '"a lot of" hơi thân mật.')] },
    tone_nuance: { notes: [] }, reference_cohesion: { notes: [] },
    dialect: { variety: 'Neutral', notes: [] },
  },
  key_strengths: [bi('Clear structure.', 'Bố cục rõ ràng.')],
  priority_fixes: [bi('Subject-verb agreement.', 'Hoà hợp chủ – vị.')],
  overall_band: 8.0,
  borderline: false,
  band_descriptor: 'Competent User',
  headline: bi('A clear essay held back by accuracy.', 'Bài rõ ràng nhưng còn lỗi chính xác.'),
  summary: bi('Solid structure; fix agreement errors.', 'Bố cục tốt; cần sửa lỗi hoà hợp.'),
  model_introduction: 'It is often argued that universities should prioritise practical skills.',
  model_rewrite: 'It is often argued that universities should prioritise practical skills.\n\nE2E rewrite.',
};

let calls = 0;
http.createServer((req, res) => {
  if (req.method === 'GET') { res.writeHead(200); return res.end(JSON.stringify({ ok: true, calls })); }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    calls++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_fake', type: 'message', role: 'assistant', content: [{ type: 'text', text: JSON.stringify(RESULT) }], stop_reason: 'end_turn' }));
  });
}).listen(PORT, () => console.log('fake-anthropic on', PORT));
