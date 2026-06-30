import React from 'react'
import TopBanner from '../Components/TopBanner'
import StrategicTechnologyService from '../Components/StrategicTechnologyService';
import RelatedStrategicService from '../Components/RelatedStrategicService';
import Footer from '../Components/Footer';

const ConsultingService = () => {
  return (
    <>
        <TopBanner text="IT Consulting"/>
        <StrategicTechnologyService/>
        <RelatedStrategicService/>
        <Footer/>
    </>
  );
};

export default ConsultingService
