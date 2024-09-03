import '../styles/globals.css'
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { checkAuthentication } from '../utils/airtable';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const token = checkAuthentication();
    if (!token && router.pathname !== '/auth') {
      router.push('/auth');
    }
  }, [router.pathname]);

  return <Component {...pageProps} />
}

export default MyApp