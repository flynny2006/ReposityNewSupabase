
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const BoongleLogo: React.FC<{ size?: string }> = ({ size = "text-5xl" }) => (
  <h1 className={`${size} font-bold tracking-tight`}>
    <span className="text-blue-600">B</span>
    <span className="text-red-500">o</span>
    <span className="text-yellow-400">o</span>
    <span className="text-blue-600">n</span>
    <span className="text-green-500">g</span>
    <span className="text-red-500">l</span>
    <span className="text-gray-700">e</span>
  </h1>
);

const MailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-12 h-12"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);


const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, primaryIdentity } = useAuth();

  const services = [
    { name: 'Boongle Mails', icon: <MailIcon className="w-12 h-12 text-blue-500" />, path: '/app/mails', available: true },
    { name: 'Boongle Drive', icon: <div className="w-12 h-12 bg-yellow-400 rounded-md flex items-center justify-center text-white font-bold text-2xl">D</div>, path: '#', available: false },
    { name: 'Boongle Meet', icon: <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center text-white font-bold text-2xl">M</div>, path: '#', available: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 flex flex-col">
      <header className="p-4 sm:p-6 flex justify-between items-center shadow-sm bg-white">
        <BoongleLogo size="text-3xl" />
        <div className="flex items-center space-x-4">
          {primaryIdentity && (
            <span className="text-sm text-gray-600 hidden sm:block">
              {primaryIdentity.display_name || primaryIdentity.email_address}
            </span>
          )}
           {user && (
            <img 
              src={`https://ui-avatars.com/api/?name=${user.email?.charAt(0)}&background=random&size=128`} 
              alt="User" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
            />
          )}
          <button
            onClick={signOut}
            className="px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-800">Welcome to Boongle!</h2>
          <p className="text-gray-600 mt-2 text-base sm:text-lg">Choose a service to get started.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
          {services.map((service) => (
            <button
              key={service.name}
              onClick={() => service.available && navigate(service.path)}
              disabled={!service.available}
              className={`p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center space-y-3
                          ${service.available ? 'cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none' : 'opacity-50 cursor-not-allowed'}`}
            >
              <div className="p-3 bg-blue-100 rounded-full">
                {service.icon}
              </div>
              <h3 className="text-xl font-medium text-gray-700">{service.name}</h3>
              {!service.available && <span className="text-xs text-red-500">(Coming Soon)</span>}
            </button>
          ))}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Boongle Inc. All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage;
