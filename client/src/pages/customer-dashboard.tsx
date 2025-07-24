import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText, Database, Search, Filter, Download, Clock, TrendingUp, BarChart3, Activity, Zap, BookOpen, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAsmAuth } from '@/hooks/use-asm-auth';
import { asmApiGet, asmApiPost } from '@/lib/asm-api';
import { NotificationBell } from '@/components/notification-bell';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AsmComplaint {
  id: number;
  complaintType: string;
  productName: string;
  status: string;
  priority: string;
  createdAt: string;
  voc: string;
  placeOfSupply?: string;
  areaOfConcern?: string;
  depoPartyName?: string;
}

interface QuickAction {
  icon: any;
  title: string;
  description: string;
  action: () => void;
  color: string;
}

interface TimelineActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  color: string;
}

interface SearchFilter {
  id: string;
  name: string;
  filters: {
    search: string;
    status: string;
    priority: string;
    dateFrom: string;
    dateTo: string;
  };
}

export default function CustomerDashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAsmAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Smart search and filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [savedFilters, setSavedFilters] = useState<SearchFilter[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Activity timeline state
  const [timelineActivities, setTimelineActivities] = useState<TimelineActivity[]>([]);
  
  // Offline support
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineData, setOfflineData] = useState<AsmComplaint[]>([]);

  // Offline support
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch user-specific complaints and statistics with offline support
  const { data: myComplaints = [], isLoading: complaintsLoading } = useQuery({
    queryKey: ['/api/asm/my-complaints'],
    queryFn: () => asmApiGet<AsmComplaint[]>('/api/asm/my-complaints'),
    enabled: !!user && !isOffline,
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      // Cache data for offline use
      setOfflineData(data);
      localStorage.setItem('asm-complaints-cache', JSON.stringify(data));
    },
    onError: () => {
      // Fallback to cached data if available
      const cached = localStorage.getItem('asm-complaints-cache');
      if (cached) {
        setOfflineData(JSON.parse(cached));
      }
    }
  });

  // Use offline data when offline
  const displayComplaints = isOffline ? offlineData : myComplaints;

  const { data: myStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/asm/my-stats'],
    queryFn: () => asmApiGet<{
      total: number;
      open: number;
      resolved: number;
      closed: number;
      new: number;
      inProgress: number;
    }>('/api/asm/my-stats'),
    enabled: !!user && !isOffline,
    refetchInterval: 5000, // Real-time updates
    refetchOnWindowFocus: true
  });

  // Smart search suggestions
  useEffect(() => {
    if (searchQuery.length > 2) {
      const suggestions = displayComplaints
        .filter(complaint => 
          complaint.voc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          complaint.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          complaint.areaOfConcern?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          complaint.depoPartyName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(complaint => complaint.voc || complaint.productName || complaint.areaOfConcern)
        .filter((value, index, self) => self.indexOf(value) === index && value)
        .slice(0, 5);
      
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, displayComplaints]);

  // Initialize timeline activities
  useEffect(() => {
    const activities: TimelineActivity[] = displayComplaints
      .slice(0, 5)
      .map((complaint, index) => ({
        id: `activity-${complaint.id}`,
        type: 'complaint',
        title: `Complaint ${complaint.id} ${getStatusAction(complaint.status)}`,
        description: `${complaint.productName} - ${complaint.areaOfConcern || 'General issue'}`,
        timestamp: complaint.createdAt,
        icon: getStatusIcon(complaint.status),
        color: getStatusColor(complaint.status)
      }));
    
    setTimelineActivities(activities);
  }, [displayComplaints]);

  // Helper functions
  const getStatusAction = (status: string) => {
    switch (status) {
      case 'new': return 'created';
      case 'in-progress': return 'is being processed';
      case 'resolved': return 'has been resolved';
      case 'closed': return 'was closed';
      default: return 'updated';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return Plus;
      case 'in-progress': return Clock;
      case 'resolved': return CheckCircle2;
      case 'closed': return FileText;
      default: return AlertCircle;
    }
  };



  // AI-powered categorization and suggestions
  const categorizePriority = (complaint: AsmComplaint) => {
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'severe', 'dangerous'];
    const highKeywords = ['important', 'major', 'significant', 'serious'];
    
    const text = (complaint.voc || '').toLowerCase();
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) return 'high';
    if (highKeywords.some(keyword => text.includes(keyword))) return 'medium';
    return 'low';
  };

  const getSuggestedActions = (complaint: AsmComplaint) => {
    const suggestions = [];
    
    if (complaint.areaOfConcern?.includes('Packaging')) {
      suggestions.push('Contact quality control team');
      suggestions.push('Request packaging inspection');
    }
    
    if (complaint.areaOfConcern?.includes('Rate')) {
      suggestions.push('Review pricing with sales team');
      suggestions.push('Check competitor pricing');
    }
    
    if (complaint.status === 'new') {
      suggestions.push('Acknowledge receipt within 24 hours');
      suggestions.push('Assign to appropriate department');
    }
    
    return suggestions;
  };

  const detectDuplicates = (complaint: AsmComplaint) => {
    return displayComplaints.filter(c => 
      c.id !== complaint.id &&
      c.productName === complaint.productName &&
      c.areaOfConcern === complaint.areaOfConcern &&
      Math.abs(new Date(c.createdAt).getTime() - new Date(complaint.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 // Within 7 days
    );
  };

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      icon: Plus,
      title: 'New Complaint',
      description: 'Submit a new complaint quickly',
      action: () => setLocation('/asm/new-complaint'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: Search,
      title: 'Track Complaints',
      description: 'Find and track complaint status',
      action: () => setLocation('/asm/track-complaints'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: Download,
      title: 'Export Data',
      description: 'Download complaint reports',
      action: () => exportFilteredComplaints(),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: Star,
      title: 'Submit Feedback',
      description: 'Rate resolved complaints',
      action: () => setLocation('/asm/feedback'),
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  // Filter complaints based on search and filters
  const filteredComplaints = displayComplaints.filter(complaint => {
    const matchesSearch = !searchQuery || 
      complaint.voc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.areaOfConcern?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.depoPartyName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || complaint.priority === priorityFilter;
    
    let matchesDateRange = true;
    if (dateFromFilter || dateToFilter) {
      const complaintDate = new Date(complaint.createdAt);
      if (dateFromFilter) matchesDateRange = matchesDateRange && complaintDate >= new Date(dateFromFilter);
      if (dateToFilter) matchesDateRange = matchesDateRange && complaintDate <= new Date(dateToFilter);
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDateRange;
  });

  // Export functionality
  const exportFilteredComplaints = () => {
    const csvContent = [
      ['ID', 'Type', 'Product', 'Status', 'Priority', 'Created', 'Description'],
      ...filteredComplaints.map(complaint => [
        complaint.id,
        complaint.complaintType,
        complaint.productName,
        complaint.status,
        complaint.priority,
        new Date(complaint.createdAt).toLocaleDateString(),
        complaint.voc?.substring(0, 100) + '...'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asm-complaints-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "Export Complete",
      description: `Exported ${filteredComplaints.length} complaints to CSV`,
    });
  };

  // Save search filter
  const saveCurrentFilter = () => {
    const filterName = prompt('Enter a name for this search filter:');
    if (filterName) {
      const newFilter: SearchFilter = {
        id: Date.now().toString(),
        name: filterName,
        filters: {
          search: searchQuery,
          status: statusFilter,
          priority: priorityFilter,
          dateFrom: dateFromFilter,
          dateTo: dateToFilter
        }
      };
      
      const updatedFilters = [...savedFilters, newFilter];
      setSavedFilters(updatedFilters);
      localStorage.setItem('asm-saved-filters', JSON.stringify(updatedFilters));
      
      toast({
        title: "Filter Saved",
        description: `Search filter "${filterName}" has been saved`,
      });
    }
  };

  // Load saved filter
  const loadSavedFilter = (filter: SearchFilter) => {
    setSearchQuery(filter.filters.search);
    setStatusFilter(filter.filters.status);
    setPriorityFilter(filter.filters.priority);
    setDateFromFilter(filter.filters.dateFrom);
    setDateToFilter(filter.filters.dateTo);
  };

  // Load saved filters on mount
  useEffect(() => {
    const saved = localStorage.getItem('asm-saved-filters');
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, []);

  // Chart data
  const chartData = [
    { name: 'New', value: myStats?.new || 0, color: '#3B82F6' },
    { name: 'In Progress', value: myStats?.inProgress || 0, color: '#F59E0B' },
    { name: 'Resolved', value: myStats?.resolved || 0, color: '#10B981' },
    { name: 'Closed', value: myStats?.closed || 0, color: '#6B7280' }
  ];

  const trendData = displayComplaints.slice(0, 7).map((complaint, index) => ({
    day: `Day ${7 - index}`,
    complaints: Math.floor(Math.random() * 5) + 1 // Simulated trend data
  }));

  const isLoading = complaintsLoading || statsLoading;

  // Mutation to create sample data
  const createSampleDataMutation = useMutation({
    mutationFn: () => asmApiPost('/api/asm/create-sample-data', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/asm/my-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['/api/asm/my-stats'] });
      toast({
        title: "Sample Data Created",
        description: "Sample complaints have been added to your dashboard for demonstration.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create sample data. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <div className="p-4 md:p-6">
        <div className="space-y-6">
          {/* Header with offline indicator */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Dashboard</h1>
              <p className="text-gray-600 flex items-center gap-2">
                Welcome back, {user?.firstName} {user?.lastName}
                {isOffline && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Offline Mode
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                variant="outline"
                size="sm"
                onClick={exportFilteredComplaints}
                className="hidden md:flex"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card key={index} className="cursor-pointer transform hover:scale-105 transition-all duration-200">
                <CardContent className="p-4" onClick={action.action}>
                  <div className={`w-12 h-12 rounded-lg ${action.color} text-white flex items-center justify-center mb-3`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">7-Day Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="complaints" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {timelineActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${activity.color}`}>
                        <activity.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-500">{activity.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Smart Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Smart Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Main search bar with suggestions */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search complaints by description, product, or area of concern..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Search suggestions dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                      {searchSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick filters */}
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Advanced
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveCurrentFilter}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Save Filter
                  </Button>
                </div>

                {/* Advanced filters */}
                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                      <Input
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                      <Input
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Saved filters */}
                {savedFilters.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Saved Filters</label>
                    <div className="flex flex-wrap gap-2">
                      {savedFilters.map((filter) => (
                        <Button
                          key={filter.id}
                          variant="outline"
                          size="sm"
                          onClick={() => loadSavedFilter(filter)}
                          className="text-xs"
                        >
                          {filter.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results summary */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing {filteredComplaints.length} of {displayComplaints.length} complaints
                  </span>
                  {filteredComplaints.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportFilteredComplaints}
                      className="flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Export ({filteredComplaints.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Complaints List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Smart Complaints View ({filteredComplaints.length})
                </span>
                <Button onClick={() => setLocation('/asm/new-complaint')} className="hidden md:flex">
                  <Plus className="w-4 h-4 mr-2" />
                  New Complaint
                </Button>
              </CardTitle>
              <CardDescription>
                AI-powered complaint management with smart suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading your complaints...</p>
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {displayComplaints.length === 0 ? 'No complaints yet' : 'No matching complaints'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {displayComplaints.length === 0 
                      ? 'Start by submitting your first complaint or load sample data to explore features.'
                      : 'Try adjusting your search filters to find more complaints.'
                    }
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setLocation('/asm/new-complaint')}
                      className="w-full md:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Submit New Complaint
                    </Button>
                    {displayComplaints.length === 0 && (
                      <Button 
                        variant="outline"
                        onClick={() => createSampleDataMutation.mutate()}
                        disabled={createSampleDataMutation.isPending}
                        className="w-full md:w-auto"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        {createSampleDataMutation.isPending ? 'Loading...' : 'Load Sample Data'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredComplaints.map((complaint: AsmComplaint) => {
                    const suggestedPriority = categorizePriority(complaint);
                    const suggestions = getSuggestedActions(complaint);
                    const duplicates = detectDuplicates(complaint);
                    
                    return (
                      <div key={complaint.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-all duration-200 hover:shadow-md">
                        <div className="flex flex-col gap-4">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Complaint #{complaint.yearlySequenceNumber || complaint.id}
                              </h3>
                              <Badge className={getStatusColor(complaint.status)}>
                                {complaint.status}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(complaint.priority)}>
                                {complaint.priority}
                              </Badge>
                              {suggestedPriority !== complaint.priority && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  AI suggests: {suggestedPriority}
                                </Badge>
                              )}
                              {duplicates.length > 0 && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  {duplicates.length} similar
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/asm/track-complaints?id=${complaint.id}`)}
                                className="flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Details
                              </Button>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {complaint.complaintType} - {complaint.productName}
                                </p>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {complaint.voc}
                                </p>
                              </div>
                              
                              {complaint.areaOfConcern && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <AlertCircle className="w-3 h-3" />
                                  {complaint.areaOfConcern}
                                  {complaint.placeOfSupply && ` • ${complaint.placeOfSupply}`}
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Created: {formatDate(complaint.createdAt)}
                              </p>
                            </div>

                            {/* AI Suggestions */}
                            {suggestions.length > 0 && (
                              <div className="bg-blue-50 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  AI Suggestions
                                </h4>
                                <ul className="space-y-1">
                                  {suggestions.slice(0, 2).map((suggestion, index) => (
                                    <li key={index} className="text-xs text-blue-700 flex items-start gap-1">
                                      <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                      {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Progress indicator for mobile */}
                          <div className="block md:hidden">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full transition-all duration-300 ${
                                  complaint.status === 'new' ? 'w-1/4 bg-blue-500' :
                                  complaint.status === 'in-progress' ? 'w-2/4 bg-yellow-500' :
                                  complaint.status === 'resolved' ? 'w-3/4 bg-green-500' :
                                  'w-full bg-gray-500'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}