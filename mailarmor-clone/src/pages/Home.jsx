import AdvancedAnalytics from "../components/AdvancedAnalytics/AdvancedAnalytics";
import ApiIntegration from "../components/ApiIntegration/ApiIntegration";
import Approach from "../components/Approach/Approach";
import Comparison from "../components/Comparison/Comparison";
import CTA from "../components/CTA/CTA";
import Footer from "../components/Footer/Footer";
import Hero from "../components/Hero/Hero";
import IndiaArchitecture from "../components/IndiaArchitecture/IndiaArchitecture";
import Navbar from "../components/Navbar/Navbar";
import Research from "../components/Research/Research";
import Resources from "../components/Resources/Resources";
import Stats from "../components/Stats/Stats";
import Traditional from "../components/Traditional/Traditional";
import Trust from "../components/Trust/Trust";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero/>
      <Research/>
      <Approach/>
      <Traditional/>
      <Stats/>
      <ApiIntegration/>
      <AdvancedAnalytics/>
      <IndiaArchitecture/>
      <Comparison/>
      <Trust/>
      <CTA/>
      <Resources/>
      <Footer/>
      
    </>
  );
}