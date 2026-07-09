"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleSlash,
  Download,
  LogOut,
  Plus,
  Ticket,
  Trash2,
} from "lucide-react";
import styles from "./DashboardApp.module.css";

const EMPTY_TICKET = {
  title: "",
  description: "",
  status: "open",
  priority: "not_priority",
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolve", label: "Resolve" },
  { value: "delete", label: "Delete" },
];

const PRIORITY_OPTIONS = [
  { value: "not_priority", label: "Not Priority" },
  { value: "medium", label: "Medium" },
  { value: "high_priority", label: "High Priority" },
  { value: "critical", label: "Critical" },
];

function normalizeStatus(value) {
  if (value === "closed") {
    return "resolve";
  }

  return value;
}

function normalizePriority(value) {
  if (value === "low") {
    return "not_priority";
  }

  if (value === "high") {
    return "high_priority";
  }

  return value;
}

export default function DashboardApp({ username }) {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState(EMPTY_TICKET);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function api(path, options) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  const loadProjects = useCallback(async () => {
    const data = await api("/api/projects");
    setProjects(data.projects || []);

    if (!selectedProjectId && data.projects?.length) {
      setSelectedProjectId(data.projects[0]._id);
    }
  }, [selectedProjectId]);

  const loadTickets = useCallback(async (projectId) => {
    if (!projectId) {
      setTickets([]);
      return;
    }

    const data = await api(`/api/tickets?projectId=${projectId}`);
    const normalizedTickets = (data.tickets || []).map((ticket) => ({
      ...ticket,
      status: normalizeStatus(ticket.status),
      priority: normalizePriority(ticket.priority),
    }));
    setTickets(normalizedTickets);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadProjects();
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadProjects]);

  useEffect(() => {
    let cancelled = false;

    async function refreshTickets() {
      if (!selectedProjectId) {
        setTickets([]);
        return;
      }

      try {
        await loadTickets(selectedProjectId);
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      }
    }

    refreshTickets();
    return () => {
      cancelled = true;
    };
  }, [loadTickets, selectedProjectId]);

  const selectedProjectName = useMemo(() => {
    return projects.find((project) => project._id === selectedProjectId)?.name || "";
  }, [projects, selectedProjectId]);

  const visibleTickets = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const statusMatches = statusFilter === "all" || ticket.status === statusFilter;

      if (!statusMatches) {
        return false;
      }

      if (!loweredQuery) {
        return true;
      }

      return (
        ticket.title.toLowerCase().includes(loweredQuery) ||
        ticket.description.toLowerCase().includes(loweredQuery)
      );
    });
  }, [query, statusFilter, tickets]);

  async function createProject(event) {
    event.preventDefault();
    setMessage("");

    try {
      const data = await api("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName }),
      });

      const newProjects = [data.project, ...projects];
      setProjects(newProjects);
      setProjectName("");
      setSelectedProjectId(data.project._id);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createTicket(event) {
    event.preventDefault();
    setMessage("");

    if (!selectedProjectId) {
      setMessage("Create a work group before adding tickets.");
      return;
    }

    try {
      await api("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ticketForm,
          projectId: selectedProjectId,
        }),
      });

      setTicketForm(EMPTY_TICKET);
      setShowNewTicket(false);
      await loadTickets(selectedProjectId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeTicket(ticketId) {
    setMessage("");

    try {
      await api(`/api/tickets/${ticketId}`, { method: "DELETE" });
      await loadTickets(selectedProjectId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateTicketField(ticketId, patch) {
    setMessage("");

    try {
      const data = await api(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      setTickets((previous) =>
        previous.map((ticket) =>
          ticket._id === ticketId
            ? {
                ...ticket,
                status: normalizeStatus(data.ticket.status),
                priority: normalizePriority(data.ticket.priority),
              }
            : ticket
        )
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeProject(projectId) {
    setMessage("");

    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      const nextProjects = projects.filter((project) => project._id !== projectId);
      setProjects(nextProjects);

      if (selectedProjectId === projectId) {
        setSelectedProjectId(nextProjects[0]?._id || "");
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function exportVisibleTickets() {
    if (!visibleTickets.length) {
      setMessage("No tickets to export for this filter.");
      return;
    }

    const header = ["title", "description", "status", "priority", "createdAt"];
    const rows = visibleTickets.map((ticket) => [
      ticket.title,
      ticket.description || "",
      ticket.status,
      ticket.priority,
      new Date(ticket.createdAt).toISOString(),
    ]);

    const toCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(toCell).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedProjectName || "tickets"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const statusTabs = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "resolve", label: "Resolve" },
    { key: "delete", label: "Delete" },
  ];

  if (loading) {
    return <p className={styles.loading}>Loading your tickets...</p>;
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.brandIdentity}>
            <div className={styles.brandMark}>TH</div>
            <div>
              <h2>Ticket Hub</h2>
              <p>{username}</p>
            </div>
          </div>
        </div>

        <div className={styles.navSection}>
          <p className={styles.navTitle}>Main</p>
          <button
            className={`${styles.navItem} ${styles.navItemActive}`}
            type="button"
            title="Tickets"
            aria-label="Tickets"
          >
            <Ticket size={16} />
            <span className={styles.navItemText}>Tickets</span>
          </button>
        </div>

        <div className={styles.projectPanel}>
          <div className={styles.panelHeaderLine}>
            <p>Work Groups</p>
          </div>
          <form className={styles.newProjectForm} onSubmit={createProject}>
            <input
              placeholder="Work 1"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              maxLength={40}
              required
            />
            <button type="submit" title="Add work group" aria-label="Add work group">
              <Plus size={15} />
            </button>
          </form>

          <div className={styles.projectList}>
            {projects.length === 0 ? <p className={styles.empty}>No work groups yet.</p> : null}
            {projects.map((project) => (
              <div
                key={project._id}
                className={`${styles.projectRow} ${
                  selectedProjectId === project._id ? styles.projectRowActive : ""
                }`}
              >
                <button
                  className={styles.projectSelect}
                  type="button"
                  onClick={() => setSelectedProjectId(project._id)}
                  aria-current={selectedProjectId === project._id ? "true" : "false"}
                >
                  <span className={styles.projectName}>{project.name}</span>
                </button>
                <button
                  className={styles.projectDelete}
                  type="button"
                  onClick={() => removeProject(project._id)}
                  title="Delete work group"
                  aria-label="Delete work group"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={logout}
          className={styles.logoutBtn}
          type="button"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={15} />
        </button>
      </aside>

      <main className={styles.mainPanel}>
        <header className={styles.tableHeader}>
          <div>
            <h1>Tickets</h1>
            <p>
              {selectedProjectName
                ? `Managing ${selectedProjectName}`
                : "Pick a work group to manage tickets"}
            </p>
          </div>
          <div className={styles.actionRow}>
            <button
              onClick={exportVisibleTickets}
              className={styles.secondaryAction}
              type="button"
              title="Export tickets"
              aria-label="Export tickets"
            >
              <Download size={15} />
            </button>
            <button
              onClick={() => setShowNewTicket((previous) => !previous)}
              className={styles.primaryAction}
              type="button"
              disabled={!selectedProjectId}
              title="Create ticket"
              aria-label="Create ticket"
            >
              {showNewTicket ? <CircleSlash size={15} /> : <Plus size={15} />}
            </button>
          </div>
        </header>

        {message ? <p className={styles.message}>{message}</p> : null}

        <section className={styles.toolsRow}>
          <div className={styles.tabs}>
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`${styles.tab} ${statusFilter === tab.key ? styles.tabActive : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            className={styles.search}
            placeholder="Search title or note"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </section>

        {showNewTicket ? (
          <form className={styles.ticketForm} onSubmit={createTicket}>
            <input
              placeholder="Ticket title"
              value={ticketForm.title}
              maxLength={80}
              onChange={(event) =>
                setTicketForm((previous) => ({ ...previous, title: event.target.value }))
              }
              required
            />
            <textarea
              placeholder="Small note (optional)"
              value={ticketForm.description}
              maxLength={280}
              onChange={(event) =>
                setTicketForm((previous) => ({ ...previous, description: event.target.value }))
              }
              rows={2}
            />
            <div className={styles.formRow}>
              <select
                value={ticketForm.status}
                onChange={(event) =>
                  setTicketForm((previous) => ({ ...previous, status: event.target.value }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={ticketForm.priority}
                onChange={(event) =>
                  setTicketForm((previous) => ({ ...previous, priority: event.target.value }))
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="submit">Create</button>
            </div>
          </form>
        ) : null}

        <section className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Title</span>
            <span>Description</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {visibleTickets.length === 0 ? <p className={styles.empty}>No matching tickets.</p> : null}

          {visibleTickets.map((ticket) => (
            <article key={ticket._id} className={styles.ticketRow}>
              <p className={styles.ticketTitle}>{ticket.title}</p>
              <p className={styles.ticketDesc}>{ticket.description || "-"}</p>
              <select
                className={`${styles.inlineSelect} ${styles[`priority${ticket.priority}`]}`}
                value={ticket.priority}
                onChange={(event) =>
                  updateTicketField(ticket._id, { priority: normalizePriority(event.target.value) })
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className={`${styles.inlineSelect} ${styles[`status${ticket.status.replace("_", "")}`]}`}
                value={ticket.status}
                onChange={(event) =>
                  updateTicketField(ticket._id, { status: normalizeStatus(event.target.value) })
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.deleteAction}
                onClick={() => removeTicket(ticket._id)}
                title="Hard delete ticket"
                aria-label="Hard delete ticket"
              >
                <Trash2 size={14} />
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
