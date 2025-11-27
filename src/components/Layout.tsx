import React from 'react';

interface LayoutProps {
    sidebar: React.ReactNode;
    content: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, content }) => {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
            {sidebar}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative shadow-xl z-10">
                {content}
            </main>
        </div>
    );
};
