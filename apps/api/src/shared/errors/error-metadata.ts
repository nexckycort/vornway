import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorMetadataStatus = Extract<
  ContentfulStatusCode,
  400 | 401 | 403 | 404 | 409 | 422 | 500
>;

export interface ErrorMetadata<S extends ErrorMetadataStatus> {
  readonly code: string;
  readonly message: string;
  readonly status: S;
}

export type ErrorBody = {
  code: string;
  message: string;
};

export type ErrorStatusOf<E> = E extends {
  readonly status: infer S;
}
  ? S extends ErrorMetadataStatus
    ? S
    : 500
  : 500;
