'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import BlurText from "../../../../components/shared/BlurText";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const SECTIONS: FaqSection[] = [
  {
    title: 'For Riders',
    items: [
      {
        q: 'How do I book a ride?',
        a: "You can book a ride easily through our app. Enter your pickup and drop-off locations, choose a ride type, and confirm your booking. You'll see the estimated fare and arrival time before you confirm.",
      },
      {
        q: 'What safety features are in place?',
        a: 'Your safety is our priority. All drivers undergo background checks. The app features trip sharing, an SOS button for emergencies, and 24/7 support. You can also see your driver\'s details and rating before they arrive.',
      },
    ],
  },
  {
    title: 'For Drivers',
    items: [
      {
        q: 'What are the requirements to become a driver?',
        a: 'You must be at least 21, hold a valid driver\'s license, have a clean driving record, and pass a background check. Your vehicle must meet our safety and condition standards.',
      },
      {
        q: 'How and when do I get paid?',
        a: 'Earnings are calculated weekly and deposited to your bank account. Track earnings in real-time via the driver app with detailed trip summaries.',
      },
    ],
  },
  {
    title: 'For Corporate Clients',
    items: [
      {
        q: 'How does the corporate solution work?',
        a: 'Our corporate platform centralizes your company\'s ground transportation. Set travel policies, manage employee access, and track spending from a dashboard. We provide a single monthly invoice for all trips.',
      },
    ],
  },
  {
    title: 'Billing & Payments',
    items: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept major credit and debit cards, as well as popular digital wallets. Add multiple payment methods and select your preferred one for each ride.',
      },
      {
        q: 'How can I get a receipt for my ride?',
        a: "A receipt is automatically sent to your email after each completed trip. You can also view and download receipts from the app's Your Trips section.",
      },
    ],
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filteredSections = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)
      ),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  const toggle = (key: string) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className=" text-foreground">
      {/* Background handled globally by DottedBackground in RootLayout */}

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            <BlurText as="span" text="Frequently Asked Questions" animateBy="words" direction="top" delay={120} />
          </h1>
          <p className="mt-4 text-lg text-foreground/70">
            <BlurText as="span" text="Have a question? Find your answer in our knowledge base." animateBy="words" direction="top" delay={24} />
          </p>
          {/* Search */}
          <div className="mt-10 max-w-xl mx-auto">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-5 w-5 text-foreground/50" />
              </div>
              <input
                type="search"
                name="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full rounded-xl border-0 bg-white/60 dark:bg-black/40 py-4 pl-12 pr-4 text-foreground shadow-lg ring-1 ring-inset ring-black/10 dark:ring-white/10 placeholder:text-foreground/50 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all"
                placeholder="Search for answers..."
              />
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-16 sm:mt-20 space-y-12">
          {filteredSections.length === 0 ? (
            <p className="text-center text-foreground/70">No results found.</p>
          ) : (
            filteredSections.map((section, si) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold tracking-tight">
                  <BlurText as="span" text={section.title} animateBy="words" direction="top" delay={100} />
                </h2>
                <div className="mt-4 rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 divide-y divide-slate-200/80 dark:divide-slate-800/60 shadow-lg">
                  {section.items.map((item, ii) => {
                    const key = `${si}-${ii}-${item.q}`;
                    const expanded = !!open[key];
                    return (
                      <div className="accordion-item" key={key}>
                        <h3>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => toggle(key)}
                            className="flex w-full items-center justify-between p-4 sm:p-5 text-left font-medium hover:bg-foreground/5 transition-colors"
                          >
                            <span>{item.q}</span>
                            <ChevronDown
                              className={`h-5 w-5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </h3>
                        <div className={`overflow-hidden transition-all ${expanded ? 'max-h-96' : 'max-h-0'}`}>
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-foreground/80">
                            {item.a}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
