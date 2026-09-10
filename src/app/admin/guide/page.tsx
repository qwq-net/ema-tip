import { AdminGuide } from '@/features/admin/guide/ui/admin-guide';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'クイックガイド | 管理画面',
};

export default function AdminGuidePage() {
  return <AdminGuide />;
}
