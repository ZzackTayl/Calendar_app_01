/**
 * useZodForm Hook
 * 
 * A wrapper around react-hook-form that adds Zod validation with proper error handling.
 * This hook simplifies form validation while maintaining type safety.
 */

import { useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Hook for using react-hook-form with Zod validation
 * 
 * @param schema Zod schema for validation
 * @param options Additional UseFormProps options
 * @returns All react-hook-form methods and state
 * 
 * @example
 * const { register, handleSubmit, formState } = useZodForm({
 *   schema: EventSchema,
 *   defaultValues: { title: 'New Event' }
 * });
 * 
 * const onSubmit = (data) => console.log(data);
 * 
 * return (
 *   <form onSubmit={handleSubmit(onSubmit)}>
 *     <input {...register('title')} />
 *     {formState.errors.title?.message && (
 *       <span>{formState.errors.title.message}</span>
 *     )}
 *   </form>
 * );
 */
export function useZodForm<TSchema extends z.ZodType<any, any, any>>(
  props: Omit<UseFormProps<z.infer<TSchema> & FieldValues>, 'resolver'> & {
    schema: TSchema;
  }
): UseFormReturn<z.infer<TSchema> & FieldValues> {
  const { schema, ...formProps } = props;
  
  // Use zodResolver to integrate zod validation with react-hook-form
  return useForm<z.infer<TSchema> & FieldValues>({
    ...formProps,
    resolver: zodResolver(schema) as any,
  });
}

export default useZodForm;
