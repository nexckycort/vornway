import type { ErrorMetadata, ErrorMetadataStatus } from './error-metadata';

export const isErrorMetadata = (
  error: unknown,
): error is ErrorMetadata<ErrorMetadataStatus> => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  );
};
