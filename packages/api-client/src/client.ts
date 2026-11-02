import type {
  DataTag,
  InfiniteData,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';
import { Api } from '@vornway/contracts/api';
import type { Cursor } from '@vornway/contracts/schema';
import { Cause, Data, Effect, Exit, Option } from 'effect';
import { FetchHttpClient, HttpClient, HttpClientRequest } from 'effect/http';
import {
  type HttpApi,
  HttpApiClient,
  type HttpApiEndpoint,
  type HttpApiGroup,
} from 'effect/http-api';
import type { Simplify } from 'effect/Types';

type Groups = typeof Api extends HttpApi.HttpApi<string, infer G> ? G : never;

export type GroupId = HttpApiGroup.Identifier<Groups>;

type EndpointOf<G extends GroupId> = HttpApiGroup.Endpoints<
  HttpApiGroup.WithIdentifier<Groups, G>
>;

export type EndpointId<G extends GroupId> = HttpApiEndpoint.Identifier<
  EndpointOf<G>
>;

type Endpoint<
  G extends GroupId,
  E extends EndpointId<G>,
> = HttpApiEndpoint.WithIdentifier<EndpointOf<G>, E>;

type Call<
  G extends GroupId,
  E extends EndpointId<G>,
> = HttpApiClient.Client.MethodReturn<
  Endpoint<G, E>,
  never,
  never,
  'decoded-only'
>;

type OmittableParts<R> = Simplify<
  {
    readonly [K in keyof R as IsOmittable<R[K]> extends true ? never : K]: R[K];
  } & {
    readonly [K in keyof R as IsOmittable<R[K]> extends true
      ? K
      : never]?: R[K];
  }
>;

type IsOmittable<V> = V extends object
  ? Partial<V> extends V
    ? true
    : false
  : false;

export type ApiRequest<
  G extends GroupId,
  E extends EndpointId<G>,
> = OmittableParts<
  Omit<
    HttpApiEndpoint.ClientRequest<
      Endpoint<G, E>['~Params'],
      Endpoint<G, E>['~Query'],
      Endpoint<G, E>['~Payload'],
      Endpoint<G, E>['~Headers'],
      'decoded-only'
    >,
    'responseMode'
  >
>;

export type ApiSuccess<
  G extends GroupId,
  E extends EndpointId<G>,
> = Effect.Success<Call<G, E>>;

export type ApiError<G extends GroupId, E extends EndpointId<G>> =
  | Effect.Error<Call<G, E>>
  | ApiDefect;

// A defect or an interruption, never an error the endpoint declares.
export class ApiDefect extends Data.TaggedError('ApiDefect')<{
  readonly cause: unknown;
}> {}

type RequestArgs<G extends GroupId, E extends EndpointId<G>> =
  Partial<ApiRequest<G, E>> extends ApiRequest<G, E>
    ? [request?: ApiRequest<G, E>]
    : [request: ApiRequest<G, E>];

export type ApiQueryKey<G extends GroupId, E extends EndpointId<G>> = readonly [
  'api',
  G,
  E,
  ApiRequest<G, E>,
];

export type ApiQueryOptions<
  G extends GroupId,
  E extends EndpointId<G>,
> = UseQueryOptions<
  ApiSuccess<G, E>,
  ApiError<G, E>,
  ApiSuccess<G, E>,
  ApiQueryKey<G, E>
> & {
  queryKey: DataTag<ApiQueryKey<G, E>, ApiSuccess<G, E>, ApiError<G, E>>;
};

export type ApiInfiniteQueryKey<
  G extends GroupId,
  E extends EndpointId<G>,
> = readonly ['api', G, E, 'infinite', ApiRequest<G, E>];

export type ApiInfiniteQueryOptions<
  G extends GroupId,
  E extends EndpointId<G>,
> = UseInfiniteQueryOptions<
  ApiSuccess<G, E>,
  ApiError<G, E>,
  InfiniteData<ApiSuccess<G, E>, Cursor | undefined>,
  ApiInfiniteQueryKey<G, E>,
  Cursor | undefined
> & {
  queryKey: DataTag<
    ApiInfiniteQueryKey<G, E>,
    InfiniteData<ApiSuccess<G, E>, Cursor | undefined>,
    ApiError<G, E>
  >;
};

type Paginated<G extends GroupId, E extends EndpointId<G>> =
  ApiSuccess<G, E> extends {
    readonly pagination: { readonly nextCursor: Cursor | null };
  }
    ? {
        readonly infiniteQueryOptions: (
          ...args: RequestArgs<G, E>
        ) => ApiInfiniteQueryOptions<G, E>;
      }
    : unknown;

export type EndpointClient<
  G extends GroupId,
  E extends EndpointId<G>,
> = BaseEndpointClient<G, E> & Paginated<G, E>;

interface BaseEndpointClient<G extends GroupId, E extends EndpointId<G>> {
  readonly request: (...args: RequestArgs<G, E>) => Promise<ApiSuccess<G, E>>;
  readonly queryOptions: (...args: RequestArgs<G, E>) => ApiQueryOptions<G, E>;
  readonly mutationOptions: () => UseMutationOptions<
    ApiSuccess<G, E>,
    ApiError<G, E>,
    ApiRequest<G, E>
  >;
  readonly key: () => readonly ['api', G, E];
}

export type GroupClient<G extends GroupId> = {
  readonly [E in EndpointId<G>]: EndpointClient<G, E>;
} & {
  readonly key: () => readonly ['api', G];
};

export type ApiClient = { readonly [G in GroupId]: GroupClient<G> };

type Headers = Record<string, string>;

export interface ApiClientOptions {
  readonly baseUrl: URL | string;
  // Called on every request, so a refreshed session is never stale.
  readonly headers?: () => Promise<Headers | undefined>;
}

interface EndpointSchemas {
  readonly params: unknown;
  readonly query: unknown;
  readonly headers: unknown;
  readonly payload: ReadonlyMap<string, unknown>;
}

type Method = (
  input: object,
) => Effect.Effect<unknown, { readonly _tag: string }>;

export const makeApiClient = ({
  baseUrl,
  headers,
}: ApiClientOptions): ApiClient => {
  const client = HttpApiClient.make(Api, {
    baseUrl,
    ...(headers && {
      transformClient: HttpClient.mapRequestEffect((request) =>
        Effect.promise(async () =>
          HttpClientRequest.setHeaders(request, (await headers()) ?? {}),
        ),
      ),
    }),
  }).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.provideService(FetchHttpClient.RequestInit, {
      credentials: 'include',
    }),
    Effect.runSync,
  ) as Record<string, Record<string, Method>>;

  const endpointClient = (
    group: string,
    endpoint: string,
    schemas: EndpointSchemas,
  ) => {
    const method = client[group]?.[endpoint];
    if (method === undefined)
      throw new Error(`Missing API endpoint ${group}.${endpoint}`);
    // Filling omitted parts also keeps `queryOptions()` and `queryOptions({ query: {} })` on one cache key.
    const withDefaults = (input: object = {}) => ({
      ...(schemas.params !== undefined && { params: {} }),
      ...(schemas.query !== undefined && { query: {} }),
      ...(schemas.headers !== undefined && { headers: {} }),
      ...(schemas.payload.size > 0 && { payload: {} }),
      ...input,
    });
    const request = async (input: object, signal?: AbortSignal) => {
      const exit = await Effect.runPromiseExit(method(input), { signal });
      if (Exit.isSuccess(exit)) return exit.value;
      const error = Cause.findErrorOption(exit.cause);
      throw Option.isSome(error)
        ? error.value
        : new ApiDefect({ cause: Cause.squash(exit.cause) });
    };
    return {
      request: (input?: object) => request(withDefaults(input)),
      queryOptions: (input?: object) => {
        const filled = withDefaults(input);
        return {
          queryKey: ['api', group, endpoint, filled],
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            request(filled, signal),
        };
      },
      infiniteQueryOptions: (input?: object) => {
        const filled = withDefaults(input) as { query?: object };
        return {
          queryKey: ['api', group, endpoint, 'infinite', filled],
          initialPageParam: undefined,
          queryFn: ({
            pageParam,
            signal,
          }: {
            pageParam: Cursor | undefined;
            signal: AbortSignal;
          }) =>
            request(
              pageParam === undefined
                ? filled
                : { ...filled, query: { ...filled.query, cursor: pageParam } },
              signal,
            ),
          getNextPageParam: (last: {
            pagination: { nextCursor: Cursor | null };
          }) => last.pagination.nextCursor ?? undefined,
        };
      },
      mutationOptions: () => ({
        mutationKey: ['api', group, endpoint],
        mutationFn: (input?: object) => request(withDefaults(input)),
      }),
      key: () => ['api', group, endpoint],
    };
  };

  return Object.fromEntries(
    Object.entries(Api.groups).map(([group, { endpoints }]) => [
      group,
      {
        ...Object.fromEntries(
          Object.entries(endpoints).map(([endpoint, schemas]) => [
            endpoint,
            endpointClient(group, endpoint, schemas),
          ]),
        ),
        key: () => ['api', group],
      },
    ]),
  ) as unknown as ApiClient;
};
