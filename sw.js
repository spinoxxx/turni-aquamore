self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Promemoria mansione", body: "Hai una mansione da completare." };
  }

  event.waitUntil(self.registration.showNotification(data.title || "Promemoria mansione", {
    body: data.body || "Hai una mansione da completare.",
    icon: "/anteprima-turni.png",
    badge: "/anteprima-turni.png",
    data: { url: data.url || "/" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    const current = clientList.find((client) => client.url.includes(self.location.origin));
    if (current) return current.focus();
    return clients.openWindow(url);
  }));
});
