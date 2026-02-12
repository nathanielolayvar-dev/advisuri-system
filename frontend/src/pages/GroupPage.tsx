import { useSidebar } from '../components/Sidebar/SidebarContext';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { Groups } from '../components/Groups/Groups';
import { HelpCircle } from 'lucide-react';

export default function GroupPage() {
  const { isPinned, isHovered } = useSidebar();

  // Content margin syncs with sidebar state
  const marginClass = (isPinned || isHovered) ? 'ml-64' : 'ml-20';

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <Sidebar />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out ${marginClass}`}>
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] flex items-center px-10 sticky top-0 z-20">
          <h1 className="text-2xl font-extrabold text-[#1E293B] tracking-tight">
            Collaboration Groups
          </h1>
        </header>

        <main className="flex-1 overflow-hidden">
          <div className="h-[calc(100vh-5rem)]">
            <Groups />
          </div>
        </main>
      </div>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#1E293B] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50">
        <HelpCircle size={28} />
      </button>
    </div>
  );
}
