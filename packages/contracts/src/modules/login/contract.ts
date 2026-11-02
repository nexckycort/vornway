import { Effect, Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { Unauthorized } from '../auth/contract.ts';

const NonEmpty = Schema.String.check(Schema.isMinLength(1));
const PreviousAccount = {
  previousUserId: Schema.optionalKey(NonEmpty),
  wasAnonymous: Schema.optionalKey(Schema.Boolean),
};

export const LoginUser = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.NullOr(Schema.String),
  emailVerified: Schema.optionalKey(Schema.Boolean),
  image: Schema.optionalKey(Schema.NullOr(Schema.String)),
  username: Schema.optionalKey(Schema.NullOr(Schema.String)),
  isAnonymous: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  createdAt: Schema.optionalKey(Schema.Date),
  updatedAt: Schema.optionalKey(Schema.Date),
});

export const SendOtpPayload = Schema.Struct({
  email: NonEmpty,
  name: Schema.optionalKey(NonEmpty),
});
export const VerifyOtpPayload = Schema.Struct({
  email: NonEmpty,
  otp: NonEmpty,
  ...PreviousAccount,
});
export const SyncGooglePayload = Schema.Struct(PreviousAccount);
export const McpTokenPayload = Schema.Struct({
  email: NonEmpty,
  otp: NonEmpty,
});

export const OtpSent = Schema.Struct({
  code: Schema.Literal('OTP_SENT'),
  message: Schema.String,
});
export const VerifiedLogin = Schema.Struct({
  success: Schema.Literal(true),
  user: LoginUser,
});
export const McpToken = Schema.Struct({
  tokenType: Schema.Literal('Bearer'),
  accessToken: Schema.String,
  expiresIn: Schema.Int,
  user: LoginUser,
});

export class InvalidEmailDomain extends Schema.TaggedError<InvalidEmailDomain>()(
  'InvalidEmailDomain',
  {
    code: Schema.Literal('INVALID_DOMAIN').pipe(
      Schema.withConstructorDefault(Effect.succeed('INVALID_DOMAIN')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('Usa un correo de Gmail, Outlook, Yahoo o iCloud'),
      ),
    ),
  },
  { httpApiStatus: 400 },
) {}
export class LoginUserAlreadyExists extends Schema.TaggedError<LoginUserAlreadyExists>()(
  'LoginUserAlreadyExists',
  {
    code: Schema.Literal('USER_ALREADY_EXISTS').pipe(
      Schema.withConstructorDefault(Effect.succeed('USER_ALREADY_EXISTS')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('El usuario ya existe')),
    ),
  },
  { httpApiStatus: 409 },
) {}
export class LoginUserNotFound extends Schema.TaggedError<LoginUserNotFound>()(
  'LoginUserNotFound',
  {
    code: Schema.Literal('USER_NOT_FOUND').pipe(
      Schema.withConstructorDefault(Effect.succeed('USER_NOT_FOUND')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Usuario no encontrado')),
    ),
  },
  { httpApiStatus: 404 },
) {}
export class OtpRejected extends Schema.TaggedError<OtpRejected>()(
  'OtpRejected',
  {
    success: Schema.Literal(false).pipe(
      Schema.withConstructorDefault(Effect.succeed(false)),
    ),
    error: Schema.String,
  },
  { httpApiStatus: 401 },
) {}
export class GoogleSessionMissing extends Schema.TaggedError<GoogleSessionMissing>()(
  'GoogleSessionMissing',
  {
    success: Schema.Literal(false).pipe(
      Schema.withConstructorDefault(Effect.succeed(false)),
    ),
    error: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('No se encontró una sesión activa de Google.'),
      ),
    ),
  },
  { httpApiStatus: 401 },
) {}

export class LoginApi extends HttpApiGroup.make('login')
  .add(
    HttpApiEndpoint.post('sendOtp', '/api/login/send-otp', {
      payload: SendOtpPayload,
      success: OtpSent,
      error: [InvalidEmailDomain, LoginUserAlreadyExists, LoginUserNotFound],
    }),
  )
  .add(
    HttpApiEndpoint.post('verifyOtp', '/api/login/verify-otp', {
      payload: VerifyOtpPayload,
      success: VerifiedLogin,
      error: OtpRejected,
    }),
  )
  .add(
    HttpApiEndpoint.post('syncGoogle', '/api/login/sync-google', {
      payload: SyncGooglePayload,
      success: VerifiedLogin,
      error: GoogleSessionMissing,
    }),
  )
  .add(
    HttpApiEndpoint.post('mcpToken', '/api/login/mcp-token', {
      payload: McpTokenPayload,
      success: McpToken,
      error: OtpRejected,
    }),
  )
  .add(
    HttpApiEndpoint.get('me', '/api/login/me', {
      success: LoginUser,
      error: Unauthorized,
    }),
  ) {}
