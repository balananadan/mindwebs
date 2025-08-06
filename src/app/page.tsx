'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ConfigProvider, Spin, Layout, App } from 'antd';
import { usePolygonUpdater } from '@/hooks/usePolygonUpdater';
import Sidebar from '@/components/Sidebar';
import TimelineSlider from '@/components/TimelineSlider';

const { Content } = Layout;

// Dynamically import MapComponent to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Spin size="large" />
    </div>
  ),
});

const DashboardContent: React.FC = () => {
  // Initialize polygon updater hook
  usePolygonUpdater();

  return (
    <div className="h-screen flex flex-col">
      {/* Timeline Slider */}
      <div className="flex-shrink-0 p-4 bg-white border-b">
        <TimelineSlider />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0">
          <Sidebar />
        </div>

        {/* Map area */}
        <div className="flex-1 relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Spin size="large" />
              </div>
            }
          >
            <MapComponent />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <App>
        <Layout className="min-h-screen">
          <Content>
            <DashboardContent />
          </Content>
        </Layout>
      </App>
    </ConfigProvider>
  );
}
