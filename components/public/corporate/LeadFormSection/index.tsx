'use client'

import * as React from 'react';
import BlurText from '../../../shared/BlurText';

export interface LeadFormSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
}

/**
 * Client Component: LeadFormSection
 *
 * Interactive lead capture form with basic client-side validation.
 * Currently logs form data to the console on submit.
 */
export default function LeadFormSection({ className, background = 'solid', ...rest }: LeadFormSectionProps) {
  const [fullName, setFullName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [companyEmail, setCompanyEmail] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const enterVars = {
    ['--tw-enter-opacity' as any]: '0',
    ['--tw-enter-translate-y' as any]: '1rem',
    ['--tw-enter-blur' as any]: '8px',
  } as React.CSSProperties;

  function validate() {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Name is required';
    if (!companyName.trim()) next.companyName = 'Company is required';
    if (!companyEmail.trim()) next.companyEmail = 'Email is required';
    if (!phoneNumber.trim()) next.phoneNumber = 'Phone number is required';
    return next;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = { fullName, companyName, companyEmail, phoneNumber };
    // For this iteration, we just log to console. API integration to be added later.
    console.log('Lead form submission:', payload);
    setSubmitted(true);
  }

  const wrapperBgClass =
    background === 'transparent'
      ? 'bg-transparent'
      : background === 'tinted'
        ? 'bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800'
        : 'bg-background';

  return (
    <section id="lead-form" className={["py-24 sm:py-32", wrapperBgClass, className].filter(Boolean).join(' ')} {...rest}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative p-8 sm:p-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 animate-in"
          style={{ ...enterVars, animationDelay: '200ms', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0px 40px -10px rgba(0, 82, 155, 0.40)' }}
        >
          <div className="text-center">
            <BlurText
              as="h2"
              className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
              text="See How RideOn Can Streamline Your Business Travel."
              animateBy="words"
              direction="top"
              delay={250}
            />
          </div>

          <form onSubmit={onSubmit} className="mt-10" noValidate>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <div className="mt-2">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#00529B] sm:text-sm sm:leading-6 transition-all"
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                    required
                  />
                </div>
                {errors.fullName && (
                  <p id="fullName-error" className="mt-1 text-sm text-red-600">
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Company */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                  Company
                </label>
                <div className="mt-2">
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#00529B] sm:text-sm sm:leading-6 transition-all"
                    aria-invalid={!!errors.companyName}
                    aria-describedby={errors.companyName ? 'companyName-error' : undefined}
                    required
                  />
                </div>
                {errors.companyName && (
                  <p id="companyName-error" className="mt-1 text-sm text-red-600">
                    {errors.companyName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label htmlFor="companyEmail" className="block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <div className="mt-2">
                  <input
                    id="companyEmail"
                    name="companyEmail"
                    type="email"
                    autoComplete="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#00529B] sm:text-sm sm:leading-6 transition-all"
                    aria-invalid={!!errors.companyEmail}
                    aria-describedby={errors.companyEmail ? 'companyEmail-error' : undefined}
                    required
                  />
                </div>
                {errors.companyEmail && (
                  <p id="companyEmail-error" className="mt-1 text-sm text-red-600">
                    {errors.companyEmail}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="sm:col-span-2">
                <label htmlFor="phoneNumber" className="block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <div className="mt-2">
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#00529B] sm:text-sm sm:leading-6 transition-all"
                    aria-invalid={!!errors.phoneNumber}
                    aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
                    required
                  />
                </div>
                {errors.phoneNumber && (
                  <p id="phoneNumber-error" className="mt-1 text-sm text-red-600">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                className="block w-full rounded-md px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00529B]"
                style={{ backgroundColor: '#00529B' }}
              >
                <BlurText as="span" text="Get in Touch" animateBy="words" direction="top" delay={300} />
              </button>
            </div>

            {submitted && (
              <BlurText
                as="p"
                className="mt-4 text-center text-sm text-green-600"
                text="Thanks! We'll be in touch shortly."
                animateBy="words"
                direction="top"
                delay={24}
              />
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
