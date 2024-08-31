// pages/properties/index.js
import Layout from '../../components/Layout';
import PropertyList from '../../components/PropertyList';

export default function Properties() {
  return (
    <Layout>
      <h1>נכסים</h1>
      <PropertyList />
    </Layout>
  );
}