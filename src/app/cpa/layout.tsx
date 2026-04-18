import { CPAShell } from '@/components/layout/CPAShell';

export default function CPALayout({ children }: { children: React.ReactNode }) {
  return <CPAShell>{children}</CPAShell>;
}
