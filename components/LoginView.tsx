

import React, { useState, useEffect } from 'react';
import { getDistrictNames, getDistrictData, District } from '../data/locationService';

interface LoginViewProps {
  onLogin: (details: { name: string; email: string; district: string; panchayat: string; village: string; street: string; }) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [districts, setDistricts] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);
  const [selectedDistrictData, setSelectedDistrictData] = useState<District | null>(null);

  const [district, setDistrict] = useState('');
  const [panchayat, setPanchayat] = useState('');
  const [village, setVillage] = useState('');
  
  const [street, setStreet] = useState('');

  useEffect(() => {
    getDistrictNames().then(names => {
        setDistricts(names);
        if (names.length > 0) setDistrict(names[0]);
    });
  }, []);

  useEffect(() => {
    if (!district) {
        setSelectedDistrictData(null);
        return;
    }
    getDistrictData(district).then(data => {
        setSelectedDistrictData(data);
    });
  }, [district]);

  useEffect(() => {
    const panchayatNames = selectedDistrictData?.panchayats?.map(p => p.name) || [];
    setPanchayats(panchayatNames);
    if (panchayatNames.length > 0) {
        setPanchayat(panchayatNames[0]);
    } else {
        setPanchayat('');
    }
  }, [selectedDistrictData]);

  useEffect(() => {
    const selectedPanchayat = selectedDistrictData?.panchayats?.find(p => p.name === panchayat);
    const villageNames = selectedPanchayat?.villages || [];
    setVillages(villageNames);
    if (villageNames.length > 0) {
        setVillage(villageNames[0]);
    } else {
        setVillage('');
    }
  }, [panchayat, selectedDistrictData]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && street) {
      onLogin({ name, email, district, panchayat, village, street });
    } else {
        alert("Please fill in all the required fields.");
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400 mb-2">CivicGuard AI</h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">Welcome back! Please login to your account.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input 
              id="name" 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" 
              placeholder="Enter your full name"
              required 
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email / Phone</label>
            <input 
              id="email" 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" 
              placeholder="Enter your email or phone"
              required 
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">OTP / Password</label>
            <input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" 
              placeholder="Enter your password or OTP"
              required 
            />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Select Your Location</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700 dark:text-gray-300">District</label>
                <select id="district" value={district} onChange={e => setDistrict(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700">
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="panchayat" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Panchayat</label>
                <select id="panchayat" value={panchayat} onChange={e => setPanchayat(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" disabled={panchayats.length === 0}>
                  {panchayats.length > 0 ? panchayats.map(p => <option key={p} value={p}>{p}</option>) : <option>Not applicable</option>}
                </select>
              </div>
              <div>
                <label htmlFor="village" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Village</label>
                <select id="village" value={village} onChange={e => setVillage(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" disabled={villages.length === 0}>
                  {villages.length > 0 ? villages.map(v => <option key={v} value={v}>{v}</option>) : <option>Not applicable</option>}
                </select>
              </div>
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Street / Area</label>
                <input 
                  id="street" 
                  type="text" 
                  value={street} 
                  onChange={e => setStreet(e.target.value)}
                  className="mt-1 block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" 
                  placeholder="Enter your street or area name"
                  required 
                />
              </div>
            </div>
          </div>
          
          <button type="submit" className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;