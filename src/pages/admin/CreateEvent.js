import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient'; 

const CreateEvent = () => {
  const [event, setEvent] = useState({ 
    title: '', 
    date: '', 
    venue: '', 
    description: '',
    school: '' 
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const schools = ["School of Engineering", "School of Law", "School of Management"];

  const handleChange = (e) => {
    setEvent({ ...event, [e.target.name]: e.target.value });
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Destructuring only 'error' to fix the ESLint warning
      const { error } = await supabase
        .from('events')
        .insert([
          { 
            title: event.title, 
            date: event.date, 
            venue: event.venue, 
            description: event.description,
            school_target: event.school 
          }
        ]);

      if (error) throw error;

      alert(`Success! "${event.title}" has been published.`);
      setEvent({ title: '', date: '', venue: '', description: '', school: '' });
      window.location.href = "/admin"; 

    } catch (error) {
      alert("Database Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Post New Event</h2>
        
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Event Title</label>
            <input 
              name="title" 
              value={event.title} 
              onChange={handleChange} 
              placeholder="e.g. Annual Tech Symposium" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              name="date" 
              type="date" 
              value={event.date} 
              onChange={handleChange} 
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
            <input 
              name="venue" 
              value={event.venue} 
              onChange={handleChange} 
              placeholder="College Auditorium" 
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
          </div>

          <select 
            name="school" 
            value={event.school} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
            required
          >
            <option value="">Select Target School</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <textarea 
            name="description" 
            value={event.description} 
            onChange={handleChange} 
            placeholder="Enter event details..." 
            className="w-full p-3 border rounded-lg h-32 outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full text-white py-3 rounded-lg font-bold transition-all ${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSubmitting ? 'Publishing...' : 'Publish Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;