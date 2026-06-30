import React from 'react'
import OurServices from '../Components/OurServices'
import TopBanner from '../Components/TopBanner'
import Footer from '../Components/Footer'


const Services = () => {
  return (
    <>
      <TopBanner text="Our Services"/>
      <OurServices showHeading={false}/>
      <Footer/>
    </>
  )
}

export default Services