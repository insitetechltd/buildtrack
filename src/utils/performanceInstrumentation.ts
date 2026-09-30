/**
 * M-PERF-04: Field write-path performance instrumentation
 * 
 * Lightweight timing helper for measuring write-path latency.
 * Gated behind __DEV__ to avoid production noise.
 */

export interface PerformanceMarker {
  label: string;
  timestamp: number;
  duration?: number;
}

export interface PerformanceMeasurement {
  operation: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  markers: PerformanceMarker[];
}

class PerformanceInstrumentation {
  private measurements = new Map<string, PerformanceMeasurement>();
  private enabled: boolean;

  constructor() {
    // Only enable in __DEV__ mode
    this.enabled = __DEV__;
  }

  /**
   * Start measuring a write-path operation
   */
  start(operation: string): void {
    if (!this.enabled) return;

    const measurement: PerformanceMeasurement = {
      operation,
      startTime: Date.now(),
      markers: [],
    };

    this.measurements.set(operation, measurement);
    
    if (__DEV__) {
      console.log(`⏱️ [PERF] Starting: ${operation}`);
    }
  }

  /**
   * Mark a stage within an operation
   */
  mark(operation: string, label: string): void {
    if (!this.enabled) return;

    const measurement = this.measurements.get(operation);
    if (!measurement) {
      console.warn(`⚠️ [PERF] No measurement found for: ${operation}`);
      return;
    }

    const timestamp = Date.now();
    const previousMarker = measurement.markers[measurement.markers.length - 1];
    const duration = previousMarker 
      ? timestamp - previousMarker.timestamp
      : timestamp - measurement.startTime;

    measurement.markers.push({
      label,
      timestamp,
      duration,
    });

    if (__DEV__) {
      console.log(`  ⏱️ [PERF] ${operation} → ${label}: ${duration}ms`);
    }
  }

  /**
   * End measurement and log summary
   */
  end(operation: string): void {
    if (!this.enabled) return;

    const measurement = this.measurements.get(operation);
    if (!measurement) {
      console.warn(`⚠️ [PERF] No measurement found for: ${operation}`);
      return;
    }

    measurement.endTime = Date.now();
    measurement.totalDuration = measurement.endTime - measurement.startTime;

    if (__DEV__) {
      console.log(`✅ [PERF] Complete: ${operation} (${measurement.totalDuration}ms)`);
      console.log('  Breakdown:');
      measurement.markers.forEach((marker, index) => {
        const elapsed = marker.timestamp - measurement.startTime;
        console.log(`    ${index + 1}. ${marker.label}: ${marker.duration}ms (elapsed: ${elapsed}ms)`);
      });
    }

    // Keep measurement for analysis
  }

  /**
   * Cancel a measurement (e.g., on error)
   */
  cancel(operation: string): void {
    if (!this.enabled) return;

    const measurement = this.measurements.get(operation);
    if (measurement) {
      if (__DEV__) {
        const elapsed = Date.now() - measurement.startTime;
        console.log(`❌ [PERF] Cancelled: ${operation} (${elapsed}ms elapsed)`);
      }
      this.measurements.delete(operation);
    }
  }

  /**
   * Get all measurements for analysis
   */
  getMeasurements(): PerformanceMeasurement[] {
    return Array.from(this.measurements.values());
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }

  /**
   * Export measurements as JSON for debugging
   */
  exportJson(): string {
    const data = Array.from(this.measurements.values());
    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const perf = new PerformanceInstrumentation();

/**
 * Convenience wrapper to measure an async operation
 */
export async function measureAsync<T>(
  operation: string,
  fn: (marker: (label: string) => void) => Promise<T>
): Promise<T> {
  perf.start(operation);
  const marker = (label: string) => perf.mark(operation, label);
  
  try {
    const result = await fn(marker);
    perf.end(operation);
    return result;
  } catch (error) {
    perf.cancel(operation);
    throw error;
  }
}
