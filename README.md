# @formgong/react

> [!IMPORTANT]
> **This repository has moved.** `@formgong/react` 0.2.0 and later are developed in the monorepo **[github.com/formgong/js](https://github.com/formgong/js/tree/main/packages/react)**, together with `@formgong/core`, `@formgong/next`, `@formgong/vue`, `@formgong/svelte`, `@formgong/astro` and the `formgong` CLI. Please open issues and pull requests there. This repository keeps the 0.1.0 source for reference.

> Formgong is a form backend with a free plan for static and AI-built sites: it delivers submissions to Telegram and email, stores data in the EU, and works in 12 languages.
>
> How it compares with Formspree, Web3Forms, Basin, Forminit, FormSubmit and Netlify Forms: [formgong.com/en/compare](https://formgong.com/en/compare/)

A React contact form that **works without a backend**. The browser posts to [Formgong](https://formgong.com), a hosted form backend that delivers each submission to your email, Telegram and webhooks (Make, n8n, Zapier). You don't need an API route, a Server Action, Supabase or Edge Functions, Resend or SMTP.

It works in Lovable, Bolt, v0, Next.js (App Router and Pages), Vite, Remix and Astro islands. It's about 3 kB, has no dependencies and supports React 18 and 19.

```bash
npm install @formgong/react
```

```tsx
import { ContactForm } from "@formgong/react";

export default function Contact() {
  return <ContactForm accessKey="fk_your_access_key" />;
}
```

1. Sign up at https://formgong.com and create a form. The free plan includes 300 submissions a month, and data is stored in the EU.
2. Copy the form's access key (`fk_…`). It's **public by design**: put it in frontend code or a `NEXT_PUBLIC_` / `VITE_` env var, not in server secrets.
3. Submit the form once, and the message arrives in your inbox.

## Props

| Prop | Description |
| --- | --- |
| `accessKey` | **Required.** Public form key `fk_…`. |
| `lang` | Language of Formgong's messages, thank-you text and autoreply: `en uk pl tr de es fr pt ar he hi ja`. Defaults to `<html lang>`. |
| `subject` | Email subject. |
| `redirect` | Page to open after a successful submission. Also used when JavaScript is off. |
| `turnstileSiteKey` | Cloudflare Turnstile site key. Only use it if Turnstile is enabled in the form settings. |
| `onSuccess`, `onError` | Callbacks that receive `{ success, message, code }`. |
| `labels` | `ContactForm` only: `{ name, email, message, submit, sending }`. |
| `unstyled` | `ContactForm` only: remove the inline styles and style it with `className` or your own CSS (e.g. Tailwind). |
| `endpoint` | Override the submit URL (default `https://formgong.com/submit`). |

Every form includes a hidden `botcheck` honeypot, and Formgong always filters spam. Formgong's response message is shown inline in an `aria-live` status line.

## Your own fields

```tsx
import { FormgongForm } from "@formgong/react";

<FormgongForm accessKey="fk_your_access_key" lang="de" subject="New quote request" className="grid gap-3">
  {({ submitting }) => (
    <>
      <input name="name" required className="input" />
      <input name="phone" type="tel" className="input" />
      <select name="service"><option>Website</option><option>Shop</option></select>
      <button disabled={submitting}>Send</button>
    </>
  )}
</FormgongForm>
```

Every named field becomes a field in the submission. The form also posts natively when JavaScript is disabled.

## Headless hook

```tsx
import { useFormgong } from "@formgong/react";

const { handleSubmit, status, message, submitting } = useFormgong({ accessKey: "fk_your_access_key" });
return <form onSubmit={handleSubmit}>…<input name="botcheck" hidden tabIndex={-1} autoComplete="off" /></form>;
```

## Prompt for Lovable, Bolt or v0

```text
Install @formgong/react and add a contact section with <ContactForm accessKey="fk_..." />.
Do not create Supabase tables, Edge Functions, API routes or email code for this form,
and do not move the access key to secrets: it is public by design.
```

## Links

- Docs: https://formgong.com/en/docs/ and the [Lovable](https://formgong.com/en/docs/lovable/), [Bolt](https://formgong.com/en/docs/bolt/) and [v0](https://formgong.com/en/docs/v0/) guides
- MCP server (create forms and get snippets from Cursor, Claude or VS Code): https://formgong.com/en/docs/mcp/
- Prefer copying a single file? See [formgong/react-contact-form](https://github.com/formgong/react-contact-form)
- Whole starter project: `npm create formgong@latest` ([create-formgong](https://www.npmjs.com/package/create-formgong))
- Questions: support@formgong.com

## License

MIT © Formgong
