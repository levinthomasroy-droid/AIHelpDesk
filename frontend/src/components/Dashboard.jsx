
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Bot,
  Settings,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Headset,
  RefreshCw,
  CalendarDays,
  Search,
  X,
  ArrowLeft,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
} from 'lucide-react';

const API = 'http://127.0.0.1:8000';

const statusStyles = {
  OPEN: 'bg-red-500/10 text-red-400 border-red-500/20',
  IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  RESOLVED: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLOSED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const priorityStyles = {
  LOW: 'text-blue-400',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-400',
};

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'assistant', label: 'AI Assistant', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const emptyForm = {
  title: '',
  description: '',
  category: 'OTHER',
  priority: 'MEDIUM',
  status: 'OPEN',
};

export default function Dashboard({ user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activePage, setActivePage] = useState('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const [selectedTicket, setSelectedTicket] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editingTicket, setEditingTicket] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  // AI ASSISTANT STATE
  const initialAIMessage = {
    role: 'assistant',
    content:
      'Hello! I am your AI HelpDesk Assistant. Describe your IT issue and I will try to help.',
    createdAt: new Date(),
  };

  const [aiMessages, setAiMessages] = useState([initialAIMessage]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const aiChatEndRef = useRef(null);

  const suggestedQuestions = [
    'My Wi-Fi is not connecting',
    'My computer is running slowly',
    'I cannot access my account',
    'My printer is not working',
  ];

  // AUTHENTICATED REQUEST WITH AUTOMATIC TOKEN REFRESH
  const authenticatedFetch = async (url, options = {}) => {
    let token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Please log in again. Access token is missing.');
    }

    const sendRequest = (accessToken) => {
      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      };

      return fetch(url, {
        ...options,
        headers,
      });
    };

    let response = await sendRequest(token);

    if (response.status === 401) {
      const refresh = localStorage.getItem('refresh_token');

      if (!refresh) {
        throw new Error('Session expired. Please log in again.');
      }

      const refreshResponse = await fetch(
        `${API}/api/token/refresh/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh }),
        }
      );

      const refreshData = await refreshResponse.json().catch(() => ({}));

      if (!refreshResponse.ok || !refreshData.access) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        throw new Error('Session expired. Please log in again.');
      }

      token = refreshData.access;
      localStorage.setItem('access_token', token);

      response = await sendRequest(token);
    }

    return response;
  };

  // LOAD SAVED AI CHAT HISTORY
  const loadAIChatHistory = async () => {
    try {
      setAiHistoryLoading(true);

      const response = await authenticatedFetch(
        `${API}/api/ai/history/`
      );

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(
          data.detail || 'Could not load chat history.'
        );
      }

      if (Array.isArray(data) && data.length > 0) {
        setAiMessages(
          data.map((item) => ({
            id: item.id,
            role: item.role === 'USER' ? 'user' : 'assistant',
            content: item.content,
            createdAt: item.created_at,
          }))
        );
      } else {
        setAiMessages([
          { ...initialAIMessage, createdAt: new Date() },
        ]);
      }
    } catch (err) {
      console.error('Chat history loading error:', err);
    } finally {
      setAiHistoryLoading(false);
    }
  };

  // LOAD HISTORY WHEN DASHBOARD OPENS
  useEffect(() => {
    loadAIChatHistory();
  }, []);

  // CLEAR CHAT HISTORY FROM DATABASE
  const clearAIChat = async () => {
    if (aiLoading || aiHistoryLoading) return;

    const confirmed = window.confirm(
      'Are you sure you want to permanently clear this conversation?'
    );

    if (!confirmed) return;

    try {
      setAiError('');

      const response = await authenticatedFetch(
        `${API}/api/ai/clear/`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.error ||
          'Could not clear chat history.'
        );
      }

      setAiMessages([
        { ...initialAIMessage, createdAt: new Date() },
      ]);

      setAiInput('');
      setAiError('');
    } catch (err) {
      setAiError(
        err.message || 'Could not clear chat history.'
      );
    }
  };

  // AUTO SCROLL CHAT
  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [aiMessages, aiLoading]);

  // SEND A MESSAGE TO DJANGO AI ENDPOINT
  const handleSendAIMessage = async (e) => {
    e.preventDefault();

    const message = aiInput.trim();

    if (!message || aiLoading || aiHistoryLoading) return;

    setAiError('');
    setAiInput('');

    setAiMessages((previous) => [
      ...previous,
      {
        role: 'user',
        content: message,
        createdAt: new Date(),
      },
    ]);

    try {
      setAiLoading(true);

      const response = await authenticatedFetch(
        `${API}/api/ai/chat/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.detail ||
          'The AI service could not process your request.'
        );
      }

      const reply =
        data.reply || data.response || data.answer;

      if (typeof reply !== 'string' || !reply.trim()) {
        throw new Error(
          'The AI endpoint returned no reply. Expected a "reply" field.'
        );
      }

      setAiMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: reply.trim(),
          createdAt: new Date(),
        },
      ]);
    } catch (err) {
      let friendlyMessage =
        err.message || 'Something went wrong. Please try again.';

      if (err instanceof TypeError) {
        friendlyMessage =
          'Unable to connect to the AI service. Check that the Django server is running and try again.';
      } else if (
        /session expired|log in again|access token is missing/i.test(
          friendlyMessage
        )
      ) {
        friendlyMessage =
          'Your session has expired. Please log in again.';
      } else if (
        /failed to fetch|networkerror/i.test(friendlyMessage)
      ) {
        friendlyMessage =
          'Network connection failed. Check your connection and make sure the backend server is running.';
      }

      setAiError(friendlyMessage);
    } finally {
      setAiLoading(false);
    }
  };

  // LOAD TICKETS
  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await authenticatedFetch(
        `${API}/api/tickets/`
      );

      if (!response.ok) {
        throw new Error('Unable to load tickets.');
      }

      const data = await response.json();

      setTickets(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // CREATE TICKET
  const handleCreateTicket = async (e) => {
    e.preventDefault();

    try {
      setCreating(true);
      setCreateError('');
      setSuccessMessage('');

      const response = await authenticatedFetch(
        `${API}/api/tickets/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const messages = Object.entries(data)
          .map(([field, messages]) => {
            const details = Array.isArray(messages)
              ? messages.join(', ')
              : String(messages);

            return `${field}: ${details}`;
          })
          .join(' | ');

        throw new Error(messages || 'Unable to create ticket.');
      }

      setFormData(emptyForm);
      setShowCreateModal(false);
      setSuccessMessage('Ticket created successfully!');

      await loadTickets();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // OPEN EDIT MODAL
  const handleEditClick = (ticket) => {
    setEditingTicket(ticket);

    setEditForm({
      title: ticket.title || '',
      description: ticket.description || '',
      category: ticket.category || 'OTHER',
      priority: ticket.priority || 'MEDIUM',
      status: ticket.status || 'OPEN',
    });

    setEditError('');
    setSelectedTicket(null);
  };

  // UPDATE TICKET
  const handleUpdateTicket = async (e) => {
    e.preventDefault();

    if (!editingTicket) return;

    try {
      setUpdating(true);
      setEditError('');
      setSuccessMessage('');

      const response = await authenticatedFetch(
        `${API}/api/tickets/${editingTicket.id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const messages = Object.entries(data)
          .map(([field, messages]) => {
            const details = Array.isArray(messages)
              ? messages.join(', ')
              : String(messages);

            return `${field}: ${details}`;
          })
          .join(' | ');

        throw new Error(messages || 'Unable to update ticket.');
      }

      setTickets((previous) =>
        previous.map((ticket) =>
          ticket.id === data.id ? data : ticket
        )
      );

      setEditingTicket(null);
      setSuccessMessage('Ticket updated successfully!');
    } catch (err) {
      setEditError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) return 'Date unavailable';

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // DASHBOARD STATISTICS
  const stats = [
    {
      label: 'Total Tickets',
      value: tickets.length,
      icon: Ticket,
      color: 'text-blue-400',
    },
    {
      label: 'Open Tickets',
      value: tickets.filter((t) => t.status === 'OPEN').length,
      icon: AlertCircle,
      color: 'text-red-400',
    },
    {
      label: 'In Progress',
      value: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
      icon: Clock,
      color: 'text-yellow-400',
    },
    {
      label: 'Resolved',
      value: tickets.filter((t) => t.status === 'RESOLVED').length,
      icon: CheckCircle,
      color: 'text-green-400',
    },
  ];

  // SEARCH AND FILTER
  const filteredTickets = tickets.filter((ticket) => {
    const query = search.toLowerCase();

    const matchesSearch =
      String(ticket.title || '').toLowerCase().includes(query) ||
      String(ticket.id || '').toLowerCase().includes(query) ||
      String(ticket.category || '').toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'ALL' || ticket.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'ALL' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const pageTitle = {
    overview: 'Dashboard Overview',
    tickets: 'Ticket Management',
    team: 'Team Management',
    assistant: 'AI Assistant',
    settings: 'Settings',
  };

  // REUSABLE TICKET TABLE
  const renderTicketTable = (items) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-900/50 text-xs uppercase text-gray-400">
          <tr>
            <th className="p-4">Ticket</th>
            <th className="p-4">Category</th>
            <th className="p-4">Priority</th>
            <th className="p-4">Status</th>
            <th className="p-4">Created</th>
            <th className="p-4">Action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((ticket) => (
            <tr
              key={ticket.id}
              className="border-t border-gray-800 transition hover:bg-gray-800/40"
            >
              <td className="p-4">
                <p className="font-medium">
                  {ticket.title || 'Untitled Ticket'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  #{ticket.id}
                </p>
              </td>

              <td className="p-4 text-sm text-gray-400">
                {ticket.category || 'General'}
              </td>

              <td className="p-4">
                <span
                  className={`text-sm font-semibold ${
                    priorityStyles[ticket.priority] || 'text-gray-400'
                  }`}
                >
                  {ticket.priority || 'N/A'}
                </span>
              </td>

              <td className="p-4">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    statusStyles[ticket.status] ||
                    'border-gray-700 text-gray-400'
                  }`}
                >
                  {(ticket.status || 'UNKNOWN').replace('_', ' ')}
                </span>
              </td>

              <td className="p-4 text-sm text-gray-400">
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <CalendarDays size={14} />
                  {formatDate(ticket.created_at)}
                </span>
              </td>

              <td className="p-4">
                <button
                  onClick={() => setSelectedTicket(ticket)}
                  className="rounded-lg bg-blue-600/10 px-3 py-2 text-xs text-blue-400 hover:bg-blue-600/20"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#080d19] text-white">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-gray-800 bg-[#111827] p-6">
        <div className="mb-12 flex items-center gap-3">
          <Headset className="text-blue-500" size={30} />
          <h1 className="text-xl font-bold">AI HelpDesk</h1>
        </div>

        <p className="mb-4 text-xs text-gray-500">WORKSPACE</p>

        <nav className="space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setSelectedTicket(null);
                }}
                className={`flex w-full items-center gap-3 rounded-xl p-3 transition ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-gray-800 pt-5">
          <p className="font-semibold">
            {user?.username || 'User'}
          </p>

          <p className="mb-4 text-xs text-gray-500">
            {user?.role || 'Employee'}
          </p>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 overflow-hidden p-5 md:p-9">

        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {pageTitle[activePage]}
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Welcome back, {user?.username || 'User'}!
            </p>
          </div>

          <button
            onClick={loadTickets}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-400">
            {successMessage}
          </div>
        )}

        {/* OVERVIEW PAGE */}
        {activePage === 'overview' && (
          <>
            <section className="mb-9 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-gray-800 bg-[#111827] p-6 transition hover:border-blue-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400">
                        {stat.label}
                      </p>
                      <Icon className={stat.color} size={23} />
                    </div>

                    <h3 className="mt-5 text-3xl font-bold">
                      {loading ? '...' : stat.value}
                    </h3>
                  </div>
                );
              })}
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-800 bg-[#111827]">
              <div className="flex items-center justify-between border-b border-gray-800 p-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    Recent Tickets
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Support requests from your workspace
                  </p>
                </div>

                <Ticket className="text-blue-400" />
              </div>

              {loading && (
                <p className="p-6 text-gray-400">
                  Loading tickets...
                </p>
              )}

              {!loading && !error && tickets.length === 0 && (
                <p className="p-6 text-gray-400">
                  No support tickets found yet.
                </p>
              )}

              {!loading && tickets.length > 0 &&
                renderTicketTable(tickets.slice(0, 5))}
            </section>
          </>
        )}

        {/* TICKETS PAGE */}
        {activePage === 'tickets' && (
          <section className="overflow-hidden rounded-2xl border border-gray-800 bg-[#111827]">

            <div className="border-b border-gray-800 p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    All Support Tickets
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Search, filter and view support requests.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-600/10 px-3 py-2 text-sm text-blue-400">
                    {filteredTickets.length} Tickets
                  </span>

                  <button
                    onClick={() => {
                      setCreateError('');
                      setSuccessMessage('');
                      setFormData(emptyForm);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
                  >
                    <Plus size={17} />
                    Create Ticket
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-3 text-gray-500"
                    size={18}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="relative">
                  <Filter
                    className="absolute left-3 top-3 text-gray-500"
                    size={17}
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            {loading && (
              <p className="p-6 text-gray-400">
                Loading tickets...
              </p>
            )}

            {!loading && !error && filteredTickets.length === 0 && (
              <p className="p-8 text-center text-gray-400">
                No matching tickets found.
              </p>
            )}

            {!loading && filteredTickets.length > 0 &&
              renderTicketTable(filteredTickets)}
          </section>
        )}

        {/* TEAM PAGE */}
        {activePage === 'team' && (
          <section className="rounded-2xl border border-gray-800 bg-[#111827] p-8">
            <Users size={35} className="mb-4 text-blue-400" />

            <h3 className="text-xl font-semibold">
              Team Management
            </h3>

            <p className="mt-3 text-gray-400">
              Manage support agents and team members.
            </p>

            <p className="mt-5 text-sm text-yellow-400">
              Team management API integration is the next development task.
            </p>
          </section>
        )}

        {/* AI ASSISTANT PAGE */}
        {activePage === 'assistant' && (
          <section className="rounded-2xl border border-gray-800 bg-[#111827] p-4 sm:p-6 md:p-8">

            {/* ASSISTANT HEADER */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0 rounded-xl bg-blue-600/10 p-3">
                  <Bot size={30} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold sm:text-xl">
                    AI HelpDesk Assistant
                  </h3>
                  <p className="text-xs text-gray-400 sm:text-sm">
                    Local AI support assistant · Llama 3.2
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearAIChat}
                disabled={aiLoading || aiHistoryLoading}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={16} />
                Clear Chat
              </button>
            </div>

            {/* CHAT HISTORY */}
            <div
              className="mb-5 h-[min(55vh,420px)] min-h-[260px] space-y-4 overflow-y-auto rounded-xl border border-gray-800 bg-[#080d19] p-3 sm:p-4"
              aria-live="polite"
              aria-label="AI conversation"
            >
              {aiHistoryLoading && (
                <p className="text-center text-sm text-gray-400">
                  Loading previous conversations...
                </p>
              )}

              {aiMessages.map((message, index) => (
                <div
                  key={message.id || `${index}-${message.role}`}
                  className={`flex ${
                    message.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[95%] break-words rounded-2xl p-3 text-sm leading-6 sm:max-w-[80%] sm:p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-700 bg-[#111827] text-gray-200'
                    }`}
                  >
                    <p
                      className={`mb-2 font-semibold ${
                        message.role === 'user'
                          ? 'text-blue-100'
                          : 'text-blue-400'
                      }`}
                    >
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </p>

                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>

                    <p className="mt-2 text-right text-[10px] opacity-60">
                      {message.createdAt
                        ? new Date(message.createdAt).toLocaleTimeString(
                            'en-IN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )
                        : ''}
                    </p>
                  </div>
                </div>
              ))}

              {/* AI TYPING INDICATOR */}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-gray-700 bg-[#111827] p-4">
                    <p className="mb-2 text-sm font-semibold text-blue-400">
                      AI Assistant is typing
                    </p>

                    <div
                      className="flex items-center gap-1.5"
                      aria-label="AI is typing"
                    >
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400"
                          style={{
                            animationDelay: `${dot * 150}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={aiChatEndRef} />
            </div>

            {/* SUGGESTED QUESTIONS */}
            {aiMessages.length === 1 &&
              !aiLoading &&
              !aiHistoryLoading && (
                <div className="mb-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <Sparkles size={17} className="text-blue-400" />
                    Suggested Questions
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => setAiInput(question)}
                        className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs text-gray-300 transition hover:border-blue-500 hover:text-blue-400 sm:text-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* ERROR MESSAGE */}
            {aiError && (
              <div
                role="alert"
                className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
              >
                <span>{aiError}</span>

                <button
                  type="button"
                  onClick={() => setAiError('')}
                  aria-label="Dismiss error"
                  className="shrink-0 rounded p-1 hover:bg-red-500/10"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {/* MESSAGE COMPOSER */}
            <form
              onSubmit={handleSendAIMessage}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <textarea
                rows={2}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    e.currentTarget.form.requestSubmit();
                  }
                }}
                placeholder="Describe your IT problem... (Enter to send, Shift+Enter for a new line)"
                disabled={aiLoading || aiHistoryLoading}
                className="min-w-0 flex-1 resize-y rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  aiLoading ||
                  aiHistoryLoading ||
                  !aiInput.trim()
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32"
              >
                <Bot size={18} />
                {aiLoading ? 'Thinking...' : 'Send'}
              </button>
            </form>

            <p className="mt-3 text-xs text-gray-500">
              AI-generated suggestions may be inaccurate. Verify technical changes before applying them.
            </p>
          </section>
        )}

        {/* SETTINGS PAGE */}
        {activePage === 'settings' && (
          <section className="rounded-2xl border border-gray-800 bg-[#111827] p-8">
            <Settings size={35} className="mb-4 text-blue-400" />

            <h3 className="text-xl font-semibold">
              Account Settings
            </h3>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="mt-1 font-medium">
                  {user?.username || 'User'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="mt-1 font-medium">
                  {user?.role || 'Employee'}
                </p>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={() => !creating && setShowCreateModal(false)}
        >
          <div
            className="my-8 w-full max-w-xl rounded-2xl border border-gray-700 bg-[#111827] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  Create Support Ticket
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Describe the issue you need help with.
                </p>
              </div>

              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X size={21} />
              </button>
            </div>

            {createError && (
              <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ticket Title
                </label>

                <input
                  type="text"
                  required
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                    })
                  }
                  placeholder="Example: Wi-Fi Connection Issue"
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  required
                  rows={5}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Explain the issue in detail..."
                  className="w-full resize-y rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Category
                  </label>

                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="NETWORK">Network</option>
                    <option value="ACCOUNT">Account Access</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Priority
                  </label>

                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-gray-700 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Submit Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="my-8 w-full max-w-2xl rounded-2xl border border-gray-700 bg-[#111827] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  TICKET #{selectedTicket.id}
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  Ticket Details
                </h3>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                aria-label="Close ticket details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-sm text-gray-500">Title</p>
                <p className="mt-1 font-semibold">
                  {selectedTicket.title || 'Untitled Ticket'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="mt-1">
                  {selectedTicket.category || 'General'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Priority</p>
                  <p
                    className={`mt-1 font-semibold ${
                      priorityStyles[selectedTicket.priority] || 'text-gray-400'
                    }`}
                  >
                    {selectedTicket.priority || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs ${
                      statusStyles[selectedTicket.status] ||
                      'border-gray-700 text-gray-400'
                    }`}
                  >
                    {(selectedTicket.status || 'UNKNOWN').replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Created Date</p>
                <p className="mt-1">
                  {formatDate(selectedTicket.created_at)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <div className="mt-2 min-h-20 rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm leading-6 text-gray-300">
                  {selectedTicket.description || 'No description available.'}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleEditClick(selectedTicket)}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 py-3 font-medium hover:bg-yellow-500"
            >
              <Pencil size={17} />
              Edit Ticket
            </button>

            <button
              onClick={() => setSelectedTicket(null)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium hover:bg-blue-500"
            >
              <ArrowLeft size={17} />
              Back to Tickets
            </button>
          </div>
        </div>
      )}

      {/* EDIT TICKET MODAL */}
      {editingTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={() => !updating && setEditingTicket(null)}
        >
          <div
            className="my-8 w-full max-w-xl rounded-2xl border border-gray-700 bg-[#111827] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Edit Ticket</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Update ticket #{editingTicket.id}
                </p>
              </div>

              <button
                type="button"
                disabled={updating}
                onClick={() => setEditingTicket(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"
              >
                <X size={21} />
              </button>
            </div>

            {editError && (
              <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateTicket} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ticket Title
                </label>

                <input
                  required
                  maxLength={200}
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  required
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Category
                  </label>

                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        category: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="NETWORK">Network</option>
                    <option value="ACCOUNT">Account Access</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Priority
                  </label>

                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        priority: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ticket Status
                </label>

                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => setEditingTicket(null)}
                  className="flex-1 rounded-xl border border-gray-700 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
