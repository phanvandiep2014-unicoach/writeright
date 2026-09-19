import type { Metadata } from 'next';
import ProgressClient from './ProgressClient';

export const metadata: Metadata = {
  title: 'Practice Progress — WriteRight by UNICOACH',
  description: 'Band trend, error profile, practice streak and today\'s recommended drill.',
};

export default function ProgressPage() {
  return <ProgressClient />;
}
