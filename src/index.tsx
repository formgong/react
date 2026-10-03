"use client";
/**
 * @formgong/react: contact forms for React without a backend.
 * The browser posts to Formgong (https://formgong.com), which delivers submissions
 * to email, Telegram and webhooks. The access key (fk_…) is public by design.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type FormHTMLAttributes, type ReactNode } from "react";

export const DEFAULT_ENDPOINT = "https://formgong.com/submit";

export type FormgongStatus = "idle" | "submitting" | "success" | "error";

/** JSON returned by Formgong for `Accept: application/json` requests. */
export type FormgongResult = { success: boolean; message?: string; code?: string };

export type FormgongOptions = {
  /** Public form key from the Formgong dashboard (fk_…). */
  accessKey: string;
  /** Submit URL. Defaults to https://formgong.com/submit. */
  endpoint?: string;
  /** Language of Formgong's messages and autoreply (en, uk, pl, tr, de, es, fr, pt, ar, he, hi, ja). Defaults to <html lang>. */
  lang?: string;
  /** Email subject for this form. */
  subject?: string;
  /** Page to open after a successful submission. Also used by the no-JavaScript fallback. */
  redirect?: string;
  /** Cloudflare Turnstile site key. Only if Turnstile is enabled in the form settings. */
  turnstileSiteKey?: string;
  onSuccess?: (result: FormgongResult) => void;
  onError?: (result: FormgongResult) => void;
};

type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
const turnstile = () => (globalThis as unknown as { turnstile?: TurnstileApi }).turnstile;
const pageLang = () => (typeof document !== "undefined" && document.documentElement.lang) || "en";

/** Mounts a Turnstile widget into the returned ref when a site key is given. */
function useTurnstile(siteKey: string | undefined, lang: string | undefined) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!siteKey || !container.current) return;
    const mount = () => {
      const api = turnstile();
      if (api && container.current && !widget.current) widget.current = api.render(container.current, { sitekey: siteKey, language: lang || pageLang() });
    };
    if (turnstile()) return mount();
    const id = "formgong-turnstile";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", mount);
    return () => script?.removeEventListener("load", mount);
  }, [siteKey, lang]);
  const reset = useCallback(() => { if (widget.current) turnstile()?.reset(widget.current); }, []);
  return { container, reset };
}

/**
 * Headless hook: attach `handleSubmit` to any <form>. Field names become submission fields.
 * Hidden fields (access_key, _lang, _subject) are added automatically.
 */
export function useFormgong(options: FormgongOptions) {
  const { afterSubmit: _internal, ...api } = useFormgongState(options);
  return api;
}

function useFormgongState(options: FormgongOptions) {
  const [status, setStatus] = useState<FormgongStatus>("idle");
  const [message, setMessage] = useState("");
  const latest = useRef(options);
  latest.current = options;
  const afterSubmit = useRef<() => void>(() => {});

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const opts = latest.current;
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("access_key", opts.accessKey);
    body.set("_lang", opts.lang || pageLang());
    if (opts.subject) body.set("_subject", opts.subject);
    setStatus("submitting");
    setMessage("");
    let result: FormgongResult;
    try {
      const response = await fetch(opts.endpoint || DEFAULT_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body });
      result = (await response.json().catch(() => ({ success: false }))) as FormgongResult;
    } catch {
      result = { success: false, code: "network_error", message: "Network error. Check your connection and try again." };
    }
    afterSubmit.current();
    if (result.success) {
      setStatus("success");
      setMessage(result.message || "Thank you! Your message has been sent.");
      form.reset();
      opts.onSuccess?.(result);
      if (opts.redirect && typeof window !== "undefined") window.location.assign(opts.redirect);
    } else {
      setStatus("error");
      setMessage(result.message || "Something went wrong. Please try again.");
      opts.onError?.(result);
    }
  }, []);

  const reset = useCallback(() => { setStatus("idle"); setMessage(""); }, []);
  return { status, message, submitting: status === "submitting", handleSubmit, reset, afterSubmit };
}

const honeypotStyle: CSSProperties = { position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" };

export type FormgongFormProps = FormgongOptions &
  Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "action" | "method" | "onError" | "children"> & {
    /** Your fields and submit button. A function child receives the current status. */
    children: ReactNode | ((state: { status: FormgongStatus; message: string; submitting: boolean }) => ReactNode);
    /** Hide the built-in status line (render `message` yourself through a function child). */
    hideStatus?: boolean;
    statusClassName?: string;
  };

/**
 * <form> wired to Formgong: hidden fields, honeypot, optional Turnstile and an inline status line.
 * Without JavaScript the browser still posts the form (and follows `redirect`).
 */
export function FormgongForm({ accessKey, endpoint, lang, subject, redirect, turnstileSiteKey, onSuccess, onError, children, hideStatus, statusClassName, ...rest }: FormgongFormProps) {
  const { status, message, submitting, handleSubmit, afterSubmit } = useFormgongState({ accessKey, endpoint, lang, subject, redirect, turnstileSiteKey, onSuccess, onError });
  const captcha = useTurnstile(turnstileSiteKey, lang);
  afterSubmit.current = captcha.reset;
  return (
    <form {...rest} action={endpoint || DEFAULT_ENDPOINT} method="POST" onSubmit={handleSubmit} aria-busy={submitting}>
      <input type="hidden" name="access_key" value={accessKey} />
      {lang ? <input type="hidden" name="_lang" value={lang} /> : null}
      {subject ? <input type="hidden" name="_subject" value={subject} /> : null}
      {redirect ? <input type="hidden" name="_redirect" value={redirect} /> : null}
      {/* Honeypot: hidden from people, filled by bots. Keep it empty. */}
      <div aria-hidden="true" style={honeypotStyle}>
        <input name="botcheck" tabIndex={-1} autoComplete="off" />
      </div>
      {typeof children === "function" ? children({ status, message, submitting }) : children}
      {turnstileSiteKey ? <div ref={captcha.container} /> : null}
      {hideStatus ? null : (
        <p role="status" aria-live="polite" className={statusClassName} data-status={status} style={statusClassName ? undefined : { margin: 0, fontSize: 14, color: status === "error" ? "#b91c1c" : "#15803d" }}>
          {message}
        </p>
      )}
    </form>
  );
}

export type ContactFormLabels = { name: string; email: string; message: string; submit: string; sending: string };

export type ContactFormProps = Omit<FormgongFormProps, "children"> & {
  labels?: Partial<ContactFormLabels>;
  /** Drop the default inline styles and style everything through className / your CSS. */
  unstyled?: boolean;
};

const DEFAULT_LABELS: ContactFormLabels = { name: "Name", email: "Email", message: "Message", submit: "Send", sending: "Sending…" };

const styles = {
  form: { display: "grid", gap: 16, width: "100%", maxWidth: 512, margin: "0 auto", fontFamily: "inherit" },
  label: { display: "grid", gap: 6, fontSize: 14, fontWeight: 500, color: "inherit" },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, font: "inherit", fontWeight: 400, background: "#fff", color: "#111827" },
  button: { padding: "10px 16px", border: 0, borderRadius: 8, background: "#4f46e5", color: "#fff", font: "inherit", fontWeight: 600, cursor: "pointer" },
} satisfies Record<string, CSSProperties>;

/** Ready-made name / email / message form. */
export function ContactForm({ labels, unstyled, style, ...props }: ContactFormProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const s = (key: keyof typeof styles) => (unstyled ? undefined : styles[key]);
  return (
    <FormgongForm {...props} style={unstyled ? style : { ...styles.form, ...style }}>
      {({ submitting }) => (
        <>
          <label style={s("label")}>
            {text.name}
            <input name="name" autoComplete="name" required style={s("input")} />
          </label>
          <label style={s("label")}>
            {text.email}
            <input type="email" name="email" autoComplete="email" required style={s("input")} />
          </label>
          <label style={s("label")}>
            {text.message}
            <textarea name="message" rows={5} required style={s("input")} />
          </label>
          <button type="submit" disabled={submitting} style={unstyled ? undefined : { ...styles.button, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? text.sending : text.submit}
          </button>
        </>
      )}
    </FormgongForm>
  );
}

export default ContactForm;
