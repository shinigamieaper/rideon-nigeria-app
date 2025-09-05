import type { Metadata } from 'next';
import React from 'react';
import { ScrollSpyToc, BlurText } from '../../../components';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Privacy Policy | RideOn Nigeria',
  description:
    'Read how RideOn Nigeria collects, uses, and protects your information in compliance with NDPR and applicable laws.',
};

export default function PrivacyPolicyPage() {
  const tocItems = [
    { id: 'section-1', label: '1. Introduction' },
    { id: 'section-2', label: '2. Information We Collect' },
    { id: 'section-3', label: '3. How We Use Information' },
    { id: 'section-4', label: '4. Data Sharing' },
    { id: 'section-5', label: '5. Data Security' },
    { id: 'section-6', label: '6. Your Rights' },
    { id: 'section-7', label: '7. Cookies' },
    { id: 'section-8', label: '8. Changes to This Policy' },
    { id: 'section-9', label: '9. Contact Us' },
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
                    text="Privacy Policy"
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
                    <BlurText
                      as="span"
                      text="1. Introduction"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    This Privacy Policy explains how we collect, use, and disclose information about you when you
                    use our Services. We are committed to protecting your privacy and ensuring compliance with the
                    Nigerian Data Protection Regulation (NDPR) and other applicable laws. By using our Services,
                    you agree to the collection and use of information in accordance with this policy.
                  </p>
                </section>

                <section id="section-2" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="2. Information We Collect"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    We collect information you provide directly to us, such as when you create an account, fill
                    out a form, or communicate with us. This may include your name, email address, phone number,
                    and payment information. We also collect information automatically when you use our Services,
                    including log data, device information, and location information.
                  </p>
                </section>

                <section id="section-3" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="3. How We Use Information"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    We use the information we collect to provide, maintain, and improve our Services. This includes
                    processing transactions, sending you technical notices and support messages, communicating with
                    you about products and services, monitoring and analyzing trends, and personalizing the
                    Services.
                  </p>
                </section>

                <section id="section-4" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="4. Data Sharing"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    We may share your information with third-party vendors and service providers who need access to
                    such information to carry out work on our behalf. We may also share information in response to
                    a legal request, to protect our rights or property, or with your consent.
                  </p>
                </section>

                <section id="section-5" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="5. Data Security"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    We take reasonable measures to help protect information about you from loss, theft, misuse, and
                    unauthorized access, disclosure, alteration, and destruction. However, no security system is
                    impenetrable, and we cannot guarantee the security of our systems completely.
                  </p>
                </section>

                <section id="section-6" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="6. Your Rights"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    In accordance with the NDPR, you have the right to access, rectify, or erase your personal data.
                    You also have the right to object to or restrict processing of your data. To exercise these
                    rights, please contact us via our Support page.
                  </p>
                </section>

                <section id="section-7" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="7. Cookies"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    We use cookies and similar tracking technologies to track activity on our Services and hold
                    certain information. You can instruct your browser to refuse all cookies or to indicate when a
                    cookie is being sent. However, if you do not accept cookies, you may not be able to use some
                    portions of our Services.
                  </p>
                </section>

                <section id="section-8" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="8. Changes to This Policy"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    We may update our Privacy Policy from time to time. We will notify you of any changes by
                    posting the new Privacy Policy on this page. You are advised to review this Privacy Policy
                    periodically for any changes. Changes are effective when they are posted on this page.
                  </p>
                </section>

                <section id="section-9" className="scroll-mt-28">
                  <h2 className="text-lg font-semibold mb-3">
                    <BlurText
                      as="span"
                      text="9. Contact Us"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <p>
                    If you have any questions about this Privacy Policy or wish to exercise your rights, please
                    visit our <a href="/support/contact" className="text-blue-600 dark:text-blue-400 underline underline-offset-4">Support Center</a> to contact us.
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
