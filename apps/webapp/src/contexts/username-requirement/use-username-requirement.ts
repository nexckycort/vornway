import { use } from 'react';
import { UsernameRequirementContext } from './username-requirement-context';

export function useUsernameRequirement() {
  const context = use(UsernameRequirementContext);
  if (!context) {
    throw new Error(
      'useUsernameRequirement must be used within a UsernameRequirementProvider',
    );
  }

  return context;
}
