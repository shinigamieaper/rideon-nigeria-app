export { default as Button } from './ui/Button';
export type { ButtonProps, ButtonVariant } from './ui/Button';
export { default as Input } from './ui/Input';
export type { InputProps } from './ui/Input';
export { default as StatusBadge } from './ui/StatusBadge';
export type { StatusBadgeProps, StatusBadgeVariant } from './ui/StatusBadge';
export { default as Card } from './ui/Card';
export type { CardProps } from './ui/Card';
export * from './ui/Modal';

// Layout
export { default as PublicHeader } from './layout/PublicHeader';
export { default as PublicFooter } from './layout/PublicFooter';
export { default as SocialProofSection } from './layout/SocialProofSection';
export { default as AppHeader } from './layout/AppHeader';

// Shared
export { default as PriceEstimationWidget } from './shared/PriceEstimationWidget';
export type { PriceEstimationWidgetProps } from './shared/PriceEstimationWidget';
export { default as InfiniteLogoScroller } from './shared/InfiniteLogoScroller';
export { default as PhoneMockup } from './shared/PhoneMockup';
export { PhoneScreenMedia } from './shared/PhoneMockup';
export { default as DottedBackground } from './shared/DottedBackground';
export { default as DotGrid } from './shared/DotGrid';
export { default as ScrollSpyToc } from './shared/ScrollSpyToc';
export { default as GradualBlur } from './shared/GradualBlur';
export type { GradualBlurProps } from './shared/GradualBlur';
export { default as BlurText } from './shared/BlurText';
export type { IBlurTextProps as BlurTextProps } from './shared/BlurText';
export { default as RevealOnScroll } from './shared/RevealOnScroll';
export type { IRevealOnScrollProps as RevealOnScrollProps } from './shared/RevealOnScroll';

// Public home

// Public corporate
export { default as CorporateHeroSection } from './public/corporate/HeroSection';
export { default as PainPointSolutionSection } from './public/corporate/PainPointSolutionSection';
export { default as LeadFormSection } from './public/corporate/LeadFormSection';

// Public hire-a-driver
export { default as HireDriverHeroSection } from './public/hire-a-driver/HeroSection';
export { default as HireDriverComplianceSection } from './public/hire-a-driver/ComplianceSection';
export { default as HireDriverFinalCTASection } from './public/hire-a-driver/FinalCTASection';
export { default as HeroSection } from './public/home/HeroSection';
export type { HeroSectionProps } from './public/home/HeroSection';

// Service sections
export { default as ServicePillarsSection } from './public/home/ServicePillarsSection';
export type { ServicePillarsSectionProps } from './public/home/ServicePillarsSection';

// Why RideOn section
export { default as WhyRideOnSection } from './public/home/WhyRideOnSection';
export type { WhyRideOnSectionProps } from './public/home/WhyRideOnSection';

// Social proof section (moved to layout)

// Public about page
export { default as MissionSection } from './public/about/MissionSection';
export { default as CoreValuesSection } from './public/about/CoreValuesSection';

// Public Pre-Booked Rides page
export { default as PreBookedRidesHeroSection } from './public/pre-booked-rides/HeroSection';
export { default as HowItWorksSection } from './public/pre-booked-rides/HowItWorksSection';
export { default as UseCaseGallerySection } from './public/pre-booked-rides/UseCaseGallerySection';
export { default as ComparisonTableSection } from './public/pre-booked-rides/ComparisonTableSection';
export { default as FinalCTASection } from './public/pre-booked-rides/FinalCTASection';

// Public drive-with-us
export { default as DriveWithUsHeroSection } from './public/drive-with-us/HeroSection';
export { default as DriveWithUsBenefitsSection } from './public/drive-with-us/BenefitsSection';
export { default as DriveWithUsProcessSection } from './public/drive-with-us/ProcessSection';
export { default as DriveWithUsFinalCTASection } from './public/drive-with-us/FinalCTASection';

// Driver Marketplace
export { default as DriverProfileCard } from './public/marketplace/DriverProfileCard';

// Driver Profile Components
export { default as ProfileHeader } from './public/driver-profile/ProfileHeader';
export { default as ProfessionalSummary } from './public/driver-profile/ProfessionalSummary';
export { default as VerificationChecklist } from './public/driver-profile/VerificationChecklist';
export { default as ConversionSidebar } from './public/driver-profile/ConversionSidebar';

// Dashboard Components
export { default as DashboardView } from './dashboard/DashboardView';
export { default as DashboardSkeleton } from './dashboard/DashboardSkeleton';
export { default as DashboardEmptyState } from './dashboard/DashboardEmptyState';
export { default as DashboardErrorState } from './dashboard/DashboardErrorState';
export { default as UpcomingTripCard } from './dashboard/UpcomingTripCard';
export { default as RecentActivityFeed } from './dashboard/RecentActivityFeed';

// UI Components
export { FloatingDock } from './ui/floating-dock';
export type { FloatingDockProps } from './ui/floating-dock';
export { default as NeonThemeToggle } from './ui/NeonThemeToggle';
export type { NeonThemeToggleProps } from './ui/NeonThemeToggle';

// Shared Components
export { default as FloatingDockDemo } from './shared/floating-dock-demo';
export type { FloatingDockDemoProps } from './shared/floating-dock-demo';

// Booking Flow Components
export { default as BookingStep1_RouteSelection } from './app/booking/BookingStep1_RouteSelection';
export { default as BookingStep2_ScheduleDetails } from './app/booking/BookingStep2_ScheduleDetails';
export { default as BookingStep3_Confirmation } from './app/booking/BookingStep3_Confirmation';
export { default as BookingLoadingState } from './app/booking/BookingLoadingState';
export { default as BookingErrorState } from './app/booking/BookingErrorState';
export { default as LocationInputFields } from './app/booking/LocationInputFields';
export { default as VehicleClassSelector } from './app/booking/VehicleClassSelector';
export { default as PaymentMethodSelector } from './app/booking/PaymentMethodSelector';
