import Link from 'next/link';
import * as Icons from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkAuthentication } from '../utils/airtable';

const Header = () => {
  const menuItems = [
    { name: 'דף הבית', icon: 'Home', href: '/' },
    { name: 'לקוחות', icon: 'Users', href: '/customers' },
    { name: 'נכסים', icon: 'Building2', href: '/properties' },
    { name: "צ'אט", icon: 'MessageSquare', href: '/chat' },
    { name: 'הודעות נכנסות', icon: 'Inbox', href: '/chat/incoming-messages' },
    { name: 'הוספת לקוח', icon: 'UserPlus', href: '/add-customer' },
    { name: 'הוספת נכס', icon: 'BuildingPlus', href: '/add-property' },
  ];

  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = checkAuthentication();
    if (token) {
      try {
        const user = JSON.parse(atob(token.split('.')[1]));
        const email = user.email;
        const adminEmails = ['Shimi.Homerun@gmail.com', 'shimi.homerun@gmail.com', 'Triroars@gmail.com', 'triroars@gmail.com'];
        
        if (adminEmails.includes(email)) {
          setIsAdmin(true);
        }

        if (email.toLowerCase().includes('shimi.homerun@gmail.com')) {
          setUsername('היי שימי');
        } else if (email.toLowerCase().includes('meirbs.homerun@gmail.com')) {
          setUsername('היי מאיר');
        } else if (email.toLowerCase().includes('triroars@gmail.com')) {
          setUsername('היי עידו');
        } else {
          setUsername(`היי ${email.split('@')[0]}`);
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  return (
    <header className="bg-black p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-24 mr-4">
            <img
              src="https://images.cdn-files-a.com/uploads/8017269/400_65ad01f4b53e5.jpg"
              alt="Company Logo"
              className="w-full h-auto"
            />
          </div>
          <div>
            {username && <h2 className="text-yellow-500 text-lg">{username}</h2>}
            {isAdmin && <h3 className="text-yellow-500 text-sm">מנהל מערכת</h3>}
          </div>
        </div>
        <nav>
          <ul className="flex flex-wrap justify-end gap-2">
            {menuItems.map((item, index) => {
              const Icon = Icons[item.icon];
              return (
                <li key={index} className="button-container">
                  <Link href={item.href} passHref>
                    <button className="button">
                      {Icon && <Icon className="w-4 h-4 mr-1" />}
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
          width: 120px;
          height: 36px;
          font-size: 0.75rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #fbbf24;
          background-color: transparent;
          border: 1px solid #fbbf24;
          border-radius: 0.25rem;
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