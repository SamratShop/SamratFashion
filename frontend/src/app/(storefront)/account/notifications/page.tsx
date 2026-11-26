"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  CheckCheck,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import {
  isPushSupported,
  isSubscribedToPush,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushNotifications";

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

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "ORDER_CONFIRMED":
    case "ORDER_CREATED":
      return <Package className="w-5 h-5 text-primary" />;
    case "ORDER_SHIPPED":
      return <Truck className="w-5 h-5 text-blue-600" />;
    case "ORDER_DELIVERED":
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    case "ORDER_CANCELLED":
      return <XCircle className="w-5 h-5 text-red-600" />;
    case "REFUND_PROCESSED":
      return <RotateCcw className="w-5 h-5 text-amber-600" />;
    case "MOCKUP_SENT":
    case "MOCKUP_APPROVED":
    case "MOCKUP_REVISION_REQUESTED":
      return <Sparkles className="w-5 h-5 text-purple-600" />;
    default:
      return <Package className="w-5 h-5 text-neutral-500" />;
  }
}

export default function CustomerNotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>("default");
  const router = useRouter();

  useEffect(() => {
    setPushSupported(isPushSupported());
    setPushPermission(getPushPermission());
    isSubscribedToPush().then((sub) => setIsPushSubscribed(sub)).catch(() => {});
  }, []);

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush();
        setIsPushSubscribed(false);
      } else {
        const res = await subscribeToPush();
        if (res.success) {
          setIsPushSubscribed(true);
          setPushPermission("granted");
        } else {
          setPushPermission(getPushPermission());
          alert(res.error || "Failed to enable browser notifications");
        }
      }
    } catch (err: any) {
      alert(err.message || "Notification error");
    } finally {
      setPushLoading(false);
    }
  };

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      if (res.data?.success && res.data.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, authLoading, router, loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/mark-read");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  if (authLoading || (!isAuthenticated && loading)) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 outline-none"
      >
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-surface-container rounded-lg" />
          <div className="h-64 bg-surface-container rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 sm:py-12 outline-none"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Account
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-headline-sm text-2xl font-bold text-on-surface">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/15 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Web Push Banner Control */}
        {pushSupported && (
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-on-surface">Browser Push Notifications</h2>
                  {isPushSubscribed ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-[10px] font-bold rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold rounded-full">
                      Off
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {isPushSubscribed
                    ? "You will receive order dispatch, delivery, and refund alerts even when this tab is closed."
                    : "Turn on browser notifications to get instant alerts on your device when your orders ship or deliver."}
                </p>
                {pushPermission === "denied" && (
                  <p className="text-[11px] text-amber-600 font-medium pt-1">
                    Notifications are blocked in your browser settings. Click the lock/tune icon in your address bar to allow.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 ${
                isPushSubscribed
                  ? "bg-surface border border-outline-variant text-red-600 hover:bg-red-50 hover:border-red-200"
                  : "bg-primary text-on-primary hover:bg-primary/90 shadow-xs"
              }`}
            >
              {pushLoading ? "Updating..." : isPushSubscribed ? "Turn Off" : "Turn On"}
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
          {loading ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 bg-surface-container rounded-full flex items-center justify-center mx-auto text-on-surface-variant">
                <Bell className="w-7 h-7 opacity-40" />
              </div>
              <h2 className="font-bold text-base text-on-surface">No notifications yet</h2>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                When you place orders or receive dispatch updates, you will receive real-time notifications here.
              </p>
              <div className="pt-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Explore Catalog
                </Link>
              </div>
            </div>
          ) : (
            notifications.map((item) => (
              <Link
                key={item._id}
                href={item.link || "/account/orders"}
                className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-surface-container/60 transition-colors block ${
                  !item.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="p-2.5 bg-surface border border-outline-variant/20 rounded-xl shrink-0 mt-0.5">
                  {getEventIcon(item.eventType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm ${!item.read ? "font-bold text-on-surface" : "font-medium text-on-surface"}`}>
                      {item.title || "Order Notification"}
                    </h3>
                    <span className="text-xs text-on-surface-variant font-mono shrink-0">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {item.message && (
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      {item.message}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 self-center" />
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
