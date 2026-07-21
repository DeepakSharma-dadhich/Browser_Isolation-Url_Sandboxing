import React from 'react'
import Navbar from '../components/Navbar/Navbar'
import TopBanner from '../components/TopBanner/TopBanner'
import OurStory from '../components/OurStory/OurStory'

const About = () => {
  return (
    <>
        <Navbar/>
        <TopBanner text="About Us"/>
        <OurStory/>
    </>
  )
}

export default About
