export { default as Input } from "./ui/Input";
export type { InputProps } from "./ui/Input";
export { default as StatusBadge } from "./ui/StatusBadge";
export type { StatusBadgeProps, StatusBadgeVariant } from "./ui/StatusBadge";
export * from "./ui/Modal";

// Layout
export { default as PublicHeader } from "./layout/PublicHeader";
export { default as PublicFooter } from "./layout/PublicFooter";
export { default as AppHeader } from "./layout/AppHeader";

// Shared
export { default as InfiniteLogoScroller } from "./shared/InfiniteLogoScroller";
export { default as DotGrid } from "./shared/DotGrid";
export { default as ScrollSpyToc } from "./shared/ScrollSpyToc";
export { default as GradualBlur } from "./shared/GradualBlur";
export type { GradualBlurProps } from "./shared/GradualBlur";
export { default as BlurText } from "./shared/BlurText";
export type { BlurTextProps } from "./shared/BlurText";
export { default as RevealOnScroll } from "./shared/RevealOnScroll";
export { default as ProfilePhotoUpload } from "./shared/ProfilePhotoUpload";
export type { ProfilePhotoUploadProps } from "./shared/ProfilePhotoUpload";
export type { IRevealOnScrollProps as RevealOnScrollProps } from "./shared/RevealOnScroll";

// Public home
export { default as HeroSection } from "./public/home/HeroSection";
export { default as HowItWorksSection } from "./public/home/HowItWorksSection";
export type { HowItWorksSectionProps } from "./public/home/HowItWorksSection";
export type { HeroSectionProps } from "./public/home/HeroSection";

// Why RideOn section
export { default as WhyRideOnSection } from "./public/home/WhyRideOnSection";
export type { WhyRideOnSectionProps } from "./public/home/WhyRideOnSection";

// Public about page
export { default as MissionSection } from "./public/about/MissionSection";
export { default as CoreValuesSection } from "./public/about/CoreValuesSection";

// Public drive-with-us
export { default as DriveWithUsHeroSection } from "./public/drive-with-us/HeroSection";
export { default as DriveWithUsBenefitsSection } from "./public/drive-with-us/BenefitsSection";
export { default as DriveWithUsProcessSection } from "./public/drive-with-us/ProcessSection";
export { default as DriveWithUsFinalCTASection } from "./public/drive-with-us/FinalCTASection";
// Dashboard
export { default as UpcomingTripCard } from "./dashboard/UpcomingTripCard";
export { default as UpNextCard } from "./driver/dashboard/UpNextCard";
export type {
  UpNextCardProps,
  UpNextCardTrip,
} from "./driver/dashboard/UpNextCard";
export { default as PastTripCard } from "./dashboard/PastTripCard";
export { default as RecentActivityFeed } from "./dashboard/RecentActivityFeed";
export { default as DashboardSkeleton } from "./dashboard/DashboardSkeleton";
export { default as DashboardErrorState } from "./dashboard/DashboardErrorState";
export { default as DashboardEmptyState } from "./dashboard/DashboardEmptyState";
export type { DashboardEmptyStateProps } from "./dashboard/DashboardEmptyState";

export { default as DriverHeader } from "./driver/dashboard/DriverHeader";
export type {
  DriverHeaderProps,
  DriverHeaderDriver,
} from "./driver/dashboard/DriverHeader";
export { default as OnlineToggle } from "./driver/dashboard/OnlineToggle";
export type { OnlineToggleProps } from "./driver/dashboard/OnlineToggle";
export { default as OnlineToggleLive } from "./driver/dashboard/OnlineToggleLive";
export type { OnlineToggleLiveProps } from "./driver/dashboard/OnlineToggleLive";
export { default as QuickStatsBar } from "./driver/dashboard/QuickStatsBar";
export type { QuickStatsBarProps } from "./driver/dashboard/QuickStatsBar";
export { default as NextTripLive } from "./driver/dashboard/NextTripLive";
export type { NextTripLiveProps } from "./driver/dashboard/NextTripLive";
export { default as DriverRatingStats } from "./driver/dashboard/DriverRatingStats";
export type { DriverRatingStatsProps } from "./driver/dashboard/DriverRatingStats";
export { default as RecentFeedback } from "./driver/dashboard/RecentFeedback";
export type {
  RecentFeedbackProps,
  FeedbackItem,
} from "./driver/dashboard/RecentFeedback";
export { default as DriverRatingsSection } from "./driver/dashboard/DriverRatingsSection";
export type { DriverRatingsSectionProps } from "./driver/dashboard/DriverRatingsSection";
export { default as DashboardHero } from "./driver/dashboard/DashboardHero";
export type {
  DashboardHeroProps,
  FullTimeApplicationStatus,
} from "./driver/dashboard/DashboardHero";
export { default as ProfileMenuList } from "./driver/profile/ProfileMenuList";
export type { ProfileMenuListProps } from "./driver/profile/ProfileMenuList";
export { default as DriverTripDetailClient } from "./driver/TripDetailClient";
export type { DriverTripDetailClientProps } from "./driver/TripDetailClient";
export { default as PendingBookingCard } from "./driver/bookings/PendingBookingCard";
export type {
  PendingBookingCardProps,
  PendingBooking,
} from "./driver/bookings/PendingBookingCard";

export { default as DashboardClient } from "./app/DashboardClient";
export { default as CustomerDashboardHero } from "./app/dashboard/CustomerDashboardHero";
export type { CustomerDashboardHeroProps } from "./app/dashboard/CustomerDashboardHero";
export { default as ActivityFeedClient } from "./app/ActivityFeedClient";
export { default as CatalogGridCard } from "./app/catalog/CatalogGridCard";
export { default as ReservationDetailClient } from "./app/ReservationDetailClient";
export { default as ReservationsClient } from "./app/ReservationsClient";
export { default as RideOnFloatingDock } from "./app/RideOnFloatingDock";
export { default as CustomerOnboardingTour } from "./app/CustomerOnboardingTour";
export { default as RentalProvider } from "./app/RentalProvider";
export { default as RentalSummary } from "./app/RentalSummary";
export { default as ChangeVehiclePicker } from "./app/ChangeVehiclePicker";
export { default as ProfileForm } from "./app/profile/ProfileForm";
export { default as RateDriverModal } from "./app/RateDriverModal";
export { default as CancelTripModal } from "./app/CancelTripModal";
// App - booking flow
export { default as BookingProvider } from "./app/BookingProvider";
export { default as VehicleClassCard } from "./app/VehicleClassCard";
export { default as VehicleClassSelector } from "./app/booking/VehicleClassSelector";
export { default as NotificationsList } from "./app/notifications/NotificationsList";
export type {
  NotificationsListProps,
  NotificationEntry,
} from "./app/notifications/NotificationsList";
export { default as NotificationsFeedClient } from "./app/notifications/NotificationsFeedClient";
// App - Notifications
export { default as CustomerNotificationPermissionCard } from "./app/notifications/NotificationPermissionCard";
export type { CustomerNotificationPermissionCardProps } from "./app/notifications/NotificationPermissionCard";

// App - Messaging
export { default as ConversationList } from "./app/messages/ConversationList";
export { default as ConversationItem } from "./app/messages/ConversationItem";
export { default as MessageInput } from "./app/messages/MessageInput";
export { default as ChatWindow } from "./app/messages/ChatWindow";
// App - Profile
export { default as PaymentMethodList } from "./app/profile/PaymentMethodList";
export { default as NotificationToggles } from "./app/profile/NotificationToggles";

// UI - Additional
export { FloatingDock } from "./ui/floating-dock";
export { default as StickyBanner } from "./ui/StickyBanner";
export type { StickyBannerProps } from "./ui/StickyBanner";
export { default as BrandBanner } from "./shared/BrandBanner";
export type { BrandBannerProps } from "./shared/BrandBanner";
export { default as BottomSheet } from "./ui/BottomSheet";
export { default as Button } from "./ui/Button";
export type { ButtonProps, ButtonVariant } from "./ui/Button";
export * from "./ui/Select";
export * from "./ui/Popover";
export * from "./ui/Command";
export { default as MultiSelectCombobox } from "./ui/MultiSelectCombobox";
export type {
  MultiSelectComboboxProps,
  MultiSelectComboboxOption,
} from "./ui/MultiSelectCombobox";
export { default as SingleSelectCombobox } from "./ui/SingleSelectCombobox";
export type {
  SingleSelectComboboxProps,
  SingleSelectComboboxOption,
} from "./ui/SingleSelectCombobox";
export { default as Checkbox } from "./ui/Checkbox";
export type { CheckboxProps } from "./ui/Checkbox";
export { default as ActionModal } from "./ui/ActionModal";
export type { ActionModalProps } from "./ui/ActionModal";
export { default as Switch } from "./ui/Switch";
export type { SwitchProps } from "./ui/Switch";

// Profile - Logout
export { default as LogoutButton } from "./app/profile/LogoutButton";
export type { LogoutButtonProps } from "./app/profile/LogoutButton";

// Driver - Dashboard
export { default as DriverDashboardSkeleton } from "./driver/dashboard/DriverDashboardSkeleton";

// Driver - Schedule
export { default as ScheduleControls } from "./driver/schedule/ScheduleControls";
export type {
  ScheduleControlsProps,
  ScheduleView,
} from "./driver/schedule/ScheduleControls";
export { default as AvailabilityModal } from "./driver/schedule/AvailabilityModal";
export type { AvailabilityModalProps } from "./driver/schedule/AvailabilityModal";
export { default as WeeklyCalendar } from "./driver/schedule/WeeklyCalendar";
export type { WeeklyCalendarProps } from "./driver/schedule/WeeklyCalendar";
export { default as AgendaBookingCard } from "./driver/schedule/AgendaBookingCard";
export type {
  AgendaBookingCardProps,
  AgendaBooking,
} from "./driver/schedule/AgendaBookingCard";

// Driver - Messages
export { default as DriverConversationListItem } from "./driver/messages/ConversationListItem";
export type { ConversationListItemProps as DriverConversationListItemProps } from "./driver/messages/ConversationListItem";
export { default as DriverChatWindow } from "./driver/messages/ChatWindow";
export type {
  ChatWindowProps as DriverChatWindowProps,
  Message as DriverMessage,
  ConversationDetail as DriverConversationDetail,
} from "./driver/messages/ChatWindow";

// Driver - Earnings
export { default as BalanceCard } from "./driver/earnings/BalanceCard";
export type { BalanceCardProps } from "./driver/earnings/BalanceCard";
export { default as EarningsDashboardClient } from "./driver/earnings/EarningsDashboardClient";
export type {
  EarningsDashboardClientProps,
  Transaction,
} from "./driver/earnings/EarningsDashboardClient";
export { default as PayoutListItem } from "./driver/earnings/PayoutListItem";
export type { PayoutListItemProps } from "./driver/earnings/PayoutListItem";
export { default as BankAccountForm } from "./driver/earnings/BankAccountForm";
export type {
  BankAccountFormProps,
  BankAccountData,
} from "./driver/earnings/BankAccountForm";

// Driver - Profile
export { default as DriverNotificationToggles } from "./driver/profile/DriverNotificationToggles";
export type { DriverNotificationTogglesProps } from "./driver/profile/DriverNotificationToggles";

// Driver - Notifications
export { default as NotificationPermissionCard } from "./driver/notifications/NotificationPermissionCard";
export type { NotificationPermissionCardProps } from "./driver/notifications/NotificationPermissionCard";

export { default as DriverOnboardingTour } from "./driver/DriverOnboardingTour";
export type { DriverOnboardingTourProps } from "./driver/DriverOnboardingTour";

export { default as InterviewRequestsPanel } from "./driver/placement/InterviewRequestsPanel";
export type { InterviewRequestsPanelProps } from "./driver/placement/InterviewRequestsPanel";
export { default as HireRequestsPanel } from "./driver/placement/HireRequestsPanel";
export type { HireRequestsPanelProps } from "./driver/placement/HireRequestsPanel";

export { default as PartnerSidebar } from "./partner/PartnerSidebar";
export type { PartnerSidebarProps } from "./partner/PartnerSidebar";

export { default as PartnerOnboardingTour } from "./partner/PartnerOnboardingTour";
export type { PartnerOnboardingTourProps } from "./partner/PartnerOnboardingTour";

export { default as PartnerNotificationToggles } from "./partner/profile/PartnerNotificationToggles";
export type { PartnerNotificationTogglesProps } from "./partner/profile/PartnerNotificationToggles";

export { default as PartnerNotificationPermissionCard } from "./partner/notifications/NotificationPermissionCard";
export type { PartnerNotificationPermissionCardProps } from "./partner/notifications/NotificationPermissionCard";

// Admin - Dashboard
export { AdminHeader } from "./admin/AdminHeader";
export { AdminSidebar } from "./admin/AdminSidebar";
export type { AdminSidebarProps } from "./admin/AdminSidebar";

export { default as AdminOnboardingTour } from "./admin/AdminOnboardingTour";
export type { AdminOnboardingTourProps } from "./admin/AdminOnboardingTour";
export { StatCard } from "./admin/StatCard";
export type { StatCardProps } from "./admin/StatCard";
export { DashboardWelcome } from "./admin/DashboardWelcome";
export type { DashboardWelcomeProps } from "./admin/DashboardWelcome";
export { KeyMetrics } from "./admin/KeyMetrics";
export type { KeyMetricsProps } from "./admin/KeyMetrics";
export { RecentActivity } from "./admin/RecentActivity";
export type { RecentActivityProps } from "./admin/RecentActivity";
export { BookingsOverTime } from "./admin/BookingsOverTime";
export type { BookingsOverTimeProps } from "./admin/BookingsOverTime";
export { TripLifecycleFunnel } from "./admin/TripLifecycleFunnel";
export type { TripLifecycleFunnelProps } from "./admin/TripLifecycleFunnel";
export { CancellationReasons } from "./admin/CancellationReasons";
export type { CancellationReasonsProps } from "./admin/CancellationReasons";
export { RevenueByDay } from "./admin/RevenueByDay";
export type { RevenueByDayProps } from "./admin/RevenueByDay";
export { SupportMetrics } from "./admin/SupportMetrics";
export type { SupportMetricsProps } from "./admin/SupportMetrics";
export { SupportHealthCard } from "./admin/SupportHealthCard";
export type { SupportHealthCardProps } from "./admin/SupportHealthCard";

export { default as AdminNotificationPermissionCard } from "./admin/notifications/NotificationPermissionCard";
export type { AdminNotificationPermissionCardProps } from "./admin/notifications/NotificationPermissionCard";

export { default as FullTimeDriverKycCard } from "./fullTimeDriver/FullTimeDriverKycCard";
export type { FullTimeDriverKycCardProps } from "./fullTimeDriver/FullTimeDriverKycCard";

// Full-Time Driver - New Components
export { default as ApplicationStepper } from "./fullTimeDriver/ApplicationStepper";
export type {
  ApplicationStepperProps,
  ApplicationStep,
} from "./fullTimeDriver/ApplicationStepper";
export { default as IdentityVerificationCard } from "./fullTimeDriver/IdentityVerificationCard";
export type { IdentityVerificationCardProps } from "./fullTimeDriver/IdentityVerificationCard";
export { default as ApplicationChecklist } from "./fullTimeDriver/ApplicationChecklist";
export type {
  ApplicationChecklistProps,
  ChecklistItem,
} from "./fullTimeDriver/ApplicationChecklist";
export { default as DocumentCard } from "./fullTimeDriver/DocumentCard";
export type { DocumentCardProps } from "./fullTimeDriver/DocumentCard";
export { default as ProfileMenu } from "./fullTimeDriver/ProfileMenu";
export type {
  ProfileMenuProps,
  ProfileMenuSection,
  ProfileMenuItem,
} from "./fullTimeDriver/ProfileMenu";
export { default as FullTimeDriverNotificationToggles } from "./fullTimeDriver/FullTimeDriverNotificationToggles";
export type { FullTimeDriverNotificationTogglesProps } from "./fullTimeDriver/FullTimeDriverNotificationToggles";
export { default as FullTimeDriverNotificationPermissionCard } from "./fullTimeDriver/notifications/NotificationPermissionCard";
export type { FullTimeDriverNotificationPermissionCardProps } from "./fullTimeDriver/notifications/NotificationPermissionCard";
export { default as WelcomeBanner } from "./fullTimeDriver/WelcomeBanner";
export type { WelcomeBannerProps } from "./fullTimeDriver/WelcomeBanner";
export { default as ApplicationStatusCard } from "./fullTimeDriver/ApplicationStatusCard";
export type {
  ApplicationStatusCardProps,
  ApplicationStatusType,
} from "./fullTimeDriver/ApplicationStatusCard";
