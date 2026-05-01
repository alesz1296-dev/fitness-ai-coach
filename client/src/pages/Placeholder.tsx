interface PlaceholderProps {
  title: string;
  icon: string;
  description: string;
}

export default function Placeholder({ title, icon, description }: PlaceholderProps) {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <span className="text-6xl mb-4">{icon}</span>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-500 max-w-sm">{description}</p>
      <div className="mt-6 px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-medium">
        Coming in Phase 2 build
      </div>
    </div>
  );
}
