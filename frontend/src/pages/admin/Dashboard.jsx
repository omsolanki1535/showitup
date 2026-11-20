import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { userStore } from '../../context/userContext';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  Trash2, 
  Search,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Ticket,
  MapPin,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizers: 0,
    totalAttendees: 0,
    totalEvents: 0,
    totalRevenue: 0,
    activeEvents: 0,
    completedEvents: 0,
    pendingEvents: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [today, setToday] = useState({ users: 0, events: 0, bookings: 0, revenue: 0 });
  const percentOfUsers = (count) => (stats.totalUsers ? ((count / stats.totalUsers) * 100).toFixed(1) : '0.0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/admin/dashboard`,
          { withCredentials: true }
        );
        const data = response.data;
        setStats(data.stats);
        setRecentUsers(data.users.map((user) => ({
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role?.toLowerCase() || 'attendee',
          status: user.verified ? 'active' : 'pending',
          eventsCount: user.eventsCount || 0,
          lastActive: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-',
        })));
        setRecentEvents(data.events.map((event) => ({
          id: event._id,
          title: event.title,
          organizer: event.organizer?.username || 'Unknown',
          date: event.eventDateTime?.[0] ? new Date(event.eventDateTime[0]).toLocaleDateString() : 'Not set',
          location: event.location || 'Not set',
          attendees: event.totalBookings || 0,
          revenue: event.totalRevenue || 0,
          status: event.status,
        })));
        setToday(data.today || { users: 0, events: 0, bookings: 0, revenue: 0 });
        setAnalytics({
          eventCategories: data.eventCategories || [],
        });
      } catch (error) {
        console.error('Unable to load admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const currentUser = userStore((state) => state.user);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const changeRole = async (userId, role) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API}/admin/users/${userId}/role`, { role }, { withCredentials: true });
      setRecentUsers((users) => users.map((u) => (u.id === userId ? { ...u, role: role.toLowerCase() } : u)));
      toast.success(`Role changed to ${role}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not change role');
    }
  };

  const deleteUser = async (userId) => {
    if (confirmDeleteId !== userId) {
      setConfirmDeleteId(userId);
      toast('Click delete again to confirm', { icon: '⚠️' });
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_API}/admin/users/${userId}`, { withCredentials: true });
      setRecentUsers((users) => users.filter((u) => u.id !== userId));
      toast.success('User deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete user');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const exportUsersCsv = () => {
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [['Name', 'Email', 'Role', 'Status', 'Events', 'Joined'], ...filteredUsers.map((u) => [u.name, u.email, u.role, u.status, u.eventsCount, u.lastActive])];
    const blob = new Blob([rows.map((r) => r.map(escape).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'showitup-users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = recentUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'organizer': return 'bg-orange-500';
      case 'attendee': return 'bg-rose-500';
      case 'admin': return 'bg-amber-600';
      default: return 'bg-gray-500';
    }
  };

  const getEventStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-orange-500';
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p className="text-xl">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin min-h-screen p-6 mx-auto px-24 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-orange-300 mb-2">Admin Dashboard</h1>
        <p className="text-orange-200">Monitor and manage organizers and attendees</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'events', label: 'Event Monitoring', icon: Calendar },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers?.toLocaleString() || 0}</p>
                  <p className="text-orange-200">Total Users</p>
                </div>
                <Users className="w-10 h-10 text-orange-400" />
              </div>
            </div>
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{stats.totalOrganizers?.toLocaleString() || 0}</p>
                  <p className="text-orange-200">Organizers</p>
                </div>
                <UserCheck className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{stats.totalEvents?.toLocaleString() || 0}</p>
                  <p className="text-orange-200">Total Events</p>
                </div>
                <Calendar className="w-10 h-10 text-rose-400" />
              </div>
            </div>
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">₹{stats.totalRevenue?.toLocaleString() || 0}</p>
                  <p className="text-orange-200">Total Revenue</p>
                </div>
                <DollarSign className="w-10 h-10 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
              <h3 className="text-lg font-semibold text-white mb-4">Event Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-orange-200">Active Events</span>
                  <span className="font-semibold text-white">{stats.activeEvents || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-200">Completed Events</span>
                  <span className="font-semibold text-white">{stats.completedEvents || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-200">Upcoming Events</span>
                  <span className="font-semibold text-white">{stats.pendingEvents || 0}</span>
                </div>
              </div>
            </div>
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
              <h3 className="text-lg font-semibold text-white mb-4">User Distribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-orange-200">Organizers</span>
                  <span className="font-semibold text-white">{percentOfUsers(stats.totalOrganizers)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-200">Attendees</span>
                  <span className="font-semibold text-white">{percentOfUsers(stats.totalAttendees)}%</span>
                </div>
              </div>
            </div>
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-2 text-sm">
                <p className="text-orange-200">New user registrations: <span className="text-white">+{today.users} today</span></p>
                <p className="text-orange-200">Events created: <span className="text-white">+{today.events} today</span></p>
                <p className="text-orange-200">Tickets booked: <span className="text-white">{today.bookings} today</span></p>
                <p className="text-orange-200">Revenue generated: <span className="text-white">₹{today.revenue.toLocaleString()} today</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-orange-400/20 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <select
                className="px-4 py-2 rounded-lg border border-orange-400/20 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="organizer">Organizers</option>
                <option value="attendee">Attendees</option>
                <option value="admin">Admins</option>
              </select>
              <select
                className="px-4 py-2 rounded-lg border border-orange-400/20 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Verified</option>
                <option value="pending">Awaiting OTP</option>
              </select>
              <button onClick={exportUsersCsv} title="Export as CSV" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="glass rounded-lg shadow-xl border border-orange-400/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-orange-200 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-orange-200 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-orange-200 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-orange-200 uppercase tracking-wider">Events</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-orange-200 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-orange-200 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="text-sm text-orange-200">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {user.eventsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-200">
                        {user.lastActive}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <select
                            aria-label={`Role for ${user.name}`}
                            value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            onChange={(e) => changeRole(user.id, e.target.value)}
                            disabled={user.id === currentUser?.id}
                            className="px-2 py-1 rounded-md border border-orange-400/20 bg-gray-800 text-white text-xs disabled:opacity-50"
                          >
                            <option value="Attendee">Attendee</option>
                            <option value="Organizer">Organizer</option>
                            <option value="Admin">Admin</option>
                          </select>
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={user.id === currentUser?.id}
                            title={confirmDeleteId === user.id ? 'Click again to confirm' : 'Delete user'}
                            className={`${confirmDeleteId === user.id ? 'text-red-300 animate-pulse' : 'text-red-400'} hover:text-red-300 disabled:opacity-30`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Event Monitoring Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentEvents.map((event) => (
              <div key={event.id} className="glass rounded-lg shadow-xl border border-orange-400/20 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-orange-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    {event.organizer}
                  </p>
                  <p className="text-orange-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {event.date}
                  </p>
                  <p className="text-orange-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </p>
                  <p className="text-orange-200 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {event.attendees} attendees
                  </p>
                  <p className="text-orange-200 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    ₹{event.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link to={`/events/${event.id}`} className="flex-1 text-center px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-lg border border-orange-400/20">
              <BarChart3 className="w-10 h-10 text-orange-400 mb-3" />
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
              <p className="text-orange-200">Registered users</p>
            </div>
            <div className="glass p-6 rounded-lg border border-orange-400/20">
              <TrendingUp className="w-10 h-10 text-green-400 mb-3" />
              <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-orange-200">Confirmed revenue</p>
            </div>
            <div className="glass p-6 rounded-lg border border-orange-400/20">
              <Ticket className="w-10 h-10 text-rose-400 mb-3" />
              <p className="text-3xl font-bold">{stats.activeEvents + stats.completedEvents + stats.pendingEvents}</p>
              <p className="text-orange-200">All event listings</p>
            </div>
          </div>

          {/* Event Categories */}
          <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20">
            <h3 className="text-lg font-semibold text-white mb-4">Event Categories Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {analytics.eventCategories?.map((category, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: ['#ea580c', '#e11d48', '#d97706', '#c2410c', '#be123c'][index % 5] }}
                  >
                    <span className="text-white font-bold">{category.value}%</span>
                  </div>
                  <p className="text-orange-200 text-sm">{category.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20 text-center">
              <Activity className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <p className="text-2xl font-bold text-white">{stats.totalAttendees}</p>
              <p className="text-orange-200">Attendee accounts</p>
            </div>
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20 text-center">
              <Ticket className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-2xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-orange-200">Confirmed revenue</p>
            </div>
            <div className="glass p-6 rounded-lg shadow-xl border border-orange-400/20 text-center">
              <Shield className="w-12 h-12 text-rose-400 mx-auto mb-4" />
              <p className="text-2xl font-bold text-white">{stats.totalOrganizers}</p>
              <p className="text-orange-200">Organizer accounts</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
