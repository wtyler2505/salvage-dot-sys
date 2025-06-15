import React, { useState } from 'react';
import { Lightbulb, Loader2, Zap, Clock, AlertTriangle, Star, Plus, Shuffle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useParts } from '@/hooks/api/useParts';
import { useCreateProject } from '@/hooks/api/useProjects';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';

interface ProjectIdea {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  estimated_time: string;
  required_parts: string[];
  optional_parts: string[];
  skills_learned: string[];
  safety_notes: string[];
  build_steps: string[];
  variations: string[];
  why_cool: string;
}

interface GenerationResult {
  projects: ProjectIdea[];
  general_advice: string;
  parts_shopping: string[];
  generation_metadata: any;
}

interface ProjectGeneratorProps {
  onProjectGenerated?: (project: ProjectIdea) => void;
}

export const ProjectGenerator: React.FC<ProjectGeneratorProps> = ({ onProjectGenerated }) => {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [projectType, setProjectType] = useState('any');
  const [timeAvailable, setTimeAvailable] = useState('any');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProjects, setGeneratedProjects] = useState<GenerationResult | null>(null);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);

  const { data: partsData } = useParts();
  const createProject = useCreateProject();
  const { success, error } = useToast();

  const availableParts = partsData?.parts?.filter(p => p.is_available) || [];

  const handlePartToggle = (partId: string) => {
    setSelectedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const handleGenerateProjects = async () => {
    setIsGenerating(true);
    setGeneratedProjects(null);

    try {
      const response = await api.aiGenerateProject({
        selected_parts: selectedParts,
        preferences: {
          additional_context: additionalContext
        },
        difficulty,
        project_type: projectType,
        time_available: timeAvailable
      });

      setGeneratedProjects(response);
      success('Project ideas generated!', `Got ${response.projects.length} awesome ideas for you`);

    } catch (err) {
      console.error('Project generation error:', err);
      error('Failed to generate projects', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateProject = async (projectIdea: ProjectIdea) => {
    try {
      await createProject.mutateAsync({
        name: projectIdea.name,
        description: projectIdea.description,
        difficulty_level: getDifficultyLevel(projectIdea.difficulty),
        instructions: projectIdea.build_steps.join('\n\n'),
        status: 'idea',
        ai_generated: true,
        ai_prompt: `Generated from parts: ${selectedParts.length} selected parts`,
        notes: `Skills to learn: ${projectIdea.skills_learned.join(', ')}`,
        metadata: {
          required_parts: projectIdea.required_parts,
          optional_parts: projectIdea.optional_parts,
          safety_notes: projectIdea.safety_notes,
          variations: projectIdea.variations,
          why_cool: projectIdea.why_cool,
          estimated_time: projectIdea.estimated_time
        }
      });

      onProjectGenerated?.(projectIdea);
      success('Project created!', `"${projectIdea.name}" added to your projects`);

    } catch (err) {
      // Error handled by hook
    }
  };

  const getDifficultyLevel = (difficulty: string): number => {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      case 'expert': return 4;
      default: return 2;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-cyber-green';
      case 'medium': return 'text-cyber-cyan';
      case 'hard': return 'text-cyber-orange';
      case 'expert': return 'text-cyber-magenta';
      default: return 'text-text-muted';
    }
  };

  const difficultyOptions = [
    { value: 'easy', label: 'Easy', desc: 'Simple builds, basic skills' },
    { value: 'medium', label: 'Medium', desc: 'Some experience helpful' },
    { value: 'hard', label: 'Hard', desc: 'Advanced techniques required' },
    { value: 'expert', label: 'Expert', desc: 'Professional-level project' }
  ];

  const projectTypeOptions = [
    { value: 'any', label: 'Any Project' },
    { value: 'utility', label: 'Utility/Tool' },
    { value: 'gadget', label: 'Cool Gadget' },
    { value: 'art', label: 'Art/Display' },
    { value: 'automation', label: 'Home Automation' },
    { value: 'sensor', label: 'Sensor Project' },
    { value: 'audio', label: 'Audio/Music' },
    { value: 'lighting', label: 'Lighting Effects' },
    { value: 'robotics', label: 'Robotics/Movement' }
  ];

  const timeOptions = [
    { value: 'any', label: 'Any Time' },
    { value: '1-2 hours', label: '1-2 Hours' },
    { value: 'half day', label: 'Half Day' },
    { value: 'full day', label: 'Full Day' },
    { value: 'weekend', label: 'Weekend Project' },
    { value: 'week+', label: 'Week or More' }
  ];

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-bg-primary border border-cyber-green/30 rounded-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="w-5 h-5 text-cyber-green" />
          <h3 className="text-lg font-semibold text-cyber-green font-mono uppercase tracking-wider">AI PROJECT GENERATOR</h3>
        </div>

        <div className="space-y-4">
          {/* Part Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-2">
              SELECT PARTS ({selectedParts.length} SELECTED)
            </label>
            <div className="max-h-40 overflow-y-auto border border-text-muted/30 rounded-sm p-2 bg-bg-secondary scanning">
              {availableParts.length === 0 ? (
                <p className="text-text-muted text-sm font-mono">NO AVAILABLE PARTS FOUND. ADD SOME PARTS FIRST!</p>
              ) : (
                <div className="space-y-2">
                  {availableParts.map(part => (
                    <label key={part.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedParts.includes(part.id)}
                        onChange={() => handlePartToggle(part.id)}
                        className="w-4 h-4 text-cyber-green bg-bg-primary border-text-muted/30 rounded focus:ring-cyber-green"
                      />
                      <span className="text-text-primary text-sm font-mono">
                        {part.name} 
                        <span className="text-text-muted">
                          {part.category && ` (${part.category})`} - QTY: {part.quantity}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedParts.length === 0 && (
              <p className="text-xs text-text-muted mt-1 font-mono">
                LEAVE EMPTY TO GENERATE IDEAS FROM ALL AVAILABLE PARTS
              </p>
            )}
          </div>

          {/* Project Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-2">DIFFICULTY</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="cyber-input w-full"
              >
                {difficultyOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-bg-secondary text-text-primary">
                    {option.label.toUpperCase()} - {option.desc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-2">PROJECT TYPE</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="cyber-input w-full"
              >
                {projectTypeOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-bg-secondary text-text-primary">
                    {option.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-2">TIME AVAILABLE</label>
              <select
                value={timeAvailable}
                onChange={(e) => setTimeAvailable(e.target.value)}
                className="cyber-input w-full"
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-bg-secondary text-text-primary">
                    {option.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <label className="block text-sm font-medium text-text-secondary font-mono uppercase tracking-wider mb-2">
              ADDITIONAL CONTEXT (OPTIONAL)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g., I want to learn about microcontrollers, or I need something for my workshop"
              rows={2}
              className="cyber-terminal w-full resize-none"
            />
            <p className="text-xs text-text-muted mt-1 font-mono">
              TELL THE AI WHAT YOU'RE INTERESTED IN LEARNING
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateProjects}
            loading={isGenerating}
            disabled={isGenerating}
            className="w-full"
            icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            glow
            pulse
          >
            {isGenerating ? 'GENERATING IDEAS...' : 'GENERATE PROJECT IDEAS'}
          </Button>
        </div>
      </div>

      {/* Generated Projects */}
      {generatedProjects && (
        <div className="space-y-6">
          {/* General Advice */}
          {generatedProjects.general_advice && (
            <div className="bg-cyber-cyan/10 border border-cyber-cyan/50 rounded-sm p-4 scanning">
              <h4 className="font-medium text-cyber-cyan mb-2 font-mono uppercase tracking-wider flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                AI ADVICE
              </h4>
              <p className="text-text-primary text-sm font-mono">{generatedProjects.general_advice}</p>
            </div>
          )}

          {/* Project Ideas */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-text-primary font-mono uppercase tracking-wider">
              GENERATED PROJECT IDEAS ({generatedProjects.projects.length})
            </h3>
            
            {generatedProjects.projects.map((project, index) => (
              <div key={index} className="cyber-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-text-primary font-mono mb-2">{project.name}</h4>
                    <p className="text-text-secondary mb-3">{project.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Star className={`w-4 h-4 ${getDifficultyColor(project.difficulty)}`} />
                        <span className={`${getDifficultyColor(project.difficulty)} font-mono uppercase`}>
                          {project.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-text-muted" />
                        <span className="text-text-muted font-mono">{project.estimated_time}</span>
                      </div>
                      {project.safety_notes.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="w-4 h-4 text-cyber-orange" />
                          <span className="text-cyber-orange font-mono">SAFETY NOTES</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedProject(expandedProject === index ? null : index)}
                    >
                      {expandedProject === index ? 'HIDE DETAILS' : 'SHOW DETAILS'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCreateProject(project)}
                      loading={createProject.isPending}
                      icon={<Plus className="w-3 h-3" />}
                      glow
                    >
                      ADD TO PROJECTS
                    </Button>
                  </div>
                </div>

                {/* Why Cool */}
                <div className="bg-bg-tertiary p-3 rounded-sm mb-4 border border-text-muted/20">
                  <p className="text-text-primary text-sm font-medium font-mono">🔥 WHY THIS IS AWESOME:</p>
                  <p className="text-text-secondary text-sm mt-1">{project.why_cool}</p>
                </div>

                {/* Expanded Details */}
                {expandedProject === index && (
                  <div className="space-y-4 border-t border-text-muted/20 pt-4">
                    {/* Required Parts */}
                    <div>
                      <h5 className="font-medium text-text-primary mb-2 font-mono uppercase tracking-wider">REQUIRED PARTS</h5>
                      <div className="flex flex-wrap gap-2">
                        {project.required_parts.map((part, partIndex) => (
                          <span
                            key={partIndex}
                            className="px-2 py-1 bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan text-xs rounded-sm font-mono"
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Optional Parts */}
                    {project.optional_parts.length > 0 && (
                      <div>
                        <h5 className="font-medium text-text-primary mb-2 font-mono uppercase tracking-wider">OPTIONAL ENHANCEMENTS</h5>
                        <div className="flex flex-wrap gap-2">
                          {project.optional_parts.map((part, partIndex) => (
                            <span
                              key={partIndex}
                              className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded-sm font-mono border border-text-muted/30"
                            >
                              {part}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills Learned */}
                    <div>
                      <h5 className="font-medium text-text-primary mb-2 font-mono uppercase tracking-wider">SKILLS YOU'LL LEARN</h5>
                      <ul className="list-disc list-inside text-text-secondary text-sm space-y-1 font-mono">
                        {project.skills_learned.map((skill, skillIndex) => (
                          <li key={skillIndex}>{skill}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Build Steps */}
                    <div>
                      <h5 className="font-medium text-text-primary mb-2 font-mono uppercase tracking-wider">BUILD STEPS</h5>
                      <ol className="list-decimal list-inside text-text-secondary text-sm space-y-1 font-mono">
                        {project.build_steps.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Safety Notes */}
                    {project.safety_notes.length > 0 && (
                      <div className="bg-cyber-orange/10 border border-cyber-orange rounded-sm p-3">
                        <h5 className="font-medium text-cyber-orange mb-2 flex items-center font-mono uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          SAFETY NOTES
                        </h5>
                        <ul className="list-disc list-inside text-cyber-orange text-sm space-y-1 font-mono">
                          {project.safety_notes.map((note, noteIndex) => (
                            <li key={noteIndex}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Variations */}
                    {project.variations.length > 0 && (
                      <div>
                        <h5 className="font-medium text-text-primary mb-2 font-mono uppercase tracking-wider">COOL VARIATIONS</h5>
                        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1 font-mono">
                          {project.variations.map((variation, varIndex) => (
                            <li key={varIndex}>{variation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Parts Shopping Suggestions */}
          {generatedProjects.parts_shopping && generatedProjects.parts_shopping.length > 0 && (
            <div className="cyber-card">
              <h4 className="font-medium text-text-primary mb-2 flex items-center font-mono uppercase tracking-wider">
                <Shuffle className="w-4 h-4 mr-2 text-cyber-magenta" />
                PARTS TO CONSIDER BUYING
              </h4>
              <div className="flex flex-wrap gap-2">
                {generatedProjects.parts_shopping.map((part, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta text-sm rounded-sm font-mono"
                  >
                    {part}
                  </span>
                ))}
              </div>
              <p className="text-text-muted text-xs mt-2 font-mono">
                ADDING THESE PARTS WOULD UNLOCK EVEN MORE PROJECT POSSIBILITIES!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};