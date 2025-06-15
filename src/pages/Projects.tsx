import React, { useState } from 'react';
import { Wrench, Plus, Clock, CheckCircle, AlertCircle, Lightbulb, Target, Play } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ContextMenu } from '@/components/common/ContextMenu';
import { LoadingOverlay, SkeletonStats, SkeletonCard } from '@/components/common/LoadingStates';
import { ProjectGenerator } from '@/components/projects/ProjectGenerator';
import { Modal } from '@/components/common/Modal';

const ProjectCard = ({ title, description, status, difficulty, timeEstimate }: {
  title: string;
  description: string;
  status: 'idea' | 'in_progress' | 'completed' | 'failed';
  difficulty: string;
  timeEstimate: string;
}) => {
  const statusConfig = {
    idea: { color: 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan', icon: Lightbulb },
    in_progress: { color: 'bg-cyber-orange/20 text-cyber-orange border-cyber-orange', icon: Clock },
    completed: { color: 'bg-cyber-green/20 text-cyber-green border-cyber-green', icon: CheckCircle },
    failed: { color: 'bg-cyber-magenta/20 text-cyber-magenta border-cyber-magenta', icon: AlertCircle }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const contextMenuItems = [
    {
      id: 'view',
      label: 'View Project',
      icon: Target,
      onClick: () => console.log('View project')
    },
    {
      id: 'start',
      label: status === 'idea' ? 'Start Building' : 'Continue Building',
      icon: Play,
      onClick: () => console.log('Start/continue building'),
      disabled: status === 'completed'
    },
    {
      id: 'separator',
      separator: true,
      label: '',
      onClick: () => {}
    },
    {
      id: 'delete',
      label: 'Delete Project',
      icon: AlertCircle,
      onClick: () => console.log('Delete project'),
      destructive: true
    }
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div className="cyber-card hover-lift">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary font-mono">{title}</h3>
          <div className={`inline-flex items-center px-2 py-1 rounded-sm text-xs border ${config.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        
        <p className="text-text-secondary mb-4 line-clamp-2">{description}</p>
        
        <div className="flex items-center justify-between text-sm text-text-muted font-mono">
          <span>DIFFICULTY: {difficulty}</span>
          <span>EST. {timeEstimate}</span>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            VIEW DETAILS
          </Button>
          {status === 'idea' && (
            <Button size="sm" className="flex-1">
              START BUILDING
            </Button>
          )}
        </div>
      </div>
    </ContextMenu>
  );
};

export const Projects: React.FC = () => {
  const [showProjectGenerator, setShowProjectGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const projects = [
    {
      title: "LED Matrix Clock",
      description: "Build a retro-style digital clock using salvaged LED matrix displays and Arduino",
      status: "in_progress" as const,
      difficulty: "Medium",
      timeEstimate: "4-6 hours"
    },
    {
      title: "Smart Plant Monitor",
      description: "Create an IoT device to monitor soil moisture and light levels for plants",
      status: "idea" as const,
      difficulty: "Easy",
      timeEstimate: "2-3 hours"
    },
    {
      title: "Bluetooth Speaker",
      description: "Repurpose old speakers with Bluetooth module and amplifier circuit",
      status: "completed" as const,
      difficulty: "Hard",
      timeEstimate: "8-10 hours"
    },
    {
      title: "Temperature Logger",
      description: "Data logging device using temperature sensors and SD card storage",
      status: "failed" as const,
      difficulty: "Medium",
      timeEstimate: "3-4 hours"
    }
  ];

  return (
    <LoadingOverlay isLoading={isLoading} message="GENERATING PROJECT IDEAS...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary font-mono uppercase tracking-wider">Projects</h1>
            <p className="text-text-muted mt-1 font-mono">Build amazing things with your salvaged parts</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              icon={<Lightbulb className="w-4 h-4" />}
              onClick={() => setShowProjectGenerator(true)}
              glow
            >
              GENERATE PROJECT
            </Button>
            <Button 
              icon={<Plus className="w-4 h-4" />}
              glow
            >
              NEW PROJECT
            </Button>
          </div>
        </div>

        {/* Project Stats */}
        {isLoading ? (
          <SkeletonStats />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="cyber-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-mono uppercase tracking-wider">TOTAL PROJECTS</p>
                  <p className="text-2xl font-bold text-text-primary font-mono">12</p>
                </div>
                <div className="p-3 bg-cyber-cyan/20 rounded-sm">
                  <Wrench className="w-6 h-6 text-cyber-cyan" />
                </div>
              </div>
            </div>
            <div className="cyber-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-mono uppercase tracking-wider">IN PROGRESS</p>
                  <p className="text-2xl font-bold text-text-primary font-mono">3</p>
                </div>
                <div className="p-3 bg-cyber-orange/20 rounded-sm">
                  <Clock className="w-6 h-6 text-cyber-orange" />
                </div>
              </div>
            </div>
            <div className="cyber-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-mono uppercase tracking-wider">COMPLETED</p>
                  <p className="text-2xl font-bold text-text-primary font-mono">7</p>
                </div>
                <div className="p-3 bg-cyber-green/20 rounded-sm">
                  <CheckCircle className="w-6 h-6 text-cyber-green" />
                </div>
              </div>
            </div>
            <div className="cyber-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-mono uppercase tracking-wider">SUCCESS RATE</p>
                  <p className="text-2xl font-bold text-text-primary font-mono">78%</p>
                </div>
                <div className="p-3 bg-cyber-magenta/20 rounded-sm">
                  <Target className="w-6 h-6 text-cyber-magenta" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <ProjectCard key={index} {...project} />
            ))}
          </div>
        )}

        {/* Project Generator Modal */}
        <Modal
          isOpen={showProjectGenerator}
          onClose={() => setShowProjectGenerator(false)}
          title="AI PROJECT GENERATOR"
          size="xl"
          variant="terminal"
        >
          <ProjectGenerator
            onProjectGenerated={(project) => {
              console.log('Generated project:', project);
              setShowProjectGenerator(false);
            }}
          />
        </Modal>
      </div>
    </LoadingOverlay>
  );
};