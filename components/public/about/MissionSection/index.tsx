"use client";

import { useEffect, useRef } from 'react';
import BlurText from '../../../shared/BlurText';
import Image from 'next/image';

type MissionSectionProps = Record<string, never>;

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number; // degrees
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

const MissionSection: React.FC<MissionSectionProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let beams: Beam[] = [];
    const MINIMUM_BEAMS = 20;

    const container = canvas.parentElement;

    function updateCanvasSize() {
        if (!container || !canvas || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.offsetWidth * dpr;
        canvas.height = container.offsetHeight * dpr;
        canvas.style.width = `${container.offsetWidth}px`;
        canvas.style.height = `${container.offsetHeight}px`;
        ctx.scale(dpr, dpr);
        const totalBeams = MINIMUM_BEAMS * 1.5;
        beams = Array.from({ length: totalBeams }, () => createBeam(canvas.width, canvas.height));
    }

    function createBeam(width: number, height: number): Beam {
        const angle = -35 + Math.random() * 10;
        return {
            x: Math.random() * width * 1.5 - width * 0.25,
            y: Math.random() * height * 1.5 - height * 0.25,
            width: 30 + Math.random() * 60,
            length: height * 2.5,
            angle: angle,
            speed: 0.3 + Math.random() * 0.6,
            opacity: 0.08 + Math.random() * 0.1,
            hue: 200 + Math.random() * 40, // Blue hues
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.03,
        }
    }

    function resetBeam(beam: Beam, index: number, totalBeams: number): Beam {
        if (!canvas) return beam;
        beam.y = canvas.height + 100;
        const column = index % 3;
        const spacing = canvas.width / 3;
        beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
        beam.width = 100 + Math.random() * 100;
        beam.speed = 0.3 + Math.random() * 0.4;
        beam.hue = 200 + (index * 40) / totalBeams;
        beam.opacity = 0.1 + Math.random() * 0.1;
        return beam;
    }

    function drawBeam(beam: Beam) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate((beam.angle * Math.PI) / 180);
        const pulsingOpacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2);
        const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
        gradient.addColorStop(0, `hsla(${beam.hue}, 85%, 65%, 0)`);
        gradient.addColorStop(0.1, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`);
        gradient.addColorStop(0.4, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`);
        gradient.addColorStop(0.6, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`);
        gradient.addColorStop(0.9, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`);
        gradient.addColorStop(1, `hsla(${beam.hue}, 85%, 65%, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
        ctx.restore();
    }

    let animationFrameId: number;
    function animate() {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = "blur(35px)";
        const totalBeams = beams.length;
        beams.forEach((beam, index) => {
            beam.y -= beam.speed;
            beam.pulse += beam.pulseSpeed;
            if (beam.y + beam.length < -100) {
                resetBeam(beam, index, totalBeams);
            }
            drawBeam(beam);
        });
        animationFrameId = requestAnimationFrame(animate);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    animate();

    return () => {
        window.removeEventListener('resize', updateCanvasSize);
        cancelAnimationFrame(animationFrameId);
    }
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-70"></canvas>
      <div className="absolute inset-0 bg-slate-950/40" style={{ backdropFilter: 'blur(40px)' }}></div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="animate-in" style={{ '--tw-enter-opacity': '0', '--tw-enter-scale': '0.95', '--tw-enter-blur': '8px', animationDelay: '200ms' } as React.CSSProperties}>
            <div className="relative aspect-w-4 aspect-h-3 rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/40">
              <Image
                src="https://media.istockphoto.com/id/1914467304/photo/woman-near-car-on-the-street.jpg?b=1&s=612x612&w=0&k=20&c=dwS0QP-8yTxpY7v73QX4TdJu9Bzvrc8lZFA0wvM2M0U="
                alt="Professional team in a modern office setting"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={false}
              />
            </div>
          </div>
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight animate-in" style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem', animationDelay: '300ms' } as React.CSSProperties}>
              <BlurText
                as="span"
                text="Redefining Mobility in Nigeria, One Professional Journey at a Time."
                animateBy="words"
                direction="top"
                delay={120}
                childClassName="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300"
              />
            </h1>
            <div className="mt-10 space-y-8">
              <div className="animate-in" style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem', animationDelay: '400ms' } as React.CSSProperties}>
                <h2 className="text-2xl font-medium tracking-tight text-white">
                  <BlurText as="span" text="Our Mission" animateBy="words" direction="top" delay={120} />
                </h2>
                <BlurText
                  as="p"
                  className="mt-3 text-lg text-slate-300"
                  text="Our mission is to provide Nigeria's professionals and businesses with a mobility solution that is the gold standard in safety, reliability, and professionalism."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>
              <div className="animate-in" style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem', animationDelay: '500ms' } as React.CSSProperties}>
                <h2 className="text-2xl font-medium tracking-tight text-white">
                  <BlurText as="span" text="Our Vision" animateBy="words" direction="top" delay={120} />
                </h2>
                <BlurText
                  as="p"
                  className="mt-3 text-lg text-slate-300"
                  text="To be the most trusted name in premium, pre-booked transportation, empowering economic growth and building a community of respected drivers and satisfied clients."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionSection;
