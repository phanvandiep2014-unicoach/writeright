import type { Metadata } from 'next';
import PracticeClient from './PracticeClient';

export const metadata: Metadata = {
  title: 'IELTS Writing Practice — WriteRight by UNICOACH',
  description: 'Pick a Task 1 or Task 2 prompt, write your essay and get a four-criteria band score; add daily grammar, vocabulary and cohesion drills.',
};

export default function PracticePage() {
  return <PracticeClient />;
}
