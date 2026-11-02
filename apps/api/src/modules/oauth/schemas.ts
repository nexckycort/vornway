import { Schema } from 'effect';

const NonEmpty = Schema.String.check(Schema.isMinLength(1));
const Url = Schema.String.check(
  Schema.makeFilter<string>((value) => URL.canParse(value) || 'Invalid URL'),
);
const Email = Schema.String.check(
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
);

const AuthorizeParams = {
  client_id: NonEmpty,
  redirect_uri: Url,
  state: Schema.optionalKey(Schema.String),
  scope: Schema.optionalKey(Schema.String),
  resource: Schema.optionalKey(Url),
  code_challenge: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(16)),
  ),
  code_challenge_method: Schema.optionalKey(Schema.Literals(['plain', 'S256'])),
};

export const AuthorizeQuery = Schema.Struct({
  response_type: Schema.optionalKey(Schema.Literal('code')),
  ...AuthorizeParams,
});

export const AuthorizeForm = Schema.Struct({
  ...AuthorizeParams,
  email: Email,
  otp: Schema.String.check(Schema.isMinLength(4)),
});

export const TokenForm = Schema.Struct({
  grant_type: Schema.Literal('authorization_code'),
  code: NonEmpty,
  client_id: NonEmpty,
  redirect_uri: Url,
  code_verifier: Schema.optionalKey(Schema.String),
});

export const ClientRegistrationBody = Schema.Struct({
  client_name: Schema.optionalKey(Schema.String),
  redirect_uris: Schema.Array(Url).check(Schema.isMinLength(1)),
  grant_types: Schema.optionalKey(Schema.Array(Schema.String)),
  response_types: Schema.optionalKey(Schema.Array(Schema.String)),
  token_endpoint_auth_method: Schema.optionalKey(Schema.String),
});
