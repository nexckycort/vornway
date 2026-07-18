import type { ErrorMetadataStatus } from './error-metadata';

type AppErrorInput<S extends ErrorMetadataStatus = ErrorMetadataStatus> = {
  status: S;
  code: string;
  message: string;
  cause?: unknown;
};

export class AppError<
  S extends ErrorMetadataStatus = ErrorMetadataStatus,
> extends Error {
  readonly status: S;
  readonly code: string;
  readonly cause?: unknown;

  constructor(input: AppErrorInput<S>) {
    super(input.message);
    this.name = 'AppError';
    this.status = input.status;
    this.code = input.code;
    this.cause = input.cause;
  }
}
