import NotificationPreferences from '@/components/NotificationPreferences';

const NotificationSettings = () => {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Notification Settings</h1>
        <NotificationPreferences />
      </div>
    </div>
  );
};

export default NotificationSettings;