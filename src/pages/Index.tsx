import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { StatsBand } from "@/components/landing/StatsBand";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { FacultiesSection } from "@/components/FacultiesSection";
import { JourneySection } from "@/components/landing/JourneySection";
import { FeaturedStoriesSection } from "@/components/landing/FeaturedStoriesSection";
import { UpcomingLecturesSection } from "@/components/landing/UpcomingLecturesSection";
import { VoicesSection } from "@/components/landing/VoicesSection";
import { ScrollGoldSection } from "@/components/ScrollGoldSection";
import { PrayerSection } from "@/components/PrayerSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>ScrollUniversity — Christ-Centered AI-Powered Learning</title>
        <meta
          name="description"
          content="A governed digital learning institution with structured programmes, AI-supported learning, verifiable learning records, spiritual formation, and public academic-transparency controls."
        />
        <meta property="og:title" content="ScrollUniversity — Christ-Centered AI-Powered Learning" />
        <meta
          property="og:description"
          content="Explore Christ-centered, AI-supported programmes across ScrollUniversity faculties. Accreditation and academic-authority claims are published only when verified evidence exists."
        />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#5C1F2A" />
        <link rel="canonical" href="https://scrolluniversity.org/" />
      </Helmet>
      <Header />
      <main>
        <HeroSection />
        <StatsBand />
        <CapabilitiesSection />
        <FeaturedStoriesSection />
        <FacultiesSection />
        <UpcomingLecturesSection />
        <JourneySection />
        <VoicesSection />
        <ScrollGoldSection />
        <PrayerSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
