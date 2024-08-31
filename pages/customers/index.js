// pages/customers/index.js
import Layout from '../../components/Layout';
import CustomerList from '../../components/CustomerList';

export default function Customers() {
  return (
    <Layout>
      <h1>לקוחות</h1>
      <CustomerList />
    </Layout>
  );
}