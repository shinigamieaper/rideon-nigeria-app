"use client";

import React, { useState, FormEvent } from "react";
import BlurText from "../BlurText";
import RevealOnScroll from "../RevealOnScroll";

export interface PriceEstimationWidgetProps extends React.ComponentPropsWithoutRef<"div"> {
  onSubmitForm?: (data: {
    pickupLocation: string;
    destination: string;
    selectedDateTime: string; // ISO-like value from <input type="datetime-local">
  }) => void;
  title?: string;
  subtitle?: string;
  showDescription?: boolean;
}

type CSSVars = React.CSSProperties & {
  '--tw-enter-opacity'?: number | string;
  '--tw-enter-translate-y'?: string;
  '--tw-enter-scale'?: string | number;
  '--tw-enter-blur'?: string | number;
};

const PriceEstimationWidget: React.FC<PriceEstimationWidgetProps> = ({
  onSubmitForm,
  title = "Your Professional Ride. Guaranteed.",
  subtitle = "Schedule your rides in Nigeria's major cities with absolute certainty. No surge pricing. No surprises.",
  showDescription = true,
  className,
  ...rest
}) => {
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState("");

  const allFilled = pickupLocation.trim() && destination.trim() && selectedDateTime.trim();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = { pickupLocation, destination, selectedDateTime };
    if (onSubmitForm) {
      onSubmitForm(data);
    } else {
      // Temporary behavior per spec
      console.log("PriceEstimationWidget submit:", data);
    }
  };

  // Typed helpers for CSS custom properties used by Tailwind's animate-in utilities
  const baseEnterStyle: CSSVars = {
    '--tw-enter-opacity': 0,
    '--tw-enter-translate-y': '1rem',
    '--tw-enter-scale': '.98',
    '--tw-enter-blur': '8px',
  };

  const fadeInDownStyle: CSSVars = {
    '--tw-enter-opacity': 0,
    '--tw-enter-translate-y': '.5rem',
  };

  return (
    <div className={className} {...rest}>
      <RevealOnScroll as="div" style={baseEnterStyle}>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 sm:p-8 shadow-2xl shadow-blue-500/10 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {showDescription && (
              <div className="text-center sm:text-left">
                <RevealOnScroll as="h1" style={fadeInDownStyle}>
                  <BlurText
                    as="span"
                    text={title}
                    className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
                    childClassName="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300"
                    animateBy="words"
                  />
                </RevealOnScroll>
                {subtitle && (
                  <RevealOnScroll as="p" className="mt-4 text-lg text-slate-300" style={fadeInDownStyle}>
                    <BlurText as="span" text={subtitle} animateBy="words" />
                  </RevealOnScroll>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* Pickup */}
              <RevealOnScroll as="div" style={fadeInDownStyle}>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    {/* map-pin */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#0077E6]"
                    >
                      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="pickup"
                    id="pickup"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="block w-full rounded-md border-0 border-b border-slate-300/20 bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-[#0077E6] focus:outline-none focus:ring-0 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
                    placeholder="Enter Pickup Location"
                    autoComplete="off"
                  />
                </div>
              </RevealOnScroll>

              {/* Destination */}
              <RevealOnScroll as="div" style={fadeInDownStyle}>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    {/* flag */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#0077E6]"
                    >
                      <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="destination"
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="block w-full rounded-md border-0 border-b border-slate-300/20 bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-[#0077E6] focus:outline-none focus:ring-0 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
                    placeholder="Enter Destination"
                    autoComplete="off"
                  />
                </div>
              </RevealOnScroll>

              {/* Date & Time */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RevealOnScroll as="div" className="sm:col-span-2" style={fadeInDownStyle}>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      {/* calendar/clock combo icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#0077E6]"
                      >
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect width="18" height="18" x="3" y="4" rx="2" />
                        <path d="M3 10h18" />
                      </svg>
                    </div>
                    <input
                      type="datetime-local"
                      name="datetime"
                      id="datetime"
                      value={selectedDateTime}
                      onChange={(e) => setSelectedDateTime(e.target.value)}
                      className="block w-full rounded-md border-0 border-b border-slate-300/20 bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-[#0077E6] focus:outline-none focus:ring-0 transition-all duration-300 hover:bg-white/10 focus:bg-white/10 [color-scheme:dark]"
                      placeholder="Select Date & Time"
                    />
                  </div>
                </RevealOnScroll>
              </div>
            </div>

            <RevealOnScroll as="div" style={fadeInDownStyle}>
              <button
                type="submit"
                disabled={!allFilled}
                className="flex w-full transform transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-100 text-base font-semibold text-white bg-gradient-to-br from-[#0077E6] to-[#00529B] border-transparent border rounded-md pt-3.5 pr-8 pb-3.5 pl-8 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BlurText as="span" text="Get a Guaranteed Price" animateBy="letters" />
              </button>
            </RevealOnScroll>
          </form>
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default PriceEstimationWidget;

