'use client';

import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import BlurText from "../../../../components/shared/BlurText";

interface FormState {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

export default function SupportContactPage() {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (values: FormState) => {
    const next: Partial<FormState> = {};
    if (!values.fullName.trim()) next.fullName = 'Full name is required';
    if (!values.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email';
    if (!values.subject.trim()) next.subject = 'Subject is required';
    if (!values.message.trim()) next.message = 'Message is required';
    return next;
  };

  const onChange = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      // live-validate single field
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    try {
      setSubmitting(true);
      // TODO: send to backend endpoint e.g., /api/support/contact using standardized API conventions
      // await fetch('/api/support/contact', { method: 'POST', body: JSON.stringify(form) })
      await new Promise((r) => setTimeout(r, 800));
      setSubmitted(true);
      setForm({ fullName: '', email: '', subject: '', message: '' });
    } catch (err) {
      console.error('Contact form submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className=" text-foreground">
      {/* Background handled globally by DottedBackground in RootLayout */}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            <BlurText as="span" text="Contact Us" animateBy="words" direction="top" delay={120} />
          </h1>
          <p className="mt-4 text-lg text-foreground/70">
            <BlurText as="span" text="Can't find an answer in the FAQ? We're here to help." animateBy="words" direction="top" delay={24} />
          </p>
        </div>

        <div className="mt-16 sm:mt-20 flex flex-col-reverse lg:flex-row gap-12 lg:gap-16">
          {/* Left: Form */}
          <div className="lg:w-3/5 w-full">
            <form onSubmit={onSubmit} noValidate className="space-y-6 p-6 sm:p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0px 40px -10px rgba(0, 82, 155, 0.40)' }}>
              {/* Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium">Full Name</label>
                <div className="mt-2">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={onChange('fullName')}
                    aria-invalid={!!errors.fullName}
                    className="block w-full rounded-lg border-0 bg-white/60 dark:bg-black/40 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10 placeholder:text-foreground/50 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    placeholder="Jane Doe"
                  />
                </div>
                {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium">Email Address</label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange('email')}
                    aria-invalid={!!errors.email}
                    className="block w-full rounded-lg border-0 bg-white/60 dark:bg-black/40 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10 placeholder:text-foreground/50 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium">Subject</label>
                <div className="mt-2">
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={onChange('subject')}
                    aria-invalid={!!errors.subject}
                    className="block w-full rounded-lg border-0 bg-white/60 dark:bg-black/40 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10 placeholder:text-foreground/50 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    placeholder="Question about my ride"
                  />
                </div>
                {errors.subject && <p className="mt-1 text-sm text-red-500">{errors.subject}</p>}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium">Message</label>
                <div className="mt-2">
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={form.message}
                    onChange={onChange('message')}
                    aria-invalid={!!errors.message}
                    className="block w-full rounded-lg border-0 bg-white/60 dark:bg-black/40 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10 placeholder:text-foreground/50 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    placeholder="Please provide details..."
                  />
                </div>
                {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message}</p>}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3 px-4 rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </div>

              {submitted && (
                <p className="text-sm text-green-600">Thanks! Your message has been received.</p>
              )}
            </form>
          </div>

          {/* Right: Contact Details */}
          <div className="lg:w-2/5 w-full">
            <div className="h-full flex flex-col justify-center space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    <BlurText as="span" text="Email Support" animateBy="words" direction="top" delay={100} />
                  </h3>
                  <p className="mt-1 text-foreground/70">
                    <BlurText as="span" text="Our team typically responds within 24 hours." animateBy="words" direction="top" delay={24} />
                  </p>
                  <a href="mailto:support@rideon.ng" className="mt-2 inline-block font-medium text-blue-600 hover:text-blue-500 transition-colors">support@rideon.ng</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    <BlurText as="span" text="Phone Support" animateBy="words" direction="top" delay={100} />
                  </h3>
                  <p className="mt-1 text-foreground/70">
                    <BlurText as="span" text="For urgent issues, please call us directly." animateBy="words" direction="top" delay={24} />
                  </p>
                  <a href="tel:+1234567890" className="mt-2 inline-block font-medium text-blue-600 hover:text-blue-500 transition-colors">+1 (234) 567-890</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
