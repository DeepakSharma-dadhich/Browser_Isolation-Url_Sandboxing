import Navbar from "../components/Navbar/Navbar";
import TopBanner from "../components/TopBanner/TopBanner";
import Contact from "../components/Contact/Contact";
import FAQ from "../components/FAQ/FAQ";
import Resources from "../components/Resources/Resources";

export default function ContactPage() {
  return (
    <>
        <Navbar/>
        <TopBanner text="Contact Us" />
        <Contact />
        <FAQ/>
        <Resources/>
        
    </>
  );
}