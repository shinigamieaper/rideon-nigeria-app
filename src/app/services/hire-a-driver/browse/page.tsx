import React from 'react';
import { Metadata } from 'next';
import DriverProfileCard from '../../../../../components/public/marketplace/DriverProfileCard';
import RevealOnScroll from '../../../../../components/shared/RevealOnScroll';


export const metadata: Metadata = {
  title: 'Browse Professional Drivers - RideOn Nigeria',
  description: 'Browse our marketplace of vetted, reliable, and professional drivers. Find your perfect match for long-term employment.',
};

// Mock data structure based on MongoDB schema
interface Driver {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  headline: string;
  imageUrl: string;
  experienceYears: number;
  averageRating: number;
  yearsOnPlatform: number;
  placementStatus: 'available' | 'interviewing' | 'on_contract';
  professionalSummary: string;
}

// This would typically connect to MongoDB
async function getAvailableDrivers(): Promise<Driver[]> {
  // TODO: Replace with actual MongoDB query
  // const drivers = await db.collection('drivers').find({ placementStatus: 'available' }).select('userId firstName lastName professionalSummary experienceYears averageRating').toArray();
  
  // Mock data for development
  return [
    {
      _id: '1',
      userId: 'user1',
      firstName: 'Bayo',
      lastName: 'Adebayo',
      headline: 'Executive Driver, 12 Yrs Exp.',
      imageUrl: 'https://images.unsplash.com/photo-1606822054436-39923d8f55c4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjZ8fGJsYWNrJTIwZ3V5JTIwcG9ydHJhaXR8ZW58MHx8MHx8fDA%3D',
      experienceYears: 12,
      averageRating: 4.9,
      yearsOnPlatform: 5,
      placementStatus: 'available',
      professionalSummary: 'A highly experienced and professional executive driver...'
    },
    {
      _id: '2',
      userId: 'user2',
      firstName: 'Tunde',
      lastName: 'Salami',
      headline: 'Personal & Family Driver',
      imageUrl: 'https://images.unsplash.com/photo-1630650583229-6ea01f566e2f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Njd8fGJsYWNrJTIwZ3V5JTIwcG9ydHJhaXR8ZW58MHx8MHx8fDA%3D',
      experienceYears: 8,
      averageRating: 5.0,
      yearsOnPlatform: 3,
      placementStatus: 'available',
      professionalSummary: 'Dedicated family driver with excellent safety record...'
    },
    {
      _id: '3',
      userId: 'user3',
      firstName: 'Chioma',
      lastName: 'Okwu',
      headline: 'Corporate & SUV Specialist',
      imageUrl: 'https://images.unsplash.com/photo-1530785602389-07594beb8b73?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGJsYWNrJTIwd29tYW4lMjBwb3J0cmFpdHxlbnwwfHwwfHx8MA%3D%3D',
      experienceYears: 6,
      averageRating: 4.8,
      yearsOnPlatform: 4,
      placementStatus: 'available',
      professionalSummary: 'Corporate driving specialist with SUV expertise...'
    },
    {
      _id: '4',
      userId: 'user4',
      firstName: 'Emeka',
      lastName: 'Nwankwo',
      headline: 'Defensive Driving Expert',
      imageUrl: 'https://images.unsplash.com/photo-1715005881129-266ccdd75e43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODh8fGJsYWNrJTIwZ3V5JTIwcG9ydHJhaXR8ZW58MHx8MHx8fDA%3D',
      experienceYears: 15,
      averageRating: 4.9,
      yearsOnPlatform: 7,
      placementStatus: 'available',
      professionalSummary: 'Expert in defensive driving techniques...'
    }
  ];
}

export default async function BrowseDriversPage() {
  const drivers = await getAvailableDrivers();

  return (
    <div className="">
      <main className="overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {/* Title and Intro */}
          <RevealOnScroll as="div" className="text-center mb-12" style={{
            ['--tw-enter-opacity' as any]: '0',
            ['--tw-enter-translate-y' as any]: '1rem',
            ['--tw-enter-blur' as any]: '8px',
            animationDelay: '100ms'
          } as React.CSSProperties}>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Meet Your Next Professional Driver
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
              Browse our marketplace of vetted, reliable, and professional drivers. Your peace of mind is our priority.
            </p>
          </RevealOnScroll>

          {/* Filter Bar */}
          <RevealOnScroll as="div" className="mb-10 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60" style={{
            ['--tw-enter-opacity' as any]: '0',
            ['--tw-enter-translate-y' as any]: '1rem',
            ['--tw-enter-blur' as any]: '8px',
            animationDelay: '200ms'
          } as React.CSSProperties}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-auto flex-1">
                <label htmlFor="experience-filter" className="sr-only">Years of Experience</label>
                <select 
                  id="experience-filter" 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option>Any Experience</option>
                  <option>1-3 Years</option>
                  <option>3-5 Years</option>
                  <option>5-10 Years</option>
                  <option>10+ Years</option>
                </select>
              </div>
              <div className="w-full sm:w-auto flex-1">
                <label htmlFor="vehicle-filter" className="sr-only">Vehicle Familiarity</label>
                <select 
                  id="vehicle-filter" 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option>Any Vehicle</option>
                  <option>Saloon</option>
                  <option>SUV</option>
                  <option>Bus</option>
                  <option>Luxury</option>
                </select>
              </div>
              <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition-opacity hover:opacity-90 bg-[#00529B]">
                Filter
              </button>
            </div>
          </RevealOnScroll>

          {/* Driver Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {drivers.map((driver, index) => (
              <div
                key={driver._id}
                style={{
                  'animationDelay': `${300 + (index * 100)}ms`
                } as React.CSSProperties}
              >
                <DriverProfileCard 
                  driver={{
                    id: driver._id,
                    firstName: driver.firstName,
                    lastName: driver.lastName,
                    headline: driver.headline,
                    imageUrl: driver.imageUrl,
                    rating: driver.averageRating,
                    experienceYears: driver.experienceYears,
                    yearsOnPlatform: driver.yearsOnPlatform
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
