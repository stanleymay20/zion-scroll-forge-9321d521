import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { StatsBand } from "@/components/landing/StatsBand";
import { FacultiesSection } from "@/components/FacultiesSection";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { JourneySection } from "@/components/landing/JourneySection";
import { PrayerSection } from "@/components/PrayerSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>ScrollUniversity — Christ-Centered, AI-Supported Learning</title>
        <meta
          name="description"
          content="Explore structured programmes, AI-supported study, governed learning content, spiritual formation, and public academic-status information at ScrollUniversity."
        />
        <meta property="og:title" content="ScrollUniversity — Christ-Centered, AI-Supported Learning" />
        <meta
          property="og:description"
          content="Discover ScrollUniversity programmes, current course pathways, AI-supported study, spiritual formation, and public academic-status information."
        />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#5C1F2A" />
        <link rel="canonical" href="https://scrolluniversity.org/" />
      </Helmet>

      <Header />
      <main>
        <HeroSection />
        <StatsBand />
        <FacultiesSection />
        <CapabilitiesSection />
        <JourneySection />
        <PrayerSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
