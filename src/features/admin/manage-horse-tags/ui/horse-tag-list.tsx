'use client';

import { HorseTagType } from '@/entities/horse';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { HORSE_TAG_CATEGORIES } from '@/shared/constants/horse-tags';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteHorseTag } from '../actions';
import { HorseTagForm } from './horse-tag-form';

interface HorseTagListProps {
  tags: Array<{
    id: string;
    type: HorseTagType;
    content: string;
  }>;
}

export function HorseTagList({ tags }: HorseTagListProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: string; type: HorseTagType; content: string } | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteHorseTag(id);
      toast.success('削除しました');
    } catch (error) {
      console.error(error);
      toast.error('削除に失敗しました');
      throw error;
    }
  };

  const categorizedTags = {
    LEG_TYPE: tags.filter((tag) => tag.type === 'LEG_TYPE'),
    CHARACTERISTIC: tags.filter((tag) => tag.type === 'CHARACTERISTIC'),
    BIOGRAPHY: tags.filter((tag) => tag.type === 'BIOGRAPHY'),
    OTHER: tags.filter((tag) => tag.type === 'OTHER'),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              タグを追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規タグ登録</DialogTitle>
            </DialogHeader>
            <HorseTagForm onSuccess={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {(['LEG_TYPE', 'CHARACTERISTIC', 'BIOGRAPHY', 'OTHER'] as const).map((type) => {
          const typeTags = categorizedTags[type] || [];
          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <AdminSectionTitle>{HORSE_TAG_CATEGORIES[type]}</AdminSectionTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {typeTags.length > 0 ? (
                    typeTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-sm shadow-xs"
                      >
                        <span className="font-medium text-gray-700">{tag.content}</span>
                        <div className="ml-2 flex items-center gap-1">
                          <button
                            onClick={() => setEditingTag(tag)}
                            className="text-gray-400 transition-colors hover:text-blue-500"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <ConfirmDialog
                            trigger={
                              <button className="text-gray-400 transition-colors hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            }
                            title="タグの削除"
                            description={`本当に「${tag.content}」を削除してもよろしいですか？`}
                            confirmLabel="削除する"
                            onConfirm={() => handleDelete(tag.id)}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 italic">登録なし</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タグの編集</DialogTitle>
          </DialogHeader>
          {editingTag && <HorseTagForm initialData={editingTag} onSuccess={() => setEditingTag(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
