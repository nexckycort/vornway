'use client';

import { useEffect, useState } from 'react';

import { Button } from './button.js';
import { Field, FieldDescription, FieldLabel } from './form.js';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from './input-otp.js';

type InputOTPFormProps = {
  label?: string;
  description?: string;
  onSubmit: (otp: string) => void;
  maxLength?: number;
  onResend?: () => void | Promise<void>;
  isLoading?: boolean;
  cooldownTime?: number;
};

export function InputOTPForm({
  label = 'Código de verificación',
  description,
  maxLength = 6,
  onSubmit,
  isLoading,
  onResend,
  cooldownTime = 60,
}: InputOTPFormProps) {
  const [value, setValue] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [lastSubmittedValue, setLastSubmittedValue] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (cooldownSeconds > 0) {
      intervalId = setInterval(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [cooldownSeconds]);

  useEffect(() => {
    if (value && value.length < maxLength && lastSubmittedValue) {
      setLastSubmittedValue(null);
    }

    if (
      value &&
      value.length === maxLength &&
      !isLoading &&
      value !== lastSubmittedValue
    ) {
      setLastSubmittedValue(value);
      onSubmit(value);
    }
  }, [value, maxLength, isLoading, lastSubmittedValue, onSubmit]);

  async function handleResend() {
    if (!onResend || cooldownSeconds > 0 || isResending) return;

    setIsResending(true);
    try {
      await onResend();
      setCooldownSeconds(cooldownTime);
      setValue('');
      setLastSubmittedValue(null);
    } catch (error) {
      console.error('Error al reenviar código:', error);
    } finally {
      setIsResending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.length === maxLength && !isLoading) {
      onSubmit(value);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <InputOTP
          maxLength={maxLength}
          value={value}
          onChange={setValue}
          className="w-full"
        >
          <InputOTPGroup className="w-full justify-between">
            <InputOTPSlot index={0} className="flex-1" />
            <InputOTPSlot index={1} className="flex-1" />
            <InputOTPSlot index={2} className="flex-1" />
            <InputOTPSeparator />
            <InputOTPSlot index={3} className="flex-1" />
            <InputOTPSlot index={4} className="flex-1" />
            <InputOTPSlot index={5} className="flex-1" />
          </InputOTPGroup>
        </InputOTP>
        {description && <FieldDescription>{description}</FieldDescription>}
      </Field>

      <div className="space-y-3">
        <Button
          type="submit"
          className="w-full h-12 font-medium rounded-xl shadow-sm"
          disabled={value.length !== maxLength || isLoading}
        >
          {isLoading ? 'Verificando...' : 'Verificar código'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          ¿No recibiste el código?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldownSeconds > 0 || isResending || !onResend}
            className={`underline ${
              cooldownSeconds > 0 || isResending || !onResend
                ? 'text-muted-foreground cursor-not-allowed'
                : 'text-cyan-600 hover:text-cyan-700'
            }`}
          >
            {isResending
              ? 'Reenviando...'
              : cooldownSeconds > 0
                ? `Reenviar en ${cooldownSeconds}s`
                : 'Reenviar'}
          </button>
        </p>
      </div>
    </form>
  );
}
