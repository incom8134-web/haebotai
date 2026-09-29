"use client";

import { useEffect, useRef, useTransition, type FormEvent } from "react";

// React resets a <form action={…}> after every submission, even when the
// action returns an error — a long support message or a pasted API key
// vanishes on "try again later". Submitting through onSubmit skips that
// reset; the form is cleared only after a successful result.
export function useKeepInputForm(action: (formData: FormData) => void, state: { ok?: boolean } | null) {
  const ref = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return [ref, onSubmit] as const;
}
