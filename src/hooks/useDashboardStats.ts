import { useParts } from './api/useParts';
import { useProjects } from './api/useProjects';
import { useMemo } from 'react';

export const useDashboardStats = () => {
  const { data: partsData } = useParts();
  const { data: projectsData } = useProjects();

  const parts = partsData?.parts || [];
  const projects = projectsData?.projects || [];

  const stats = useMemo(() => {
    const totalParts = parts.length;
    const availableParts = parts.filter(p => p.is_available).length;
    const aiIdentifiedParts = parts.filter(p => p.ai_identified).length;
    
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => ['planning', 'building'].includes(p.status)).length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
    
    const totalValue = parts.reduce((sum, part) => {
      return sum + (parseFloat(part.value_estimate) || 0) * (part.quantity || 1);
    }, 0);

    const categoryCounts = parts.reduce((acc, part) => {
      const category = part.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentActivity = [
      ...parts.slice(-5).map(part => ({
        id: part.id,
        type: 'part' as const,
        action: 'Added',
        item: part.name,
        time: part.created_at,
        ai: part.ai_identified
      })),
      ...projects.slice(-3).map(project => ({
        id: project.id,
        type: 'project' as const,
        action: project.status === 'completed' ? 'Completed' : 'Updated',
        item: project.name,
        time: project.updated_at,
        ai: project.ai_generated
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    return {
      totalParts,
      availableParts,
      aiIdentifiedParts,
      totalProjects,
      activeProjects,
      completedProjects,
      successRate,
      totalValue,
      categoryCounts,
      recentActivity
    };
  }, [parts, projects]);

  return stats;
};