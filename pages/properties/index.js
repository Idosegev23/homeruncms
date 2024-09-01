import React from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import PropertyList from '../../components/PropertyList';

export default function Properties() {
  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-500">נכסים</h1>
          <Link href="/add-property" 
                className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600 transition-colors">
            הוסף נכס חדש
          </Link>
        </div>
        <PropertyList />
      </div>
    </Layout>
  );
}