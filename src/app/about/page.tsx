import type { Metadata } from "next";
import { MissionSection, CoreValuesSection } from "../../../components";

export const metadata: Metadata = {
  title: "About Us | RideOn Nigeria",
  description:
    "Learn about RideOn's mission to redefine mobility in Nigeria. Connecting customers, drivers, partners, and businesses through safe, reliable, and professional transportation.",
};

const AboutPage = () => {
  return (
    <main>
      <MissionSection />
      <CoreValuesSection />
    </main>
  );
};

export default AboutPage;
