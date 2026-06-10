import { ProjectForm } from '@/components/projects/ProjectForm';

export default function NewProjectPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau projet</h1>
      <p className="text-gray-500 mb-8">Renseignez les informations de votre projet immobilier.</p>
      <ProjectForm />
    </div>
  );
}
