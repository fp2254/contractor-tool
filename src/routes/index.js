import profileRoutes from "./profile.js";
import clientsRoutes from "./clients.js";
import paymentRoutes from "./payment.js";
import inventoryRoutes from "./inventory.js";
import calendarRoutes from "./calendar.js";
import jobsRoutes from "./jobs.js";
import messagesRoutes from "./messages.js";
import adminRoutes from "./admin.js";
import tradeContactsRoutes from "./trade_contacts.js";
import jobMaterialsRoutes from "./job_materials.js";

export function registerRoutes(app) {
  app.use("/api/profile", profileRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api", paymentRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/calendar-events", calendarRoutes);
  app.use("/api/jobs", jobsRoutes);
  app.use("/api/jobs/:jobId/materials", jobMaterialsRoutes);
  app.use("/api/messages", messagesRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/trade-contacts", tradeContactsRoutes);
}
