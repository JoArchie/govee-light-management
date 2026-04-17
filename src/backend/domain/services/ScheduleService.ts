import {
  ScheduledAction,
  ScheduledActionJSON,
} from "../entities/ScheduledAction";

/**
 * Domain service for managing scheduled actions.
 * Handles registration, retrieval, and querying of scheduled lighting actions.
 * Does NOT handle the actual triggering — that's the SchedulerEngine's job.
 */
export class ScheduleService {
  private actions = new Map<string, ScheduledAction>();

  /**
   * Register a new scheduled action.
   * Throws if an action with the same ID already exists.
   */
  register(action: ScheduledAction): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with ID '${action.id}' already exists`);
    }
    this.actions.set(action.id, action);
  }

  /**
   * Update an existing scheduled action.
   * Throws if the action doesn't exist.
   */
  update(action: ScheduledAction): void {
    if (!this.actions.has(action.id)) {
      throw new Error(`Action with ID '${action.id}' not found`);
    }
    this.actions.set(action.id, action);
  }

  /**
   * Remove a scheduled action by ID.
   * Returns true if the action existed and was removed.
   */
  remove(id: string): boolean {
    return this.actions.delete(id);
  }

  /**
   * Get a scheduled action by ID.
   */
  get(id: string): ScheduledAction | undefined {
    return this.actions.get(id);
  }

  /**
   * Get all registered scheduled actions.
   */
  getAll(): ScheduledAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get only enabled scheduled actions.
   */
  getEnabled(): ScheduledAction[] {
    return this.getAll().filter((a) => a.isEnabled());
  }

  /**
   * Get upcoming actions sorted by next trigger time (earliest first).
   * Excludes disabled actions and actions with no upcoming trigger.
   */
  getUpcoming(): ScheduledAction[] {
    return this.getEnabled()
      .filter((a) => a.nextTriggerAt() !== null)
      .sort((a, b) => {
        const aTime = a.nextTriggerAt()!.getTime();
        const bTime = b.nextTriggerAt()!.getTime();
        return aTime - bTime;
      });
  }

  /**
   * Get actions whose trigger time has passed (and are ready to fire).
   */
  getDueActions(now: Date = new Date()): ScheduledAction[] {
    return this.getEnabled().filter((a) => {
      const next = a.nextTriggerAt();
      return next !== null && next.getTime() <= now.getTime();
    });
  }

  /**
   * Remove all scheduled actions.
   */
  clear(): void {
    this.actions.clear();
  }

  /**
   * Load scheduled actions from JSON (bulk restore from persistence).
   * Replaces all current actions.
   */
  loadFromJSON(jsonList: ScheduledActionJSON[]): void {
    this.clear();
    jsonList.forEach((json) => {
      try {
        const action = ScheduledAction.fromJSON(json);
        this.actions.set(action.id, action);
      } catch {
        // Skip invalid entries during deserialization
      }
    });
  }

  /**
   * Export all scheduled actions to JSON for persistence.
   */
  exportToJSON(): ScheduledActionJSON[] {
    return this.getAll().map((a) => a.toJSON());
  }
}
