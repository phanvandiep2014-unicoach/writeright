import type { Metadata } from 'next';
import MistakesClient from './MistakesClient';

export const metadata: Metadata = {
  title: 'My Mistakes Drill — WriteRight by UNICOACH',
  description: 'Practise the exact errors from your own graded essays. Instant marking, no grading credits used.',
};

export default function MistakesPage() {
  return <MistakesClient />;
}
