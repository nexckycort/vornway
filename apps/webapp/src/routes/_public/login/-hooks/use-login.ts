import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { loginClient } from '#/api/login';
import type { InferRequestType, InferResponseType } from '#/api/types';
import { getLoginMessages } from '#/routes/_public/login/-messages';

type LoginStep = 'email' | 'name' | 'otp' | 'done';

type SendOtpMethod = (typeof loginClient)['send-otp']['$post'];
type VerifyOtpMethod = (typeof loginClient)['verify-otp']['$post'];

type SendOtpRequest = InferRequestType<SendOtpMethod>['json'];
type SendOtpResponse = InferResponseType<SendOtpMethod>;

type VerifyOtpRequest = InferRequestType<VerifyOtpMethod>['json'];
type VerifyOtpResponse = InferResponseType<VerifyOtpMethod>;

async function sendOtp(payload: SendOtpRequest): Promise<SendOtpResponse> {
  const response = await loginClient['send-otp'].$post({
    json: payload,
  });
  const data = (await response.json()) as SendOtpResponse;

  return data;
}

async function verifyOtp(
  payload: VerifyOtpRequest,
): Promise<VerifyOtpResponse> {
  const response = await loginClient['verify-otp'].$post({
    json: payload,
  });
  const data = (await response.json()) as VerifyOtpResponse;

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function useLogin() {
  const t = getLoginMessages();
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
      setError(data.message ?? t.sendCodeError);
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
      setError(data.error ?? t.verifyCodeError);
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
      setError(t.enterEmail);
      return;
    }

    setError(null);
    sendOtpMutation.mutate({ email: normalizedEmail });
  }

  function submitName() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError(t.enterName);
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
      setError(t.otpRequired);
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
