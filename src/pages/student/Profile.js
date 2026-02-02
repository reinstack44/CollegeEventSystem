import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';

const Profile = () => {
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // Corrected: Fetching user from Supabase instead of Firebase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (!error) setStudent(data);
      }
    };
    fetchProfile();
  }, []);

  if (!student) return <div className="text-center py-20 font-bold text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-white text-center">
          <div className="w-24 h-24 bg-white text-blue-600 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-4 shadow-lg">
            {student.name ? student.name[0] : 'S'}
          </div>
          <h2 className="text-2xl font-bold">{student.name} {student.surname}</h2>
          <p className="opacity-80">{student.email}</p>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailCard label="URN Number" value={student.urn} />
          <DetailCard label="Contact" value={student.phone} />
          <DetailCard label="School" value={student.school} />
          <DetailCard label="Status" value="Verified Student ✅" />
        </div>
      </div>
    </div>
  );
};

const DetailCard = ({ label, value }) => (
  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="text-lg font-bold text-gray-800 mt-1">{value}</p>
  </div>
);

export default Profile;