import React from 'react'
import TopBanner from '../Components/TopBanner'
import CloudMiSolution from '../Components/CloudMiSolution'
import RelatedCloudSolution from '../Components/RelatedCloudSolution'
import Footer from '../Components/Footer'

const CloudSolution = () => {
  return (
    <>
        <TopBanner text="Cloud Migration & Management"/>
        <CloudMiSolution/>
        <RelatedCloudSolution/>
        <Footer/>
    </>
  )
}

export default CloudSolution
