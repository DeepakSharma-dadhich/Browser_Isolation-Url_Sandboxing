import React from 'react'
import TopBanner from '../Components/TopBanner'
import NetworkDesignService from '../Components/NetworkDesignService'
import RelatedNetworkDesign from '../Components/RelatedNetworkDesign'

const InfrastructureService = () => {
  return (
    <>
        <TopBanner text="Infrastructure"/>
        <NetworkDesignService/>
        <RelatedNetworkDesign/>
    </>
  );
};

export default InfrastructureService
