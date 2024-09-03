import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { fetchCustomers, fetchProperties, checkAuthentication } from '../utils/airtable';
import greenApi from '../utils/greenApi';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

const CustomIcon = ({ svgPath }) => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={svgPath}></path>
  </svg>
);

const DashboardCard = ({ title, value, icon, color, isLoading }) => (
  <motion.div
    className={`bg-black shadow-2xl rounded-lg p-8 border-t-4 ${color}`}
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 400, damping: 10 }}
  >
    <div className="flex items-center">
      <div className={`w-12 h-12 ${color.replace('border-', 'bg-')} text-black rounded-full flex items-center justify-center`}>
        {icon}
      </div>
      <div className="ml-4 flex-grow">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <p className="text-4xl font-light text-white mt-2">{value}</p>
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
    incomingMessages: 40,
  });
  const [loading, setLoading] = useState(true);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const router = useRouter();

  const quotes = [
    "הצלחה לא נמדדת בכמה גבוה הגעת, אלא בכמה רחוק הגעת מהמקום שבו התחלת.",
    "העתיד שייך למי שמאמין ביופי חלומותיו.",
    "אל תחכה. הזמן לעולם לא יהיה בדיוק נכון.",
    "הדרך היחידה לעשות עבודה נהדרת היא לאהוב את מה שאתה עושה.",
    "כשאתה אומר לעצמך 'אני לא יכול לעשות את זה', תזכור שהגבולות שלך נקבעים על ידך בלבד.",
    "תאמין שאתה יכול, ואתה כבר בחצי הדרך.",
    "האומץ הוא לדעת לא לפחד.",
    "מה שאחרים חושבים עליך הוא לא עניינך.",
    "כישלון הוא לא סוף הדרך, אלא חלק מהדרך להצלחה.",
    "השינוי הוא בלתי נמנע, הצמיחה היא אופציונלית.",
    "אנחנו מה שאנחנו חושבים כל היום.",
    "הזמן הטוב ביותר לשתול עץ היה לפני 20 שנה. הזמן השני הכי טוב הוא עכשיו.",
    "החיים הם מה שקורה בזמן שאתה עסוק בלתכנן תוכניות אחרות.",
    "לעולם אל תוותר על חלום בגלל הזמן שזה ייקח להגשים אותו. הזמן יעבור בכל מקרה.",
    "היכולת להיות נוח עם הבלתי נודע היא המפתח להצלחה.",
    "הצלחה היא לא סופית, כישלון הוא לא קטלני: זה האומץ להמשיך שקובע."
  ];

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
        incomingMessages: lastIncomingMessages.length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setCurrentQuoteIndex(Math.floor(Math.random() * quotes.length));
    }
  };

  useEffect(() => {
    const token = checkAuthentication();
    if (!token) {
      router.push('/auth');
    } else {
      loadData();
    }
  }, []);

  const handleRefresh = async () => {
    greenApi.clearCache();
    await loadData();
  };

  const cardData = [
    { title: "סה\"כ נכסים", value: data.properties, color: "border-yellow-500", icon: <CustomIcon svgPath="M3 10h2l1 2h14l1-2h2M7 10V7a1 1 0 011-1h8a1 1 0 011 1v3M7 21h10v-3a1 1 0 00-1-1H8a1 1 0 00-1 1v3zM5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" /> },
    { title: "סה\"כ לקוחות", value: data.clients, color: "border-yellow-500", icon: <CustomIcon svgPath="M16 11c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM16 13c-1.1 0-2 .9-2 2v3h-4v-3c0-1.1-.9-2-2-2s-2 .9-2 2v3H5v-3c0-1.66 1.34-3 3-3h8c1.66 0 3 1.34 3 3v3h-3v-3c0-1.1-.9-2-2-2z" /> },
    { title: "הודעות שנשלחו ב-24 שעות האחרונות", value: data.sentMessages, color: "border-yellow-500", icon: <CustomIcon svgPath="M8 10h.01M12 10h.01M16 10h.01M21 16c0 .88-.39 1.67-1 2.22V19a1 1 0 01-1 1H5a1 1 0 01-1-1v-.78A2.99 2.99 0 013 16V7a1 1 0 011-1h16a1 1 0 011 1v9z" /> },
    { title: "הודעות שנכנסו ב-24 שעות האחרונות", value: data.incomingMessages, color: "border-yellow-500", icon: <CustomIcon svgPath="M13 16h-1v-4h-1m1-4h.01M21 12c0 4.418-3.582 8-8 8a8 8 0 110-16c4.418 0 8 3.582 8 8z" /> },
  ];

  return (
    <Layout>
      <div className="p-8 bg-black min-h-screen">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-semibold text-yellow-500">דשבורד</h1>
        </header>

        <div className="mb-4 flex justify-end">
          <button
            onClick={handleRefresh}
            className="bg-gradient-to-r from-yellow-500 to-white hover:from-white hover:to-yellow-500 text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 ease-in-out"
          >
            רענן נתונים
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="mt-12 bg-gradient-to-r from-black to-yellow-500 shadow-2xl rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">ציטוט השראה יומי</h2>
          <p className="text-xl text-white italic">
            {quotes[currentQuoteIndex]}
          </p>
        </div>
      </div>
    </Layout>
  );
}