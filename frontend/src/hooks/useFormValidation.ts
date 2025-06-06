import { useForm, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

export function useFormValidation<T extends z.ZodType>(
  schema: T,
  defaultValues?: Partial<z.infer<T>>
) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as import('react-hook-form').DefaultValues<z.infer<T>> | undefined,
  });

  const getFieldError = (field: Path<z.infer<T>>) => {
    const error = errors[field];
    if (!error) return undefined;
    return t(error.message as string);
  };

  const setFieldError = (field: Path<z.infer<T>>, message: string) => {
    setError(field, {
      type: 'manual',
      message,
    });
  };

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    setError,
    reset,
    watch,
    setValue,
    getValues,
    getFieldError,
    setFieldError,
  };
} 