import React from 'react'
import Hero from '../Components/Hero'
import WhoAreWe from '../Components/WhoAreWe'
// import OurSolutions from '../Components/OurSolutions'
import OurServices from '../Components/OurServices'
import SolutionsOur from '../Components/SolutionsOur'
import OurCustomers from '../Components/OurCustomers'
// import WhatClientsSay from '../Components/WhatClientsSay'
// import OurTeam from '../Components/OurTeam'
import Footer from '../Components/Footer'
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const Home = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#who-we-are") {
      const section = document.getElementById("who-we-are");

      if (section) {
        setTimeout(() => {
          section.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }
    }
  }, [location]);
  return (
    <>
      <Hero/>
      <WhoAreWe/>
      {/* <OurSolutions/> */}
      <OurServices/>
      <SolutionsOur/>
      <OurCustomers/>
      {/* <WhatClientsSay/> */}
      {/* <OurTeam/> */}
      <Footer/>
    </>
  )
}

export default Home
