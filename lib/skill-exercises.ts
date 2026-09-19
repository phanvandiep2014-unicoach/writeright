// Bài tập kỹ năng nhỏ cho phần "Luyện tập" — trắc nghiệm chấm tức thì bằng đáp án
// có sẵn, KHÔNG gọi AI (chi phí API bằng 0, nên học viên Free vẫn có việc để làm).
// Toàn bộ nội dung do UNICOACH tự biên soạn.

export type Criterion = 'ta' | 'cc' | 'lr' | 'gra';

export type ExerciseKind = 'grammar' | 'paraphrase' | 'linking' | 'collocation' | 'overview';

export interface SkillExercise {
  id: string;
  kind: ExerciseKind;
  criterion: Criterion;
  /** Tình huống / đề gốc (tuỳ chọn), hiển thị phía trên câu hỏi. */
  context?: string;
  question: string;
  options: string[];
  /** Chỉ số (0-based) của đáp án đúng. */
  answer: number;
  /** Giải thích tiếng Việt, hiện sau khi trả lời. */
  explanation: string;
}

export const CRITERION_LABEL: Record<Criterion, { short: string; name: string; color: string }> = {
  ta: { short: 'TA/TR', name: 'Task Achievement / Response', color: '#7B9FE0' },
  cc: { short: 'CC', name: 'Coherence & Cohesion', color: '#56B6A2' },
  lr: { short: 'LR', name: 'Lexical Resource', color: '#E06C75' },
  gra: { short: 'GRA', name: 'Grammatical Range & Accuracy', color: '#E5C07B' },
};

export const KIND_META: Record<ExerciseKind, { label: string; hint: string; criterion: Criterion }> = {
  grammar: { label: 'Sửa lỗi ngữ pháp', hint: 'Thì, hoà hợp chủ – vị, mạo từ, câu điều kiện', criterion: 'gra' },
  paraphrase: { label: 'Paraphrase câu đề', hint: 'Đổi từ vựng và cấu trúc, giữ nguyên nghĩa', criterion: 'ta' },
  linking: { label: 'Liên kết ý', hint: 'Từ nối và quy chiếu đúng logic', criterion: 'cc' },
  collocation: { label: 'Kết hợp từ', hint: 'Collocation học thuật tự nhiên', criterion: 'lr' },
  overview: { label: 'Mở bài & overview', hint: 'Câu overview Task 1, luận điểm Task 2', criterion: 'ta' },
};

export const SKILL_EXERCISES: SkillExercise[] = [
  // ── Ngữ pháp (GRA) ──────────────────────────────────────────
  {
    id: 'gra-01', kind: 'grammar', criterion: 'gra',
    question: 'Chọn câu đúng ngữ pháp.',
    options: [
      'The number of students who studies abroad have increased.',
      'The number of students who study abroad has increased.',
      'The number of students who studies abroad has increased.',
      'The numbers of student who study abroad has increased.',
    ],
    answer: 1,
    explanation: '"The number of + danh từ số nhiều" đi với động từ số ít (has increased); "who" thay cho "students" nên dùng "study".',
  },
  {
    id: 'gra-02', kind: 'grammar', criterion: 'gra',
    question: 'By 2030, the government ___ over 500 new schools.',
    options: ['has built', 'built', 'will have built', 'is building'],
    answer: 2,
    explanation: 'Mốc tương lai "By 2030" cần thì tương lai hoàn thành: will have built.',
  },
  {
    id: 'gra-03', kind: 'grammar', criterion: 'gra',
    question: 'Chọn câu điều kiện đúng.',
    options: [
      'If governments will invest more in public transport, congestion will fall.',
      'If governments invested more in public transport, congestion will fall.',
      'If governments invest more in public transport, congestion will fall.',
      'If governments would invest more in public transport, congestion falls.',
    ],
    answer: 2,
    explanation: 'Câu điều kiện loại 1: If + hiện tại đơn, will + động từ nguyên mẫu. Không dùng "will" trong mệnh đề If.',
  },
  {
    id: 'gra-04', kind: 'grammar', criterion: 'gra',
    question: '___ increase in ___ unemployment rate was recorded last year.',
    options: ['An / the', 'The / an', 'An / a', 'The / the'],
    answer: 0,
    explanation: '"An increase" (lần đầu nhắc, âm nguyên âm) và "the unemployment rate" (đối tượng xác định).',
  },
  {
    id: 'gra-05', kind: 'grammar', criterion: 'gra',
    question: 'Neither the teachers nor the principal ___ satisfied with the results.',
    options: ['were', 'have been', 'are', 'was'],
    answer: 3,
    explanation: 'Với neither…nor, động từ hoà hợp với chủ ngữ gần nhất: "the principal" là số ít nên dùng "was".',
  },

  // ── Paraphrase (TA/TR) ──────────────────────────────────────
  {
    id: 'ta-para-01', kind: 'paraphrase', criterion: 'ta',
    context: 'Câu gốc: "More and more people are moving to cities."',
    question: 'Câu nào là paraphrase tốt nhất (đổi cả từ vựng lẫn cấu trúc, giữ nguyên nghĩa)?',
    options: [
      'People are moving more to city.',
      'An increasing number of individuals are relocating to urban areas.',
      'Cities are moving to more people.',
      'More people moving cities.',
    ],
    answer: 1,
    explanation: '"More and more people" → "an increasing number of individuals"; "moving to cities" → "relocating to urban areas". Các lựa chọn khác sai ngữ pháp hoặc sai nghĩa.',
  },
  {
    id: 'ta-para-02', kind: 'paraphrase', criterion: 'ta',
    context: 'Câu gốc: "Some people think that children should start school at a very early age."',
    question: 'Câu nào là paraphrase tốt nhất?',
    options: [
      'Some people believe that children should start school at a very early age.',
      'Some people think children should not go to school until they are older.',
      'It is argued by certain individuals that formal education ought to begin in early childhood.',
      'Children who start school early always perform better.',
    ],
    answer: 2,
    explanation: 'Câu đúng đổi cả từ vựng lẫn cấu trúc (câu bị động) mà giữ đúng nghĩa. Câu chỉ đổi "think" thành "believe" là gần như chép lại; câu "should not go to school until…" ngược nghĩa; câu "always perform better" thêm ý mới không có trong đề.',
  },
  {
    id: 'ta-para-03', kind: 'paraphrase', criterion: 'ta',
    context: 'Câu gốc: "The chart shows the proportion of energy produced from renewable sources."',
    question: 'Câu nào paraphrase đúng?',
    options: [
      'The graph illustrates the percentage of power that is generated by non-renewable resources.',
      'The chart shows how much money renewable energy costs.',
      'The graph illustrates the percentage of power generated by renewable resources.',
      'The chart shows the proportion of energy produced from renewable sources in the past.',
    ],
    answer: 2,
    explanation: 'chart → graph, shows → illustrates, proportion → percentage, energy → power, produced from → generated by. Câu dùng "non-renewable" sai nghĩa; câu nói về chi phí đổi chủ đề; câu thêm "in the past" chép lại và thêm ý.',
  },

  // ── Liên kết (CC) ───────────────────────────────────────────
  {
    id: 'cc-01', kind: 'linking', criterion: 'cc',
    question: 'Many students prefer online courses. ___, others find classroom learning more effective.',
    options: ['Moreover', 'For instance', 'In contrast', 'As a result'],
    answer: 2,
    explanation: 'Hai vế nêu quan điểm đối lập nên cần từ nối chỉ sự tương phản: In contrast.',
  },
  {
    id: 'cc-02', kind: 'linking', criterion: 'cc',
    question: 'Public transport is cheap and reliable. ___, it reduces air pollution.',
    options: ['Nevertheless', 'Whereas', 'Otherwise', 'Moreover'],
    answer: 3,
    explanation: 'Câu sau bổ sung thêm một lợi ích cùng chiều, nên dùng từ nối bổ sung: Moreover.',
  },
  {
    id: 'cc-03', kind: 'linking', criterion: 'cc',
    question: '___ the cost of living has risen sharply, many families struggle to save money.',
    options: ['Despite', 'Although', 'Unless', 'Because'],
    answer: 3,
    explanation: 'Quan hệ nguyên nhân – kết quả: Because + mệnh đề. "Despite" đi với cụm danh từ; "Although" chỉ tương phản nên sai logic.',
  },
  {
    id: 'cc-04', kind: 'linking', criterion: 'cc',
    question: 'Governments should ban plastic bags. ___ would reduce marine pollution significantly.',
    options: ['They', 'Which', 'This measure', 'It ban'],
    answer: 2,
    explanation: '"This measure" quy chiếu rõ ràng về ý ở câu trước. "They" thiếu đối tượng rõ ràng; "Which" không đứng đầu câu độc lập.',
  },

  // ── Kết hợp từ (LR) ─────────────────────────────────────────
  {
    id: 'lr-01', kind: 'collocation', criterion: 'lr',
    question: 'Governments should ___ stricter laws to protect the environment.',
    options: ['drop', 'take', 'hold', 'introduce'],
    answer: 3,
    explanation: '"Introduce laws" là collocation học thuật chuẩn (cũng có "enact", "pass").',
  },
  {
    id: 'lr-02', kind: 'collocation', criterion: 'lr',
    question: 'Technology has had a profound ___ on the way we communicate.',
    options: ['reason', 'impact', 'matter', 'cause'],
    answer: 1,
    explanation: '"Have a profound impact on" là kết hợp từ tự nhiên; các từ còn lại không đi với "on".',
  },
  {
    id: 'lr-03', kind: 'collocation', criterion: 'lr',
    question: 'Young people are under great ___ to succeed academically.',
    options: ['force', 'weight', 'pressure', 'tension'],
    answer: 2,
    explanation: 'Cụm cố định: "under pressure to + động từ".',
  },
  {
    id: 'lr-04', kind: 'collocation', criterion: 'lr',
    question: 'The number of cars on the roads has risen ___ over the past decade.',
    options: ['highly', 'widely', 'sharply', 'deeply'],
    answer: 2,
    explanation: '"Rise sharply" là trạng từ chuẩn để mô tả xu hướng tăng nhanh trong Task 1 lẫn Task 2.',
  },

  // ── Mở bài & overview (TA/TR) ───────────────────────────────
  {
    id: 'ta-ov-01', kind: 'overview', criterion: 'ta',
    context: 'Task 1: biểu đồ cột về lượng nước tiêu thụ theo ngành tại bốn quốc gia. Nông nghiệp chiếm nhiều nhất ở cả bốn nước; sinh hoạt thấp nhất ở cả bốn.',
    question: 'Câu nào là overview tốt nhất?',
    options: [
      'In my opinion, water use is a serious problem.',
      'In 2021, the first country used 40 billion cubic metres in agriculture.',
      'The chart is about water.',
      'Overall, agriculture accounted for the largest share of water use in all four countries, while domestic use was consistently the smallest.',
    ],
    answer: 3,
    explanation: 'Overview phải nêu xu hướng/điểm nổi bật chung: không đưa số liệu chi tiết của một quốc gia, không nêu ý kiến cá nhân và không quá chung chung như "The chart is about water".',
  },
  {
    id: 'ta-ov-02', kind: 'overview', criterion: 'ta',
    context: 'Đề Task 2: "Some people believe university education should be free for all. To what extent do you agree or disagree?"',
    question: 'Đoạn mở bài nào có luận điểm rõ ràng nhất?',
    options: [
      'I will talk about university education.',
      'University education is very good and everyone must go.',
      'It is often argued that higher education should be free of charge; however, I only partly agree, as free tuition would benefit students but place a heavy burden on public budgets.',
      'Some people think university education should be free. This essay will discuss it.',
    ],
    answer: 2,
    explanation: 'Đoạn đúng paraphrase đề và nêu rõ quan điểm (đồng ý một phần) cùng hai lý do sẽ triển khai. Các lựa chọn khác không có quan điểm hoặc chỉ chép lại đề.',
  },
];

export function exercisesByKind(kind: ExerciseKind | 'all'): SkillExercise[] {
  return kind === 'all' ? SKILL_EXERCISES : SKILL_EXERCISES.filter(e => e.kind === kind);
}

/**
 * Xáo thứ tự lựa chọn để đáp án không dồn vào một ô. Lời giải thích không nhắc
 * chữ cái A/B/C/D nên vẫn đúng sau khi xáo. `rand` truyền vào để kiểm thử.
 */
export function withShuffledOptions(ex: SkillExercise, rand: () => number = Math.random): SkillExercise {
  const order = ex.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...ex, options: order.map(i => ex.options[i]), answer: order.indexOf(ex.answer) };
}
