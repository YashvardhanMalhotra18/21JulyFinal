import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StatsCards } from "@/components/stats-cards";
import { Charts } from "@/components/charts";
import { KanbanBoard } from "@/components/kanban-board";
import { RecentActivity } from "@/components/recent-activity";
import { NotificationIcon } from "@/components/notification-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Complaint } from "@shared/schema";


export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: apiComplaints = [], isLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/complaints"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: apiStats } = useQuery({
    queryKey: ["/api/complaints/stats"],
    refetchInterval: 30000,
  });

  // Use all complaints without year filtering
  const complaints = apiComplaints;

  // Calculate stats based on filtered complaints data
  const stats = {
    total: complaints.length,
    new: complaints.filter(c => c.status === "new").length,
    inProgress: complaints.filter(c => c.status === "in-progress").length,
    resolved: complaints.filter(c => c.status === "resolved").length,
    closed: complaints.filter(c => c.status === "closed").length,
    resolvedToday: complaints.filter(c => {
      const today = new Date();
      const resolvedDate = c.dateOfResolution ? new Date(c.dateOfResolution) : null;
      return resolvedDate && 
        resolvedDate.toDateString() === today.toDateString() &&
        (c.status === "resolved" || c.status === "closed");
    }).length
  };



  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = !searchQuery || 
      complaint.depoPartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.voc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.complaintType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.areaOfConcern?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || complaint.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <p className="text-gray-600">Monitor and manage customer complaints</p>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationIcon />
            <Button
              onClick={() => setLocation('/admin/new-complaint')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Complaint
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Charts Section */}
        <Charts complaints={complaints} />

        {/* Complaint Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Complaint Management Board</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search complaints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="p-6">
            <KanbanBoard complaints={filteredComplaints} isLoading={isLoading} />
          </div>
        </div>


      </div>
    </div>
  );
}
