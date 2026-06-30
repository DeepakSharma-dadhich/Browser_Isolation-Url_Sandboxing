import React from 'react'
import TopBanner from '../Components/TopBanner'
import DisasterRecoSolution from '../Components/DisasterRecoSolution'
import RelatedDisasterSolution from '../Components/RelatedDisasterSolution'
import Footer from '../Components/Footer';

const DisasterSolution = () => {
  return (
    <>
      <TopBanner text="Disaster Recovery"/>
      <DisasterRecoSolution/>
      <RelatedDisasterSolution/>
      <Footer/>
    </>
  )
}

export default DisasterSolution
