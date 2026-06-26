import React from 'react'
import WhoAreWe from '../Components/WhoAreWe'
import TopBanner from '../Components/TopBanner'
import OurVision from '../Components/OurVision'
import FAQs from '../Components/FAQs'
import Footer from '../Components/Footer'

const About = () => {
  return (
    <>
      <TopBanner text="About Us"/>
      <WhoAreWe/>
      <OurVision/>
      <FAQs/>
      <Footer/>
    </>
  )
}

export default About
