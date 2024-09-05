import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Mail, Lock } from 'lucide-react';
import { handleAuthFlow, checkAuthentication } from '../utils/airtable';

export default function Auth() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = checkAuthentication();
    if (token) {
      router.push('/');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log(`Submitting form. Current step: ${step}`);

    try {
      let result;
      switch (step) {
        case 'email':
          result = await handleAuthFlow(email, null, null, 'email');
          break;
        case 'setPassword':
          result = await handleAuthFlow(email, password, confirmPassword, 'setPassword');
          break;
        case 'login':
          result = await handleAuthFlow(email, password, null, 'login');
          break;
        default:
          throw new Error(`Invalid step: ${step}`);
      }

      console.log('Auth flow result:', result);

      if (result.step) {
        setStep(result.step);
      } else if (result.token) {
        localStorage.setItem('authToken', result.token);
        router.push('/');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.');
    }
  };

  console.log(`Current step: ${step}`);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="border-4 border-yellow-500 p-8 rounded-lg shadow-lg max-w-md w-full">
        <form onSubmit={handleSubmit}>
          {step === 'email' && (
            <>
              <h1 className="text-2xl font-semibold text-yellow-500 text-center mb-6">הזינו את כתובת האימייל</h1>
              <div className="flex items-center mb-4">
                <Mail className="text-yellow-500 w-6 h-6 mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="אימייל"
                  className="w-full p-2 bg-transparent border-b border-yellow-500 text-yellow-500 outline-none"
                  required
                  autoComplete="username"
                />
              </div>
            </>
          )}

          {(step === 'setPassword' || step === 'login') && (
            <>
              <h1 className="text-2xl font-semibold text-yellow-500 text-center mb-6">
                {step === 'setPassword' ? 'צור סיסמה חדשה' : 'הזינו את הסיסמה'}
              </h1>
              <div className="flex items-center mb-4">
                <Lock className="text-yellow-500 w-6 h-6 mr-2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  className="w-full p-2 bg-transparent border-b border-yellow-500 text-yellow-500 outline-none"
                  required
                  autoComplete={step === 'setPassword' ? 'new-password' : 'current-password'}
                />
              </div>
              {step === 'setPassword' && (
                <div className="flex items-center mb-4">
                  <Lock className="text-yellow-500 w-6 h-6 mr-2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="אימות סיסמה"
                    className="w-full p-2 bg-transparent border-b border-yellow-500 text-yellow-500 outline-none"
                    required
                    autoComplete="new-password"
                  />
                </div>
              )}
            </>
          )}

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <button type="submit" className="bg-yellow-500 w-full text-black py-2 px-4 rounded-lg">
            {step === 'email' ? 'המשך' : step === 'setPassword' ? 'שמור והמשך' : 'התחבר'}
          </button>
        </form>
      </div>
    </div>
  );
}