'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, MoveHorizontal } from 'lucide-react';
import BlurText from '../../shared/BlurText';
import RevealOnScroll from '../../shared/RevealOnScroll';

interface Testimonial {
  id: number;
  name: string;
  location?: string;
  role?: string;
  initials: string;
  gradient: string;
  rating?: number;
  quote: string;
}

interface SocialProofSectionProps {
  title?: string;
  subtitle?: string;
  testimonials?: Testimonial[];
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
  /** Optional wrapper className passthrough */
  className?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Adebayo Okoro',
    role: 'Operations Manager, Sterling Ventures',
    initials: 'AO',
    gradient: 'linear-gradient(135deg, #0077E6, #00529B)',
    rating: 5,
    quote: "RideOn's corporate solution has been a game-changer for our executive transport. The reliability is unmatched, and the central dashboard makes managing rides and expenses incredibly simple. Our team can finally focus on business, not logistics."
  },
  {
    id: 2,
    name: 'Chioma Nwosu',
    role: 'Consultant & Frequent Rider',
    initials: 'CN',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    rating: 5,
    quote: "As someone who travels for meetings across Nigeria's major cities, pre-booking with RideOn gives me peace of mind. The drivers are always professional, the cars are clean, and I never have to worry about surge pricing. It's the only service I trust."
  },
  {
    id: 3,
    name: 'Tunde Alabi',
    role: 'Driver Partner',
    initials: 'TA',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    rating: 5,
    quote: "Partnering with RideOn has transformed my driving career. The fixed bookings allow me to plan my day and guarantee my income. The company values professionalism and provides great support. It feels like a true partnership."
  }
];

export default function SocialProofSection({ 
  title = "Trusted by Professionals Across Nigeria",
  subtitle = "See what our clients, riders, and partners have to say about the RideOn experience.",
  testimonials: propTestimonials,
  background = 'solid',
  className,
}: SocialProofSectionProps = {}) {
  // Use prop testimonials if provided, otherwise use default
  const displayTestimonials = propTestimonials || testimonials;
  
  const [activeCardId, setActiveCardId] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef<number>(0);
  const dragOffsetRef = useRef<number>(0);

  const navigateToCard = (cardId: number) => {
    setActiveCardId(cardId);
  };

  const startAutoRotate = useCallback(() => {
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
    }
    autoRotateRef.current = setInterval(() => {
      setActiveCardId((prev) => (prev % displayTestimonials.length) + 1);
    }, 5000);
  }, [displayTestimonials.length]);

  const stopAutoRotate = useCallback(() => {
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
      autoRotateRef.current = null;
    }
  }, []);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, cardId: number) => {
    if (cardId !== activeCardId) return;
    
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    stopAutoRotate();
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragOffsetRef.current = clientX - startXRef.current;
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const diff = dragOffsetRef.current;
    
    if (Math.abs(diff) > 50) {
      setActiveCardId((prev) => {
        const len = displayTestimonials.length;
        if (diff > 0) {
          // Swipe right - go to previous
          return prev === 1 ? len : prev - 1;
        }
        // Swipe left - go to next
        return prev === len ? 1 : prev + 1;
      });
    }
    
    dragOffsetRef.current = 0;
    startAutoRotate();
  }, [displayTestimonials.length, isDragging, startAutoRotate]);

  useEffect(() => {
    startAutoRotate();
    return () => stopAutoRotate();
  }, [startAutoRotate, stopAutoRotate]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
      const handleTouchMove = (e: TouchEvent) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();
      const handleTouchEnd = () => handleDragEnd();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const getCardStyles = (cardId: number) => {
    const isActive = cardId === activeCardId;
    const order = isActive ? 3 : cardId === (activeCardId % displayTestimonials.length + 1) ? 2 : 1;
    const scale = isActive ? 1 : order === 2 ? 0.95 : 0.9;
    const opacity = isActive ? 1 : order === 2 ? 0.7 : 0.4;
    const offsetY = isActive ? 0 : order === 2 ? -24 : -48;

    return {
      transform: `translateY(${offsetY}px) ${isDragging && isActive ? `translateX(${dragOffsetRef.current}px)` : ''}`,
      scale: scale.toString(),
      opacity: opacity.toString(),
      zIndex: order,
      transition: isDragging && isActive ? 'none' : 'transform 500ms ease-in-out, opacity 500ms ease-in-out, scale 500ms ease-in-out',
      cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
      userSelect: 'none' as const,
      touchAction: 'pan-y' as const
    };
  };

  const wrapperBgClass = background === 'transparent'
    ? 'bg-transparent'
    : background === 'tinted'
      ? 'bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800'
      : 'bg-white dark:bg-slate-950';

  return (
    <div className={["relative w-full overflow-hidden", wrapperBgClass, "py-16 sm:py-24", className || ''].join(' ')}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <BlurText
            as="h2"
            className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl justify-center"
            text={title}
            animateBy="words"
            direction="top"
            delay={120}
          />
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400 justify-center"
            text={subtitle}
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>
        
        <RevealOnScroll as="section" className="mt-16"
                 style={{ 
                   '--tw-enter-opacity': '0', 
                   '--tw-enter-blur': '8px', 
                   '--tw-enter-translate-y': '2rem', 
                   'animationDelay': '400ms'
                 } as React.CSSProperties}>
          {/* Testimonials Stack */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="relative" style={{ display: 'grid', gridTemplateAreas: '"stack"' }}>
              {displayTestimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
                  style={{
                    gridArea: 'stack',
                    ...getCardStyles(testimonial.id)
                  }}
                  onMouseDown={(e) => handleDragStart(e, testimonial.id)}
                  onTouchStart={(e) => handleDragStart(e, testimonial.id)}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div 
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white font-semibold text-lg"
                        style={{ background: testimonial.gradient }}
                      >
                        {testimonial.initials}
                      </div>
                      <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold">
                          {testimonial.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {testimonial.role || testimonial.location}
                        </p>
                      </div>
                    </div>
                    {testimonial.rating && (
                      <div className="flex items-center text-amber-400 mb-4">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-current" />
                        ))}
                      </div>
                    )}
                    <blockquote className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Dots */}
            <RevealOnScroll as="div" className="flex gap-2 mt-8 justify-center" 
                 style={{ '--tw-enter-opacity': '0', 'animationDelay': '600ms' } as React.CSSProperties}>
              {displayTestimonials.map((testimonial) => (
                <button
                  key={testimonial.id}
                  className={`w-2 h-2 rounded-full border-none p-0 cursor-pointer transition-all duration-300 ${
                    activeCardId === testimonial.id
                      ? 'bg-[#00529B] transform scale-125'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  onClick={() => {
                    navigateToCard(testimonial.id);
                    startAutoRotate();
                  }}
                  aria-label={`Go to testimonial ${testimonial.id}`}
                />
              ))}
            </RevealOnScroll>
            
            {/* Navigation Hint */}
            <RevealOnScroll as="div" className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400" 
                 style={{ '--tw-enter-opacity': '0', 'animationDelay': '700ms' } as React.CSSProperties}>
              <span className="inline-flex items-center gap-2">
                <MoveHorizontal className="h-4 w-4" />
                Drag or click dots to navigate
              </span>
            </RevealOnScroll>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
}
