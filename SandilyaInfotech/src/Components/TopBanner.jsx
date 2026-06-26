import React from 'react'
import banner from '../assets/TopBanner.png'

const TopBanner = ({ text }) => {
  return (
    <div
      className="relative mt-20 h-[300px] flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `url(${banner})`,
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-white text-5xl md:text-7xl font-bold">
          {text}
        </h1>
      </div>
    </div>
  )
}

export default TopBanner