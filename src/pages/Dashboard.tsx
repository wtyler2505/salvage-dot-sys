import React, { useState } from 'react';
import { Package, Brain, Wrench, TrendingUp, Plus, Search, Zap, Target, Clock, CheckCircle, Activity } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { QuickAddPart } from '@/components/parts/QuickAddPart';
import { useParts } from '@/hooks/api/useParts';
import { useProjects } from '@/hooks/api/useProjects';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color: string;
  subtitle?: string;
}) => (
  <div className="cyber-card group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-secondary text-sm font-mono uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-text-primary mt-1 font-mono">{value}</p>
        {subtitle && (
          <p className="text-sm text-text-muted mt-1">{subtitle}</p>
        )}
        {trend && (
          <p className="text-sm text-cyber-green mt-1 font-mono">{trend}</p>
        )}
      </div>
      <div className={`p-3 rounded-sm ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const QuickAction = ({ title, description, icon: Icon, onClick }: {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="bg-bg-secondary border border-cyber-cyan/20 rounded-sm p-4 text-left hover:bg-bg-tertiary hover:border-cyber-cyan hover:shadow-cyber transition-all duration-200 group"
  >
    <div className="flex items-start space-x-3">
      <div className="p-2 bg-cyber-cyan rounded-sm group-hover:bg-cyber-cyan/80 transition-colors">
        <Icon className="w-5 h-5 text-bg-primary" />
      </div>
      <div>
        <h3 className="font-medium text-text-primary font-mono uppercase tracking-wide">{title}</h3>
        <p className="text-sm text-text-muted mt-1">{description}</p>
      </div>
    </div>
  </button>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const { data: partsData } = useParts();
  const { data: projectsData } = useProjects();

  const parts = partsData?.parts || [];
  const projects = projectsData?.projects || [];

  const totalParts = parts.length;
  const availableParts = parts.filter(p => p.is_available).length;
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  const totalValue = parts.reduce((sum, part) => {
    return sum + (parseFloat(part.value_estimate) || 0) * (part.quantity || 1);
  }, 0);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary font-mono uppercase tracking-wider">Dashboard</h1>
          <p className="text-text-muted mt-1 font-mono">Status: <span className="text-cyber-green text-glow-green">ONLINE</span> | Your salvage empire awaits</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/parts')}
            icon={<Search className="w-4 h-4" />}
            glow
          >
            SEARCH PARTS
          </Button>
          <Button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            icon={<Plus className="w-4 h-4" />}
            glow
            pulse
          >
            ADD PART
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="TOTAL PARTS"
          value={totalParts}
          icon={Package}
          trend={`${availableParts} available`}
          color="bg-cyber-cyan"
          subtitle={`$${totalValue.toFixed(2)} total value`}
        />
        <StatCard
          title="TOTAL PROJECTS"
          value={totalProjects}
          icon={Wrench}
          trend={`${completedProjects} completed`}
          color="bg-cyber-green"
        />
        <StatCard
          title="AI PARTS"
          value={parts.filter(p => p.ai_identified).length}
          icon={Brain}
          trend={`${Math.round((parts.filter(p => p.ai_identified).length / totalParts) * 100) || 0}% AI identified`}
          color="bg-cyber-magenta"
        />
        <StatCard
          title="SUCCESS RATE"
          value={`${successRate}%`}
          icon={TrendingUp}
          trend={successRate > 70 ? "Great job!" : "Keep building!"}
          color="bg-cyber-orange"
          subtitle="Project completion rate"
        />
      </div>

      {/* Quick Add Section */}
      {showQuickAdd && (
        <div className="cyber-card">
          <QuickAddPart onSuccess={() => setShowQuickAdd(false)} />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4 font-mono uppercase tracking-wider">QUICK ACTIONS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="AI PART IDENTIFICATION"
            description="Upload a photo to identify mystery components"
            icon={Zap}
            onClick={() => navigate('/parts')}
          />
          <QuickAction
            title="GENERATE PROJECT"
            description="Get AI-powered project ideas from your parts"
            icon={Target}
            onClick={() => navigate('/projects')}
          />
          <QuickAction
            title="CHAT WITH AI"
            description="Ask your garage buddy about electronics"
            icon={Brain}
            onClick={() => navigate('/chat')}
          />
        </div>
      </div>

      {/* Getting Started Tips */}
      {totalParts < 5 && (
        <div className="bg-gradient-to-r from-cyber-cyan/20 to-cyber-magenta/20 border border-cyber-cyan rounded-sm p-6 text-text-primary scanning">
          <h2 className="text-xl font-semibold mb-2 font-mono uppercase tracking-wider flex items-center">
            <Zap className="w-5 h-5 mr-2 text-cyber-cyan" />
            SYSTEM INITIALIZATION TIPS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-start space-x-3">
              <Plus className="w-5 h-5 mt-1 flex-shrink-0 text-cyber-cyan" />
              <div>
                <p className="font-medium font-mono text-glow-cyan">ADD YOUR FIRST PARTS</p>
                <p className="text-sm opacity-90">Start cataloging your salvage components</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 mt-1 flex-shrink-0 text-cyber-cyan" />
              <div>
                <p className="font-medium font-mono text-glow-cyan">USE AI IDENTIFICATION</p>
                <p className="text-sm opacity-90">Upload photos of mystery components</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Target className="w-5 h-5 mt-1 flex-shrink-0 text-cyber-cyan" />
              <div>
                <p className="font-medium font-mono text-glow-cyan">GENERATE PROJECTS</p>
                <p className="text-sm opacity-90">Get creative ideas for your parts</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};