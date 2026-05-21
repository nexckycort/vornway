import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  type InferRequestType,
  type InferResponseType,
  publicClient,
} from '#/lib/hc';

type LoginStep = 'email' | 'name' | 'otp' | 'done';

type SendOtpMethod = (typeof publicClient.api.login)['send-otp']['$post'];
type VerifyOtpMethod = (typeof publicClient.api.login)['verify-otp']['$post'];

type SendOtpRequest = InferRequestType<SendOtpMethod>['json'];
type SendOtpResponse = InferResponseType<SendOtpMethod>;

type VerifyOtpRequest = InferRequestType<VerifyOtpMethod>['json'];
type VerifyOtpResponse = InferResponseType<VerifyOtpMethod>;

async function sendOtp(payload: SendOtpRequest): Promise<SendOtpResponse> {
  const response = await publicClient.api.login['send-otp'].$post({ json: payload });
  const data = (await response.json()) as SendOtpResponse;

  return data;
}

async function verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  const response = await publicClient.api.login['verify-otp'].$post({ json: payload });
  const data = (await response.json()) as VerifyOtpResponse;

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function useLogin() {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sendOtpMutation = useMutation({
    mutationFn: (payload: SendOtpRequest) => sendOtp(payload),
    onSuccess: (data) => {
      if (data.code === 'OTP_SENT') {
        setError(null);
        setStep('otp');
        return;
      }

      if (data.code === 'USER_NOT_FOUND') {
        setError(null);
        setStep('name');
        return;
      }

      setError(data.message);
    },
    onError: (rawError) => {
      const data = rawError as Partial<SendOtpResponse>;
      setError(data.message ?? 'No se pudo enviar el código. Intenta de nuevo.');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (payload: VerifyOtpRequest) => verifyOtp(payload),
    onSuccess: (data) => {
      if (data.success) {
        setError(null);
        setStep('done');
        return;
      }

      setError(data.error);
    },
    onError: (rawError) => {
      const data = rawError as Partial<{ error: string }>;
      setError(data.error ?? 'No se pudo verificar el código. Intenta de nuevo.');
    },
  });

  const isSubmitting = sendOtpMutation.isPending || verifyOtpMutation.isPending;

  const canSubmitEmail = useMemo(() => {
    return email.trim().length > 0 && !isSubmitting;
  }, [email, isSubmitting]);

  const canSubmitName = useMemo(() => {
    return name.trim().length > 0 && !isSubmitting;
  }, [isSubmitting, name]);

  const canSubmitOtp = otp.trim().length >= 4 && !isSubmitting;

  function submitEmail() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Ingresa tu correo.');
      return;
    }

    setError(null);
    sendOtpMutation.mutate({ email: normalizedEmail });
  }

  function submitName() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError('Ingresa tu nombre.');
      return;
    }

    setError(null);
    sendOtpMutation.mutate({
      email: normalizedEmail,
      name: normalizedName,
    });
  }

  function submitOtp() {
    const normalizedOtp = otp.replace(/\s+/g, '').trim();

    if (!normalizedOtp) {
      setError('Ingresa el código OTP.');
      return;
    }

    setError(null);
    verifyOtpMutation.mutate({
      email: email.trim().toLowerCase(),
      otp: normalizedOtp,
    });
  }

  function resendOtp() {
    sendOtpMutation.mutate({ email: email.trim().toLowerCase() });
  }

  function goBackToEmail() {
    setStep('email');
    setName('');
    setOtp('');
    setError(null);
  }

  function goBackToOtp() {
    setStep('otp');
    setOtp('');
    setError(null);
  }

  return {
    step,
    email,
    name,
    otp,
    error,
    isSubmitting,
    canSubmitEmail,
    canSubmitName,
    canSubmitOtp,
    setEmail,
    setName,
    setOtp,
    submitEmail,
    submitName,
    submitOtp,
    resendOtp,
    goBackToEmail,
    goBackToOtp,
  };
}
