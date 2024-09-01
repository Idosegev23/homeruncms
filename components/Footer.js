import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-black text-white py-4 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-center md:text-left mb-2 md:mb-0">
            כל הזכויות שמורות &copy; {new Date().getFullYear()} HomeRunCRM
          </p>
          <p className="text-center md:text-right">
            נבנה על ידי{' '}
            <span className="text-yellow-500 font-semibold">Triroars</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;