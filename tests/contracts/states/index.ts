import { authProviderStates } from './supabase';

export const providerStates = [
  ...authProviderStates,
];

export type ProviderStateName = (typeof providerStates)[number]['name'];
