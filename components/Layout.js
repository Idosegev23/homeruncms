import { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import MessageQueuePopup from './MessageQueuePopup';
import { checkAuthentication } from '../utils/airtable';

const Layout = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = checkAuthentication();
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="layout rtl">
      <Header />
      <main className="py-8">
        {isAuthenticated ? children : <p>אנא התחבר כדי לגשת לתוכן זה.</p>}
      </main>
      <Footer />
      
      {isAuthenticated && <MessageQueuePopup />}
    </div>
  );
};

export default Layout;