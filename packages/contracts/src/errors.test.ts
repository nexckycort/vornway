import { describe, expect, test } from 'bun:test';
import { Schema } from 'effect';
import { Forbidden, Unauthorized } from './modules/auth/contract.ts';
import {
  UserNotFound,
  UsernameAlreadyTaken,
} from './modules/users/contract.ts';

const encode =
  <A extends Schema.Top>(schema: A) =>
  (value: A['Type']) =>
    Schema.encodeSync(schema as never)(value);

describe('error bodies', () => {
  test('keep the code and message fields installed apps read', () => {
    expect(encode(UsernameAlreadyTaken)(new UsernameAlreadyTaken())).toEqual({
      _tag: 'UsernameAlreadyTaken',
      code: 'USERNAME_ALREADY_TAKEN',
      message: 'Ese nombre de usuario ya esta en uso',
    });
    expect(encode(UserNotFound)(new UserNotFound())).toEqual({
      _tag: 'UserNotFound',
      code: 'USER_NOT_FOUND',
      message: 'Usuario no encontrado',
    });
    expect(encode(Unauthorized)(new Unauthorized())).toEqual({
      _tag: 'Unauthorized',
      message: 'Authentication required',
    });
    expect(encode(Forbidden)(new Forbidden())).toEqual({
      _tag: 'Forbidden',
      error: 'No autorizado',
    });
  });
});
