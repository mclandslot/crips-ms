/* =====================================
   SHARED REALTIME HELPER

   Every admin table that has to stay live subscribes through here, so
   the debounce, the channel bookkeeping and the status logging are
   written once.

   Remember the database side: a table that is not in the
   supabase_realtime publication delivers nothing, and the channel still
   reports SUBSCRIBED - see supabase/policies/realtime_publication.sql.
===================================== */
(function () {
  const realtimeClient = window.supabaseClient;

  const openChannels = new Map();
  const refreshTimers = new Map();

  /**
   * name    unique channel name, also the key used to replace it
   * tables  public tables to watch, all events
   * onChange called after the changes settle
   * delay   debounce window in ms
   */
  window.subscribeRealtime = function ({ name, tables, onChange, delay = 300 }) {
    if (!realtimeClient?.channel) {
      console.error("Realtime: supabase client is not ready.");
      return null;
    }

    if (!name || !Array.isArray(tables) || !tables.length || typeof onChange !== "function") {
      console.error("Realtime: subscribeRealtime called with bad arguments.");
      return null;
    }

    /* one channel per name: calling this again replaces the old
       subscription instead of stacking a second one on top of it */
    const existing = openChannels.get(name);
    if (existing) {
      realtimeClient.removeChannel(existing);
      openChannels.delete(name);
    }

    const channel = realtimeClient.channel(name);

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => queueRefresh(name, onChange, delay)
      );
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`Realtime channel "${name}":`, status);
      }
    });

    openChannels.set(name, channel);
    return channel;
  };

  /* saving one record can touch several rows - a class of marks arrives
     as one event per row - so the reload is collapsed into a single pass */
  function queueRefresh(name, onChange, delay) {
    clearTimeout(refreshTimers.get(name));

    refreshTimers.set(
      name,
      setTimeout(async () => {
        try {
          await onChange();
        } catch (err) {
          console.error(`Realtime refresh failed for "${name}":`, err);
        }
      }, delay)
    );
  }
})();
