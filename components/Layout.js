// components/Layout.js
import Header from './Header';
import Footer from './Footer';
import MessageQueuePopup from './MessageQueuePopup';

const Layout = ({ children }) => {
  return (
    <div className="layout rtl">
      <Header />
      <main className="py-8">{children}</main>
      <Footer />
      
      {/* Popup for message queue, fixed to the side of the screen */}
      <MessageQueuePopup />
    </div>
  );
};

export default Layout;
