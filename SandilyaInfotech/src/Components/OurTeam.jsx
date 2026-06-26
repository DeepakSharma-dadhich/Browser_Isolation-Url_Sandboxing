import React from "react";
import team1 from "../assets/Team1.jpg";
import team2 from "../assets/Team2.jpg";
import team3 from "../assets/Team3.jpg";

const OurTeam = () => {
  // Team dataset structured according to the screenshot profiles
  const teamMembers = [
    {
      name: "JOANNE WILLIAMS",
      role: "MANAGER",
      image: team1,
    },
    {
      name: "FRED BUSTER",
      role: "MANAGER",
      image: team2,
    },
    {
      name: "LISA HOFFMAN",
      role: "MANAGER",
      image: team3,
    },
  ];

  return (
    <section className="bg-[#fcfcfc] py-16 md:py-20">
      <div className="max-w-[1210px] mx-auto px-6 sm:px-8">
        {/* Section Heading */}
        <div className="text-center mb-16">
          <h2 className="text-[28px] md:text-[42px] font-bold text-[#222222] tracking-wide font-sans">
            Our team
          </h2>
          <div className="w-[120px] h-[1px] bg-[#4564da] mx-auto mt-4 mb-7"></div>
        </div>

        {/* Responsive Layout Grid Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {teamMembers.map((member, index) => (
            <div key={index} className="flex flex-col text-left">
              {/* Profile Image Frame Element */}
              <div className="w-full aspect-[7/3] sm:aspect-[1.15/1] overflow-hidden mb-5">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
                />
              </div>

              {/* Identity Headers */}
              <h3 className="text-black text-lg md:text-[21px] font-bold tracking-normal font-sans mb-1.5 uppercase">
                {member.name}
              </h3>
              <p className="text-[#a0a0a0] text-xs md:text-[13px] font-normal tracking-wide font-sans mb-6 uppercase">
                {member.role}
              </p>

              {/* Social Navigation Buttons Array */}
              <div className="flex items-center gap-1">
                {/* Facebook Button */}
                <a
                  href="#facebook"
                  className="w-7 h-7 bg-[#555555] hover:bg-[#3b5998] text-white flex items-center justify-center text-xs font-sans font-bold rounded-xs transition-colors duration-200"
                  aria-label={`${member.name} Facebook`}
                >
                  f
                </a>

                {/* Twitter Button */}
                <a
                  href="#twitter"
                  className="w-7 h-7 bg-[#555555] hover:bg-[#1da1f2] text-white flex items-center justify-center text-[10px] transition-colors duration-200 rounded-xs"
                  aria-label={`${member.name} Twitter`}
                >
                  {/* Clean standard inline bird/twitter shape path */}
                  <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>

                {/* Google Plus Button Indicator */}
                <a
                  href="#googleplus"
                  className="w-9 h-7 bg-[#555555] hover:bg-[#dd4b39] text-white flex items-center justify-center text-[10px] font-bold font-sans tracking-tight transition-colors duration-200 rounded-xs"
                  aria-label={`${member.name} Google Plus`}
                >
                  G+
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurTeam;
