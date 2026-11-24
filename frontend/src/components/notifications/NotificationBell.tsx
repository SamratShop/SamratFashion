"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface NotificationItem {
  _id: string;
  eventType: string;
  title?: string;
  message?: string;
  link?: string;
  read?: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

// Module-level in-memory cache to prevent redundant fetches on route navigation
let cachedNotifications: NotificationItem[] = [];
let cachedUnreadCount = 0;
let lastFetchedTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "ORDER_CONFIRMED":
    case "ORDER_CREATED":
      return <Package className="w-4 h-4 text-primary" />;
    case "ORDER_SHIPPED":
      return <Truck className="w-4 h-4 text-blue-600" />;
    case "ORDER_DELIVERED":
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case "ORDER_CANCELLED":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "REFUND_PROCESSED":
      return <RotateCcw className="w-4 h-4 text-amber-600" />;
    case "MOCKUP_SENT":
    case "MOCKUP_APPROVED":
    case "MOCKUP_REVISION_REQUESTED":
      return <Sparkles className="w-4 h-4 text-purple-600" />;
    default:
      return <Package className="w-4 h-4 text-neutral-500" />;
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(cachedNotifications);
  const [unreadCount, setUnreadCount] = useState(cachedUnreadCount);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    const now = Date.now();
    if (!force && now - lastFetchedTimestamp < CACHE_TTL_MS && cachedNotifications.length > 0) {
      setNotifications(cachedNotifications);
      setUnreadCount(cachedUnreadCount);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get("/notifications");
      if (res.data?.success && res.data.data) {
        const items = res.data.data.notifications || [];
        const count = res.data.data.unreadCount || 0;
        cachedNotifications = items;
        cachedUnreadCount = count;
        lastFetchedTimestamp = Date.now();
        setNotifications(items);
        setUnreadCount(count);
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Non-blocking deferred initial fetch and 60-second polling for signed-in customer
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    // Defer initial fetch by 800ms to allow critical page elements & images to load first
    const initTimer = setTimeout(() => {
      fetchNotifications();
    }, 800);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications(true);
      }
    }, 60000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [mounted, isAuthenticated, fetchNotifications]);

  // Mark-as-read on open
  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) {
      // Fetch fresh notifications when opened
      fetchNotifications(true);
    }

    if (nextOpen && unreadCount > 0) {
      try {
        await api.patch("/notifications/mark-read");
        cachedUnreadCount = 0;
        cachedNotifications = cachedNotifications.map((n) => ({ ...n, read: true }));
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // Fail silently
      }
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch("/notifications/mark-read");
      cachedUnreadCount = 0;
      cachedNotifications = cachedNotifications.map((n) => ({ ...n, read: true }));
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Fail silently
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    } else {
      router.push("/account/orders");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!mounted || !isAuthenticated) {
    return null;
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className="relative p-2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer rounded-full hover:bg-surface-container/50 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-600 text-white min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-mono text-[9px] font-bold shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Notifications list"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 bg-surface/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-on-surface">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/15">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center mx-auto text-on-surface-variant">
                  <Bell className="w-5 h-5 opacity-40" />
                </div>
                <p className="font-bold text-xs text-on-surface">No notifications yet</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  When your orders are placed, shipped, or delivered, you will get instant updates here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left p-3.5 hover:bg-surface-container/60 transition-colors flex items-start gap-3 cursor-pointer ${
                    !item.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="p-2 bg-surface border border-outline-variant/20 rounded-xl shrink-0 mt-0.5">
                    {getEventIcon(item.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${!item.read ? "font-bold text-on-surface" : "font-medium text-on-surface"}`}>
                        {item.title || "Order Update"}
                      </p>
                      <span className="text-[10px] text-on-surface-variant shrink-0 font-mono">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    {item.message && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                    )}
                  </div>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-outline-variant/20 bg-surface/40 flex items-center justify-between text-xs">
            <Link
              href="/account/notifications"
              onClick={() => setIsOpen(false)}
              className="text-primary font-bold hover:underline flex items-center gap-1 text-[11px]"
            >
              View all notifications <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="/account/orders"
              onClick={() => setIsOpen(false)}
              className="text-on-surface-variant hover:text-on-surface text-[11px]"
            >
              My Orders
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
