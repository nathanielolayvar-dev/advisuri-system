import { useSidebar } from '../components/Sidebar/SidebarContext';
import { Sidebar } from '../components/Sidebar/Sidebar';
import AdminPanel from '../components/AdminPanel/AdminPanel';

export default function AdminPage() {
  const { isPinned, isHovered } = useSidebar();

  // Content margin syncs with sidebar state
  const marginClass = (isPinned || isHovered) ? 'ml-64' : 'ml-20';

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <Sidebar />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out ${marginClass}`}>
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] flex items-center px-10 sticky top-0 z-20">
          <h1 className="text-2xl font-extrabold text-[#1E293B] tracking-tight">
            Admin Control Panel
          </h1>
        </header>

        <main className="p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            <AdminPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
