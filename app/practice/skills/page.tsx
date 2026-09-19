import type { Metadata } from 'next';
import SkillsClient from './SkillsClient';

export const metadata: Metadata = {
  title: 'IELTS Writing Skill Drills — WriteRight by UNICOACH',
  description: 'Short 3–5 minute drills: grammar correction, paraphrasing, linking, collocations and overviews. Instant marking, no grading credits used.',
};

export default function SkillsPage() {
  return <SkillsClient />;
}
