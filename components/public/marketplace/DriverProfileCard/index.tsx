import React from 'react';
import Link from 'next/link';
import { Star, Shield, CheckCircle2 } from 'lucide-react';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  imageUrl: string;
  rating: number;
  experienceYears: number;
  yearsOnPlatform: number;
}

interface DriverProfileCardProps {
  driver: Driver;
}

const DriverProfileCard: React.FC<DriverProfileCardProps> = ({ driver }) => {
  const displayName = `${driver.firstName} ${driver.lastName.charAt(0)}.`;
  
  return (
    <Link 
      href={`/services/hire-a-driver/profile/${driver.id}`}
      className="group block animate-in"
      style={{
        '--tw-enter-opacity': '0',
        '--tw-enter-translate-y': '1rem',
        '--tw-enter-blur': '8px'
      } as React.CSSProperties}
    >
      <div className="relative p-6 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-700/60 h-full flex flex-col group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 ease-in-out">
        <div className="flex-grow">
          <img 
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-white dark:border-slate-700" 
            src={driver.imageUrl} 
            alt={displayName}
          />
          <h3 className="text-center text-lg font-semibold text-slate-900 dark:text-white">
            {displayName}
          </h3>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-1">
            {driver.headline}
          </p>
          <div className="my-4 h-px bg-slate-200 dark:bg-slate-700/50"></div>
          <div className="flex justify-around items-center text-sm text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              {driver.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-500" />
              {driver.yearsOnPlatform} Yrs on RideOn
            </span>
          </div>
        </div>
        <div className="mt-5 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-green-600">
            <CheckCircle2 className="w-4 h-4" />
            RideOn Verified
          </span>
        </div>
      </div>
    </Link>
  );
};

export default DriverProfileCard;
