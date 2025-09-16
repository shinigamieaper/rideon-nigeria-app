import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProfileHeader from '../../../../../../components/public/driver-profile/ProfileHeader';
import { ProfessionalSummary, VerificationChecklist, ConversionSidebar } from '../../../../../../components';
import RevealOnScroll from '../../../../../../components/shared/RevealOnScroll';


interface Driver {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  experienceYears: number;
  averageRating: number;
  yearsOnPlatform: number;
  placementStatus: 'available' | 'interviewing' | 'on_contract';
  professionalSummary: string;
  imageUrl: string;
  headline: string;
  fullTimePreferences?: {
    willingToTravel: boolean;
    preferredClientType: 'personal' | 'corporate' | 'any';
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
  };
}

interface PageProps {
  params: Promise<{
    driverId: string;
  }>;
}

// Mock data - replace with actual MongoDB query
async function getDriverById(driverId: string): Promise<Driver | null> {
  // TODO: Replace with actual MongoDB query
  // const driver = await db.collection('drivers').findOne({ _id: new ObjectId(driverId) });
  
  const mockDrivers: Driver[] = [
    {
      _id: '1',
      userId: 'user1',
      firstName: 'Bayo',
      lastName: 'Adebayo',
      headline: 'Executive Driver with 12 Years of Experience',
      imageUrl: 'https://images.unsplash.com/photo-1606822054436-39923d8f55c4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjZ8fGJsYWNrJTIwZ3V5JTIwcG9ydHJhaXR8ZW58MHx8MHx8fDA%3D',
      experienceYears: 12,
      averageRating: 4.9,
      yearsOnPlatform: 5,
      placementStatus: 'available',
      professionalSummary: 'A highly experienced and professional executive driver with over a decade of experience serving high-profile clients and corporate executives in major cities across Nigeria. Known for an impeccable safety record, deep knowledge of city and interstate routes, and unwavering commitment to punctuality and discretion.\n\nI pride myself on providing a smooth, safe, and comfortable journey, allowing my clients to relax or work while on the move. Familiar with a wide range of luxury vehicles, including armored cars.',
      fullTimePreferences: {
        willingToTravel: true,
        preferredClientType: 'any'
      },
      vehicle: {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        licensePlate: 'ABC-123-DE',
        color: 'Black'
      }
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
      professionalSummary: 'Dedicated family driver with excellent safety record and experience in child transportation. Specializes in creating a comfortable and secure environment for families.',
      fullTimePreferences: {
        willingToTravel: false,
        preferredClientType: 'personal'
      }
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
      professionalSummary: 'Corporate driving specialist with SUV expertise and experience serving executive teams. Known for professionalism and reliability in high-pressure situations.',
      fullTimePreferences: {
        willingToTravel: true,
        preferredClientType: 'corporate'
      }
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
      professionalSummary: 'Expert in defensive driving techniques with extensive experience in security driving. Trained in emergency response and route planning for high-profile clients.',
      fullTimePreferences: {
        willingToTravel: true,
        preferredClientType: 'any'
      }
    }
  ];

  return mockDrivers.find(driver => driver._id === driverId) || null;
}

// Get all available drivers for static generation
async function getAllDriverIds(): Promise<string[]> {
  // TODO: Replace with actual MongoDB query
  // const drivers = await db.collection('drivers').find({ placementStatus: 'available' }).select('_id').toArray();
  // return drivers.map(driver => driver._id.toString());
  
  return ['1', '2', '3', '4'];
}

export async function generateStaticParams() {
  const driverIds = await getAllDriverIds();
  
  return driverIds.map((driverId) => ({
    driverId: driverId,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { driverId } = await params;
  const driver = await getDriverById(driverId);
  
  if (!driver) {
    return {
      title: 'Driver Not Found - RideOn Nigeria',
      description: 'The requested driver profile could not be found.',
    };
  }

  const displayName = `${driver.firstName} ${driver.lastName.charAt(0)}.`;
  
  return {
    title: `${displayName} - Professional Driver | RideOn Nigeria`,
    description: `Meet ${displayName}, ${driver.headline.toLowerCase()}. ${driver.experienceYears} years of experience with a ${driver.averageRating} star rating. Available for hire through RideOn Nigeria.`,
    openGraph: {
      title: `${displayName} - Professional Driver | RideOn Nigeria`,
      description: `Meet ${displayName}, ${driver.headline.toLowerCase()}. ${driver.experienceYears} years of experience with a ${driver.averageRating} star rating.`,
      images: [
        {
          url: driver.imageUrl,
          width: 400,
          height: 400,
          alt: displayName,
        },
      ],
    },
  };
}

export default async function DriverProfilePage({ params }: PageProps) {
  const { driverId } = await params;
  const driver = await getDriverById(driverId);

  if (!driver) {
    notFound();
  }

  const keyDetails = [
    { label: 'Years of Experience', value: driver.experienceYears.toString() },
    { label: 'Languages Spoken', value: 'English, Yoruba' }, // This could be dynamic
    { 
      label: 'Willing to Travel', 
      value: driver.fullTimePreferences?.willingToTravel ? 'Yes, Nationwide' : 'Local City Only' 
    },
    { label: 'Vehicle Familiarity', value: 'SUV, Saloon, Luxury' }, // This could be dynamic
  ];

  // Mock reviews data
  const reviews = [
    {
      rating: 5,
      comment: "Bayo has been our company's executive driver for two years. His professionalism is unmatched. Always on time, car is immaculate, and he is a very safe driver.",
      author: "Corporate Client",
      date: "May 2024"
    },
    {
      rating: 5,
      comment: "The best driver I've had. They know all the shortcuts to avoid traffic. Highly recommend.",
      author: "Pre-Booked Ride Client",
      date: "April 2024"
    }
  ];

  return (
    <div className="">
      <main className="overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column: Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Header */}
              <ProfileHeader 
                driver={{
                  firstName: driver.firstName,
                  lastName: driver.lastName,
                  headline: driver.headline,
                  imageUrl: driver.imageUrl
                }}
              />

              {/* Professional Summary */}
              <ProfessionalSummary summary={driver.professionalSummary} />

              {/* Details & Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Key Details */}
                <RevealOnScroll 
                  as="div"
                  className="p-8 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60" 
                  style={{
                    '--tw-enter-opacity': '0',
                    '--tw-enter-translate-y': '1rem',
                    '--tw-enter-blur': '8px',
                    'animationDelay': '300ms'
                  } as React.CSSProperties}
                >
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Key Details</h2>
                  <ul className="space-y-3">
                    {keyDetails.map((detail, index) => (
                      <li key={index} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{detail.label}:</span>
                        <span className="text-slate-600 dark:text-slate-400">{detail.value}</span>
                      </li>
                    ))}
                  </ul>
                </RevealOnScroll>

                {/* Verification Checklist */}
                <VerificationChecklist />
              </div>

              {/* Reviews & Ratings */}
              <RevealOnScroll 
                as="div"
                className="p-8 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60" 
                style={{
                  '--tw-enter-opacity': '0',
                  '--tw-enter-translate-y': '1rem',
                  '--tw-enter-blur': '8px',
                  'animationDelay': '500ms'
                } as React.CSSProperties}
              >
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Reviews & Ratings</h2>
                <div className="space-y-6">
                  {reviews.map((review, index) => (
                    <div key={index}>
                      <div className="flex items-center mb-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <blockquote className="italic text-slate-600 dark:text-slate-400">
                        "{review.comment}"
                      </blockquote>
                      <p className="text-right text-sm font-medium text-slate-500 dark:text-slate-500 mt-2">
                        - {review.author} ({review.date})
                      </p>
                      {index < reviews.length - 1 && (
                        <div className="h-px bg-slate-200 dark:bg-slate-700/50 mt-6"></div>
                      )}
                    </div>
                  ))}
                </div>
              </RevealOnScroll>
            </div>

            {/* Right Column: Conversion Block */}
            <ConversionSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
