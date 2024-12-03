import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';
import MessageQueuePopup from '../components/MessageQueuePopup';
import greenApi from '../utils/greenApi';

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalMessages: 0,
    pendingMessages: 0,
    successRate: 0,
    recentActivity: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const incomingMessages = await greenApi.getLastIncomingMessages();
        const outgoingMessages = await greenApi.getLastOutgoingMessages();
        const queue = greenApi.getQueue();

        setStats({
          totalMessages: incomingMessages.length + outgoingMessages.length,
          pendingMessages: queue.length,
          successRate: calculateSuccessRate(outgoingMessages),
          recentActivity: [...incomingMessages, ...outgoingMessages]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // רענון כל 30 שניות

    return () => clearInterval(interval);
  }, []);

  const calculateSuccessRate = (messages) => {
    if (!messages.length) return 0;
    const successful = messages.filter(m => m.status === 'delivered' || m.status === 'read').length;
    return Math.round((successful / messages.length) * 100);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">דשבורד</h1>
          
          {/* כרטיסי סטטיסטיקה */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow-lg rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <dt className="text-sm font-medium text-gray-500">סה"כ הודעות</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalMessages}</dd>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <dt className="text-sm font-medium text-gray-500">הודעות בהמתנה</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.pendingMessages}</dd>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <dt className="text-sm font-medium text-gray-500">אחוז הצלחה</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.successRate}%</dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* פעילות אחרונה */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">פעילות אחרונה</h2>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {stats.recentActivity.map((activity, index) => (
                  <li key={index} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        activity.type === 'incoming' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <svg className={`h-5 w-5 ${
                          activity.type === 'incoming' ? 'text-green-600' : 'text-blue-600'
                        }`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {activity.type === 'incoming' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 3l-8 8-8-8" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 21l8-8 8 8" />
                          )}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.type === 'incoming' ? 'הודעה נכנסת' : 'הודעה יוצאת'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {new Date(activity.timestamp * 1000).toLocaleString('he-IL')}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.status && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            activity.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            activity.status === 'read' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <MessageQueuePopup />
    </Layout>
  );
} 