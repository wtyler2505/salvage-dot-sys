import React from 'react';
import { BarChart3, TrendingUp, Package, Brain } from 'lucide-react';

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary font-mono uppercase tracking-wider">ANALYTICS</h1>
        <p className="text-text-muted mt-1 font-mono">Insights into your workshop activity</p>
      </div>

      {/* Coming Soon */}
      <div className="cyber-card text-center py-12">
        <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2 font-mono text-glow-cyan">ANALYTICS COMING SOON</h2>
        <p className="text-text-secondary max-w-md mx-auto font-mono">
          We're working on detailed analytics to help you understand your parts usage, 
          project success rates, and AI interaction patterns.
        </p>
        <div className="w-24 h-1 bg-cyber-cyan/50 mx-auto mt-6 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="bg-bg-secondary p-4 rounded-sm border border-cyber-cyan/20 text-text-secondary text-left">
            <Package className="w-5 h-5 text-cyber-cyan mb-2" />
            <p className="font-mono">PARTS USAGE TRACKING</p>
            <p className="text-sm text-text-muted mt-1">Track which components you use most frequently</p>
          </div>
          <div className="bg-bg-secondary p-4 rounded-sm border border-cyber-cyan/20 text-text-secondary text-left">
            <TrendingUp className="w-5 h-5 text-cyber-green mb-2" />
            <p className="font-mono">PROJECT SUCCESS METRICS</p>
            <p className="text-sm text-text-muted mt-1">Visualize your project completion patterns</p>
          </div>
          <div className="bg-bg-secondary p-4 rounded-sm border border-cyber-cyan/20 text-text-secondary text-left">
            <Brain className="w-5 h-5 text-cyber-magenta mb-2" />
            <p className="font-mono">AI INTERACTION STATS</p>
            <p className="text-sm text-text-muted mt-1">See how AI is helping your workshop flow</p>
          </div>
        </div>
      </div>
    </div>
  );
};