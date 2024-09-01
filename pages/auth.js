import { useState } from 'react';
import { useRouter } from 'next/router';
import { Mail, Lock } from 'lucide-react';
import { handleAuthFlow } from '../utils/airtable';

export default function Auth() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'הסיסמה חייבת להכיל לפחות 8 תווים.';
    }
    if (!hasUpperCase || !hasLowerCase) {
      return 'הסיסמה חייבת להכיל אותיות גדולות וקטנות.';
    }
    if (!hasNumber) {
      return 'הסיסמה חייבת להכיל לפחות מספר אחד.';
    }
    if (!hasSpecialChar) {
      return 'הסיסמה חייבת להכיל לפחות תו מיוחד אחד.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (step === 'setPassword' || step === 'login') {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    try {
      const result = await handleAuthFlow(email, password, confirmPassword, step);
      if (result.step) {
        setStep(result.step);
      } else if (result.token) {
        localStorage.setItem('authToken', result.token);
        router.push('/');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

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
                  placeholder="Email"
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
                  placeholder="Password"
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
                    placeholder="Confirm Password"
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