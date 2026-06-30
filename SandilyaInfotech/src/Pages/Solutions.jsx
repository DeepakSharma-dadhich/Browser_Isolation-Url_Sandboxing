import React from 'react'
import Navbar from "../components/Navbar/Navbar";
import TopBanner from '../Components/TopBanner';
import SolutionsOur from '../Components/SolutionsOur';
import Footer from '../Components/Footer';

const Solutions = () => {
  return (
    <>
      <TopBanner text=" Our Solutions" />
      <SolutionsOur showHeading={false}/>
      <Footer/>
    </>
  )
}

export default Solutions
