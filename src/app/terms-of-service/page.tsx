import type { Metadata } from 'next';
import React from 'react';
import { ScrollSpyToc, BlurText } from '../../../components';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Terms of Service | RideOn Nigeria',
  description:
    'Read the Terms of Service governing your use of RideOn Nigeria’s website, mobile apps, and services.',
};

export default function TermsOfServicePage() {
  const tocItems = [
    { id: 'section-1', label: '1. Introduction' },
    { id: 'section-2', label: '2. User Accounts' },
    { id: 'section-3', label: '3. Use of Services' },
    { id: 'section-4', label: '4. Payments and Fees' },
    { id: 'section-5', label: '5. Content and Conduct' },
    { id: 'section-6', label: '6. Disclaimers' },
    { id: 'section-7', label: '7. Limitation of Liability' },
    { id: 'section-8', label: '8. Governing Law' },
    { id: 'section-9', label: '9. Changes to Terms' },
  ];

  return (
    <main className="text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-8 lg:p-12 transition-all duration-300 hover:shadow-2xl">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16">
            <aside className="hidden lg:block lg:col-span-3">
              <ScrollSpyToc
                items={tocItems}
                className="sticky top-28 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg p-4 md:p-5 shadow-lg"
              />
            </aside>

            <div className="lg:col-span-9 mt-12 lg:mt-0">
              <div className="pb-6 border-b border-slate-200/80 dark:border-slate-800">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
                  <BlurText
                    as="span"
                    text="Terms of Service"
                    animateBy="words"
                    direction="top"
                    delay={120}
                  />
                </h1>
                <BlurText
                  as="p"
                  className="mt-2 text-base text-foreground/70"
                  text="Last updated on October 26, 2023"
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>

              <article className="mt-8 leading-relaxed space-y-10">
                <section id="section-1" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="1. Introduction" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    Welcome to our platform ("we," "us," or "our"). These Terms of Service ("Terms")
                    govern your use of our website, mobile applications, and services (collectively, the
                    "Services"). By accessing or using our Services, you agree to be bound by these Terms and
                    our Privacy Policy. If you do not agree to these Terms, you may not use our Services.
                  </p>
                </section>

                <section id="section-2" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="2. User Accounts" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    To use most aspects of the Services, you must register for and maintain an active personal
                    user account ("Account"). You must be at least 18 years of age to obtain an Account.
                    Account registration requires you to submit certain personal information. You agree to
                    maintain accurate, complete, and up-to-date information in your Account. Your failure to do
                    so may result in your inability to access and use the Services.
                  </p>
                </section>

                <section id="section-3" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="3. Use of Services" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    The Services constitute a technology platform that enables users to arrange and schedule
                    services with independent third-party providers. You acknowledge that we do not provide
                    these services directly and that all such services are provided by independent third-party
                    contractors who are not employed by us. You agree to comply with all applicable laws when
                    using the Services.
                  </p>
                </section>

                <section id="section-4" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="4. Payments and Fees" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    You understand that use of the Services may result in charges to you for the services or
                    goods you receive ("Charges"). We will facilitate your payment of the applicable Charges on
                    behalf of the third-party provider. Payment of the Charges in such a manner shall be
                    considered the same as payment made directly by you to the third-party provider. Charges
                    will be inclusive of applicable taxes where required by law.
                  </p>
                </section>

                <section id="section-5" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="5. Content and Conduct" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    You are responsible for your conduct and any data, text, files, information, usernames, and
                    other content or materials (collectively, "Content") that you submit. You must not post
                    violent, discriminatory, unlawful, infringing, hateful, or sexually suggestive content via
                    the Service.
                  </p>
                </section>

                <section id="section-6" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="6. Disclaimers" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." WE DISCLAIM ALL REPRESENTATIONS AND
                    WARRANTIES, EXPRESS, IMPLIED, OR STATUTORY, NOT EXPRESSLY SET OUT IN THESE TERMS, INCLUDING
                    THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                    NON-INFRINGEMENT.
                  </p>
                </section>

                <section id="section-7" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="7. Limitation of Liability" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    WE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR
                    CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, LOST DATA, PERSONAL INJURY, OR PROPERTY
                    DAMAGE RELATED TO, IN CONNECTION WITH, OR OTHERWISE RESULTING FROM ANY USE OF THE SERVICES.
                  </p>
                </section>

                <section id="section-8" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="8. Governing Law" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    These Terms shall be governed by and construed in accordance with the laws of the Federal
                    Republic of Nigeria, without giving effect to any principles of conflicts of law. You agree
                    that any action at law or in equity arising out of or relating to these Terms shall be filed
                    only in the state or federal courts located in Nigeria.
                  </p>
                </section>

                <section id="section-9" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText as="span" text="9. Changes to Terms" animateBy="words" direction="top" delay={120} />
                  </h2>
                  <p>
                    We may amend the Terms from time to time. Amendments will be effective upon our posting of
                    such updated Terms at this location. Your continued access or use of the Services after such
                    posting constitutes your consent to be bound by the Terms, as amended.
                  </p>
                </section>
              </article>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
