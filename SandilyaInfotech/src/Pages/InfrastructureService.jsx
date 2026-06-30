import React from 'react'
import TopBanner from '../Components/TopBanner'
import NetworkDesignService from '../Components/NetworkDesignService'
import RelatedNetworkDesign from '../Components/RelatedNetworkDesign'
import Footer from '../Components/Footer';

const InfrastructureService = () => {
  return (
    <>
        <TopBanner text="Infrastructure"/>
        <NetworkDesignService/>
        <RelatedNetworkDesign/>
        <Footer/>
    </>
  );
};

export default InfrastructureService
