
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Zap, Code, Cloud } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="text-center py-12 md:py-24">
      <header className="mb-12">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-pink-500">
            Idea to Live Site
          </span>
          <br />
          in Seconds!
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
          QuickHost empowers you to deploy simple HTML, CSS, and JavaScript projects effortlessly. Focus on your code, we'll handle the hosting.
        </p>
      </header>

      <div className="mb-12">
        <Link to="/register">
          <Button size="lg" className="px-10 py-4 text-lg">
            Get Started Now
            <Zap className="ml-2 w-5 h-5" />
          </Button>
        </Link>
      </div>

      <section className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-primary-500/30 transition-shadow">
          <Code className="w-12 h-12 text-primary-400 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Live Code Editor</h3>
          <p className="text-gray-400">
            Edit your HTML, CSS, and JavaScript files directly in our intuitive online editor. See changes instantly.
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-primary-500/30 transition-shadow">
          <Zap className="w-12 h-12 text-primary-400 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Instant Deployment</h3>
          <p className="text-gray-400">
            Publish your site with a single click. Get a shareable link and show your work to the world immediately.
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-primary-500/30 transition-shadow">
          <Cloud className="w-12 h-12 text-primary-400 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Simple & Affordable</h3>
          <p className="text-gray-400">
            A straightforward credit system makes hosting accessible. Earn credits just by being active!
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
