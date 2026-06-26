import React from 'react'
import TopBanner from '../Components/TopBanner'
import DisasterRecoSolution from '../Components/DisasterRecoSolution'
import RelatedDisasterSolution from '../Components/RelatedDisasterSolution'

const DisasterSolution = () => {
  return (
    <>
      <TopBanner text="Disaster Recovery"/>
      <DisasterRecoSolution/>
      <RelatedDisasterSolution/>
    </>
  )
}

export default DisasterSolution
