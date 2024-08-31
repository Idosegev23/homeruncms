import Link from 'next/link';
import * as Icons from 'lucide-react';

const Header = () => {
  const menuItems = [
    { name: 'דף הבית', icon: 'Home', href: '/' },
    { name: 'לקוחות', icon: 'Users', href: '/customers' },
    { name: 'נכסים', icon: 'Building2', href: '/properties' },
    { name: "צ'אט", icon: 'MessageSquare', href: '/chat' },
    { name: 'הודעות נכנסות', icon: 'Inbox', href: '/chat/incoming-messages' }, // New item added here
    { name: 'הוספת לקוח', icon: 'UserPlus', href: '/add-customer' },
    { name: 'הוספת נכס', icon: 'BuildingPlus', href: '/add-property' },
  ];

  return (
    <header className="bg-black p-6">
      <div className="flex flex-col items-center max-w-7xl mx-auto">
        <div className="w-36 mb-8">
          <img
            src="https://images.cdn-files-a.com/uploads/8017269/400_65ad01f4b53e5.jpg"
            alt="Company Logo"
            className="w-full h-auto"
          />
        </div>
        <nav className="w-full">
          <ul className="flex flex-wrap justify-center gap-4">
            {menuItems.map((item, index) => {
              const Icon = Icons[item.icon];
              return (
                <li key={index} className="button-container">
                  <Link href={item.href} passHref>
                    <button className="button">
                      {Icon && <Icon className="w-5 h-5 mr-2" />}
                      <span className="button-text">{item.name}</span>
                      <span className="button-effect"></span>
                    </button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <style jsx>{`
        .button-container {
          position: relative;
          overflow: hidden;
        }
        .button {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 140px;
          height: 48px;
          font-size: 0.875rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #fbbf24;
          background-color: transparent;
          border: 2px solid #fbbf24;
          border-radius: 0.5rem;
          transition: color 0.3s ease;
          overflow: hidden;
        }
        .button:hover {
          color: black;
        }
        .button-text {
          position: relative;
          z-index: 2;
        }
        .button-effect {
          content: '';
          position: absolute;
          background: #fbbf24;
          bottom: 0;
          left: 0;
          right: 0;
          top: 100%;
          z-index: -1;
          transition: top 0.3s ease;
        }
        .button:hover .button-effect {
          top: 0;
        }
      `}</style>
    </header>
  );
};

export default Header;
