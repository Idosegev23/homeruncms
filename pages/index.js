import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { fetchCustomers, fetchProperties } from '../utils/airtable';
import greenApi from '../utils/greenApi';
import { motion } from 'framer-motion';

const DashboardCard = ({ title, value, icon, color, isLoading }) => (
  <motion.div
    className={`bg-white shadow-lg rounded-lg p-6 border-l-4 ${color}`}
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 400, damping: 10 }}
  >
    <div className="flex items-center">
      <div className={`w-12 h-12 ${color.replace('border-', 'bg-')} text-white rounded-full flex items-center justify-center`}>
        {icon}
      </div>
      <div className="ml-4 flex-grow">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <p className="text-3xl mt-2 font-bold">{value}</p>
        )}
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [data, setData] = useState({
    properties: 0,
    clients: 0,
    sentMessages: 120,
    readMessages: 90,
    incomingMessages: 40,
    unansweredMessages: 10,
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customers, properties, lastOutgoingMessages, lastIncomingMessages] = await Promise.all([
        fetchCustomers(),
        fetchProperties(),
        greenApi.getLastOutgoingMessages(1440),
        greenApi.getLastIncomingMessages(1440)
      ]);

      setData({
        properties: properties.length,
        clients: customers.length,
        sentMessages: lastOutgoingMessages.length,
        readMessages: 90, // TODO: להחליף בנתונים אמיתיים כשיהיו זמינים
        incomingMessages: lastIncomingMessages.length,
        unansweredMessages: 10, // TODO: להחליף בנתונים אמיתיים כשיהיו זמינים
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    greenApi.clearCache();
    await loadData();
  };

  const cardData = [
    { title: "סה\"כ נכסים", value: data.properties, color: "border-blue-500", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h2l1 2h14l1-2h2M7 10V7a1 1 0 011-1h8a1 1 0 011 1v3M7 21h10v-3a1 1 0 00-1-1H8a1 1 0 00-1 1v3zM5 10v10a1 1 0 001 1h12a1 1 0 001-1V10"></path></svg> },
    { title: "סה\"כ לקוחות", value: data.clients, color: "border-green-500", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2v3h-4v-3c0-1.1-.9-2-2-2s-2 .9-2 2v3H5v-3c0-1.66 1.34-3 3-3h8c1.66 0 3 1.34 3 3v3h-3v-3c0-1.1-.9-2-2-2z"></path></svg> },
    { title: "הודעות שנשלחו ב-24 שעות האחרונות", value: data.sentMessages, color: "border-yellow-500", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 .88-.39 1.67-1 2.22V19a1 1 0 01-1 1H5a1 1 0 01-1-1v-.78A2.99 2.99 0 013 16V7a1 1 0 011-1h16a1 1 0 011 1v9z"></path></svg> },
    { title: "הודעות שנקראו (בבנייה)", value: data.readMessages, color: "border-red-500", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4H7a2 2 0 110-4m5-8h.01M4 8h16M5 8V6a1 1 0 011-1h12a1 1 0 011 1v2M5 8v2m14-2v2m-6 8h.01"></path></svg> },
    { title: "הודעות שנכנסו ב-24 שעות האחרונות", value: data.incomingMessages, color: "border-purple-500", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12c0 4.418-3.582 8-8 8a8 8 0 110-16c4.418 0 8 3.582 8 8z"></path></svg> },
    { title: "הודעות ללא מענה (בבנייה)", value: data.unansweredMessages, color: "border-teal-500", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18m-6 8l6-8-6-8M9 4l-6 8 6 8"></path></svg> },
  ];
  
  return (
    <Layout>
      <div className="p-8 bg-gray-100 min-h-screen">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-semibold text-gray-800">דשבורד</h1>
        </header>

        <div className="mb-4 flex justify-end">
          <button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            רענן נתונים
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cardData.map((card, index) => (
            <DashboardCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              isLoading={loading}
            />
          ))}
        </div>

        {/* Motivational Quote Section */}
        <div className="mt-12 bg-white shadow-lg rounded-lg p-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">ציטוט השראה יומי</h2>
          <p className="text-xl text-gray-600 italic">
            "הצלחה היא לא סופית, כישלון הוא לא קטלני: זה האומץ להמשיך שקובע."
          </p>
          <p className="mt-2 text-gray-500">- וינסטון צ'רצ'יל</p>
        </div>
      </div>
    </Layout>
  );
}