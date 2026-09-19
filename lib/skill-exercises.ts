// Small skill drills for the "Practice" section — multiple choice marked instantly against
// stored answers, NO AI call (zero API cost, so Free learners always have something to do).
// All content is written by UNICOACH.

export type Criterion = 'ta' | 'cc' | 'lr' | 'gra';

export type ExerciseKind = 'grammar' | 'paraphrase' | 'linking' | 'collocation' | 'overview';

export interface SkillExercise {
  id: string;
  kind: ExerciseKind;
  criterion: Criterion;
  /** Scenario / source sentence (optional), shown above the question. */
  context?: string;
  question: string;
  options: string[];
  /** Index (0-based) of the correct answer. */
  answer: number;
  /** Explanation in English, shown after answering. */
  explanation: string;
}

export const CRITERION_LABEL: Record<Criterion, { short: string; name: string; color: string }> = {
  ta: { short: 'TA/TR', name: 'Task Achievement / Response', color: '#7B9FE0' },
  cc: { short: 'CC', name: 'Coherence & Cohesion', color: '#56B6A2' },
  lr: { short: 'LR', name: 'Lexical Resource', color: '#E06C75' },
  gra: { short: 'GRA', name: 'Grammatical Range & Accuracy', color: '#E5C07B' },
};

export const KIND_META: Record<ExerciseKind, { label: string; hint: string; criterion: Criterion }> = {
  grammar: { label: 'Grammar correction', hint: 'Tenses, subject–verb agreement, articles, conditionals', criterion: 'gra' },
  paraphrase: { label: 'Paraphrasing the prompt', hint: 'Change vocabulary and structure, keep the meaning', criterion: 'ta' },
  linking: { label: 'Linking ideas', hint: 'Logical connectors and clear reference', criterion: 'cc' },
  collocation: { label: 'Collocations', hint: 'Natural academic word partnerships', criterion: 'lr' },
  overview: { label: 'Introductions & overviews', hint: 'Task 1 overview, Task 2 thesis statement', criterion: 'ta' },
};

export const SKILL_EXERCISES: SkillExercise[] = [
  // ── Grammar (GRA) ──────────────────────────────────────────
  {
    id: 'gra-01', kind: 'grammar', criterion: 'gra',
    question: 'Choose the grammatically correct sentence.',
    options: [
      'The number of students who studies abroad have increased.',
      'The number of students who study abroad has increased.',
      'The number of students who studies abroad has increased.',
      'The numbers of student who study abroad has increased.',
    ],
    answer: 1,
    explanation: '"The number of + plural noun" takes a singular verb (has increased); "who" refers back to "students", so it takes "study".',
  },
  {
    id: 'gra-02', kind: 'grammar', criterion: 'gra',
    question: 'By 2030, the government ___ over 500 new schools.',
    options: ['has built', 'built', 'will have built', 'is building'],
    answer: 2,
    explanation: 'The future deadline "By 2030" calls for the future perfect: will have built.',
  },
  {
    id: 'gra-03', kind: 'grammar', criterion: 'gra',
    question: 'Choose the correct conditional sentence.',
    options: [
      'If governments will invest more in public transport, congestion will fall.',
      'If governments invested more in public transport, congestion will fall.',
      'If governments invest more in public transport, congestion will fall.',
      'If governments would invest more in public transport, congestion falls.',
    ],
    answer: 2,
    explanation: 'First conditional: If + present simple, will + base verb. Do not use "will" in the If-clause.',
  },
  {
    id: 'gra-04', kind: 'grammar', criterion: 'gra',
    question: '___ increase in ___ unemployment rate was recorded last year.',
    options: ['An / the', 'The / an', 'An / a', 'The / the'],
    answer: 0,
    explanation: '"An increase" (first mention, vowel sound) and "the unemployment rate" (a specific, identifiable thing).',
  },
  {
    id: 'gra-05', kind: 'grammar', criterion: 'gra',
    question: 'Neither the teachers nor the principal ___ satisfied with the results.',
    options: ['were', 'have been', 'are', 'was'],
    answer: 3,
    explanation: 'With neither…nor, the verb agrees with the nearer subject: "the principal" is singular, so use "was".',
  },

  // ── Paraphrase (TA/TR) ──────────────────────────────────────
  {
    id: 'ta-para-01', kind: 'paraphrase', criterion: 'ta',
    context: 'Original sentence: "More and more people are moving to cities."',
    question: 'Which is the best paraphrase (changes both vocabulary and structure, keeps the meaning)?',
    options: [
      'People are moving more to city.',
      'An increasing number of individuals are relocating to urban areas.',
      'Cities are moving to more people.',
      'More people moving cities.',
    ],
    answer: 1,
    explanation: '"More and more people" → "an increasing number of individuals"; "moving to cities" → "relocating to urban areas". The other options are ungrammatical or change the meaning.',
  },
  {
    id: 'ta-para-02', kind: 'paraphrase', criterion: 'ta',
    context: 'Original sentence: "Some people think that children should start school at a very early age."',
    question: 'Which is the best paraphrase?',
    options: [
      'Some people believe that children should start school at a very early age.',
      'Some people think children should not go to school until they are older.',
      'It is argued by certain individuals that formal education ought to begin in early childhood.',
      'Children who start school early always perform better.',
    ],
    answer: 2,
    explanation: 'The correct option changes both vocabulary and structure (a passive) while keeping the meaning. Only swapping "think" for "believe" is almost copying; "should not go to school until…" reverses the meaning; "always perform better" adds an idea that is not in the original.',
  },
  {
    id: 'ta-para-03', kind: 'paraphrase', criterion: 'ta',
    context: 'Original sentence: "The chart shows the proportion of energy produced from renewable sources."',
    question: 'Which paraphrase is correct?',
    options: [
      'The graph illustrates the percentage of power that is generated by non-renewable resources.',
      'The chart shows how much money renewable energy costs.',
      'The graph illustrates the percentage of power generated by renewable resources.',
      'The chart shows the proportion of energy produced from renewable sources in the past.',
    ],
    answer: 2,
    explanation: 'chart → graph, shows → illustrates, proportion → percentage, energy → power, produced from → generated by. The "non-renewable" option changes the meaning; the cost option changes the topic; the "in the past" option copies the original and adds an idea.',
  },

  // ── Linking (CC) ───────────────────────────────────────────
  {
    id: 'cc-01', kind: 'linking', criterion: 'cc',
    question: 'Many students prefer online courses. ___, others find classroom learning more effective.',
    options: ['Moreover', 'For instance', 'In contrast', 'As a result'],
    answer: 2,
    explanation: 'The two sentences state opposing views, so a contrast connector is needed: In contrast.',
  },
  {
    id: 'cc-02', kind: 'linking', criterion: 'cc',
    question: 'Public transport is cheap and reliable. ___, it reduces air pollution.',
    options: ['Nevertheless', 'Whereas', 'Otherwise', 'Moreover'],
    answer: 3,
    explanation: 'The second sentence adds another benefit in the same direction, so use an addition connector: Moreover.',
  },
  {
    id: 'cc-03', kind: 'linking', criterion: 'cc',
    question: '___ the cost of living has risen sharply, many families struggle to save money.',
    options: ['Despite', 'Although', 'Unless', 'Because'],
    answer: 3,
    explanation: 'Cause – effect: Because + clause. "Despite" takes a noun phrase; "Although" signals contrast, which is illogical here.',
  },
  {
    id: 'cc-04', kind: 'linking', criterion: 'cc',
    question: 'Governments should ban plastic bags. ___ would reduce marine pollution significantly.',
    options: ['They', 'Which', 'This measure', 'It ban'],
    answer: 2,
    explanation: '"This measure" clearly refers back to the idea in the previous sentence. "They" has no clear referent; "Which" cannot start a stand-alone sentence.',
  },

  // ── Collocations (LR) ─────────────────────────────────────────
  {
    id: 'lr-01', kind: 'collocation', criterion: 'lr',
    question: 'Governments should ___ stricter laws to protect the environment.',
    options: ['drop', 'take', 'hold', 'introduce'],
    answer: 3,
    explanation: '"Introduce laws" is a standard academic collocation ("enact" and "pass" also work).',
  },
  {
    id: 'lr-02', kind: 'collocation', criterion: 'lr',
    question: 'Technology has had a profound ___ on the way we communicate.',
    options: ['reason', 'impact', 'matter', 'cause'],
    answer: 1,
    explanation: '"Have a profound impact on" is a natural collocation; the other adjectives do not collocate with "impact on".',
  },
  {
    id: 'lr-03', kind: 'collocation', criterion: 'lr',
    question: 'Young people are under great ___ to succeed academically.',
    options: ['force', 'weight', 'pressure', 'tension'],
    answer: 2,
    explanation: 'Fixed phrase: "under pressure to + verb".',
  },
  {
    id: 'lr-04', kind: 'collocation', criterion: 'lr',
    question: 'The number of cars on the roads has risen ___ over the past decade.',
    options: ['highly', 'widely', 'sharply', 'deeply'],
    answer: 2,
    explanation: '"Rise sharply" is the standard adverb collocation for describing a rapid increase in both Task 1 and Task 2.',
  },

  // ── Introductions & overviews (TA/TR) ───────────────────────────────
  {
    id: 'ta-ov-01', kind: 'overview', criterion: 'ta',
    context: 'Task 1: a bar chart of water consumption by sector in four countries. Agriculture uses the most in all four countries; households use the least in all four.',
    question: 'Which is the best overview?',
    options: [
      'In my opinion, water use is a serious problem.',
      'In 2021, the first country used 40 billion cubic metres in agriculture.',
      'The chart is about water.',
      'Overall, agriculture accounted for the largest share of water use in all four countries, while domestic use was consistently the smallest.',
    ],
    answer: 3,
    explanation: 'An overview must state the main trends or key features: it should not give detailed figures for one country, give personal opinions, or be as vague as "The chart is about water".',
  },
  {
    id: 'ta-ov-02', kind: 'overview', criterion: 'ta',
    context: 'Task 2 prompt: "Some people believe university education should be free for all. To what extent do you agree or disagree?"',
    question: 'Which introduction has the clearest thesis?',
    options: [
      'I will talk about university education.',
      'University education is very good and everyone must go.',
      'It is often argued that higher education should be free of charge; however, I only partly agree, as free tuition would benefit students but place a heavy burden on public budgets.',
      'Some people think university education should be free. This essay will discuss it.',
    ],
    answer: 2,
    explanation: 'The correct option paraphrases the prompt and states a clear position (partly agree) with the two reasons to be developed. The other options give no position or just copy the prompt.',
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
