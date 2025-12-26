// components/Footer.tsx
import React from 'react';
import { FaMapMarkerAlt, FaPhoneAlt, FaWhatsapp, FaFacebook, FaTiktok, FaInstagram } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-[#0f172a] text-white py-6 mt-auto">
      
      {/* Main Container */}
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 text-left items-start">
        
        {/* 1. Location Section */}
        <div className="flex flex-col items-start md:items-start">
          <h3 className="text-sm font-bold text-blue-400 mb-1 uppercase tracking-wider">Location</h3>
          <div className="flex items-start gap-2 text-gray-300 text-xs md:text-sm">
            <FaMapMarkerAlt className="text-red-500 text-lg mt-0.5" />
            <p>
              Embilipitiya Road,<br />
              Padalangala.
            </p>
          </div>
        </div>

        {/* 2. Contact Section */}
        <div className="flex flex-col items-start md:items-center">
          <h3 className="text-sm font-bold text-blue-400 mb-1 uppercase tracking-wider">Contact Us</h3>
          
          <div className="space-y-1 text-xs md:text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <FaPhoneAlt className="text-green-400 text-sm" />
              <a href="tel:+94743877234" className="hover:text-white transition">+94 74 387 7234</a>
            </div>

            <div className="flex items-center gap-2 text-gray-300">
              <FaWhatsapp className="text-green-500 text-base" />
              <a href="https://wa.me/94717356946" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                +94 71 735 6946
              </a>
            </div>
          </div>
        </div>

        {/* 3. Social Media Section */}
        <div className="flex flex-col items-start md:items-end">
          <h3 className="text-sm font-bold text-blue-400 mb-1 uppercase tracking-wider">Follow Us</h3>
          <p className="text-gray-400 text-[10px] md:text-xs mb-2">Find Out Our Latest Information</p>
          
          <div className="flex gap-3">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="bg-white p-1.5 rounded-full text-black hover:bg-black hover:text-white transition duration-300">
              <FaFacebook size={16} />
            </a>
            
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="bg-white p-1.5 rounded-full text-black hover:bg-black hover:text-white transition duration-300">
              <FaInstagram size={16} />
            </a>
          </div>
        </div>

      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-4 mx-6"></div>

      {/* Bottom Copyright & Credits  */}
      <div className="text-center text-gray-500 text-[10px] md:text-xs px-4 flex flex-col md:flex-row justify-between items-center container mx-auto">
        <p>&copy; {new Date().getFullYear()} Dighayu Medical Center.</p>
        
        <p className="mt-1 md:mt-0">
          Created by <span className="text-blue-400 font-semibold">Imal Wickrama Arachchi</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;