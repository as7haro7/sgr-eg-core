export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("Registered instrumentation for Node.js runtime.");
    
    // Only run cron on the main server process, not during build
    if (process.env.npm_lifecycle_event !== "build") {
      const { AlertEngineService } = await import("@/modules/alerts/services/alert-engine.service");
      const alertEngine = new AlertEngineService();
      
      // Run every hour (3600000 ms). For demo purposes we could do every minute, but an hour is realistic.
      // Wait 10 seconds before the first run to allow DB to be fully connected and app started
      setTimeout(() => {
        console.log("Starting Alert Engine Cron...");
        
        // Initial run
        alertEngine.runEngine().catch(err => console.error("Alert Engine Cron Error:", err));
        
        // Periodic run
        setInterval(() => {
          console.log("Running Alert Engine Cron...");
          alertEngine.runEngine().catch(err => console.error("Alert Engine Cron Error:", err));
        }, 1000 * 60 * 60); // 1 hour
      }, 10000);
    }
  }
}
