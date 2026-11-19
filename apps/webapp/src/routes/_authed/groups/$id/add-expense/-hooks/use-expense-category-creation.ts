import { useEffect, useRef, useState } from 'react';
import { categoryIconOptions } from '#/routes/_authed/groups/$id/-components/category-icon';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { useCreateCategoryMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import {
  categoryColorOptions,
  customCategoryIconId,
} from '../-lib/expense-form.types';

type UseExpenseCategoryCreationOptions = {
  createCategoryMutation: ReturnType<typeof useCreateCategoryMutation>;
  setCategoryId: (categoryId: string) => void;
  setError: (message: string) => void;
  groupMessages: ReturnType<typeof getGroupDetailMessages>;
};

export function useExpenseCategoryCreation({
  createCategoryMutation,
  setCategoryId,
  setError,
  groupMessages,
}: UseExpenseCategoryCreationOptions) {
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showCreateCategoryForm, setShowCreateCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(
    categoryIconOptions[1].id,
  );
  const [newCategoryCustomIcon, setNewCategoryCustomIcon] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(
    categoryColorOptions[0],
  );
  const customCategoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const isCustomCategoryIcon = newCategoryIcon === customCategoryIconId;
  const customCategoryIcon = newCategoryCustomIcon.trim();
  const trimmedNewCategoryName = newCategoryName.trim();

  useEffect(() => {
    if (!isCustomCategoryIcon) return;

    const frame = window.requestAnimationFrame(() => {
      customCategoryIconInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isCustomCategoryIcon]);

  const openCreateCategoryForm = () => {
    setShowCreateCategoryForm(true);
  };

  const handleCreateCategory = async () => {
    if (!trimmedNewCategoryName || createCategoryMutation.isPending) return;

    try {
      const created = await createCategoryMutation.mutateAsync({
        name: trimmedNewCategoryName,
        icon: isCustomCategoryIcon
          ? customCategoryIcon || undefined
          : newCategoryIcon,
        color: newCategoryColor,
      });
      setCategoryId(created.id);
      setNewCategoryName('');
      setNewCategoryIcon(categoryIconOptions[1].id);
      setNewCategoryCustomIcon('');
      setNewCategoryColor(categoryColorOptions[0]);
      setShowCreateCategoryForm(false);
      setShowCategoryDrawer(false);
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : groupMessages.expense.createCategoryFailed,
      );
    }
  };

  return {
    customCategoryIcon,
    customCategoryIconInputRef,
    handleCreateCategory,
    isCustomCategoryIcon,
    newCategoryColor,
    newCategoryCustomIcon,
    newCategoryIcon,
    newCategoryName,
    openCreateCategoryForm,
    setNewCategoryColor,
    setNewCategoryCustomIcon,
    setNewCategoryIcon,
    setNewCategoryName,
    setShowCategoryDrawer,
    setShowCreateCategoryForm,
    showCategoryDrawer,
    showCreateCategoryForm,
    trimmedNewCategoryName,
  };
}
