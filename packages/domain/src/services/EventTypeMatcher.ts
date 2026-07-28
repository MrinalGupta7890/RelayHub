export class EventTypeMatcher {
  /**
   * Evaluates if a given eventType matches any of the provided filters.
   * Filters can use glob-style wildcards (e.g., 'payment.*' or '*').
   */
  public static matchesAny(eventType: string, filters: string[]): boolean {
    if (!filters || filters.length === 0) {
      return false; // No filters = no match (safe default)
    }

    for (const filter of filters) {
      if (this.matches(eventType, filter)) {
        return true;
      }
    }
    return false;
  }

  private static matches(eventType: string, filter: string): boolean {
    if (filter === "*") {
      return true;
    }
    if (filter === eventType) {
      return true;
    }
    
    // Escape regex characters except '*'
    const escaped = filter.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const regexStr = "^" + escaped.replace(/\*/g, ".*") + "$";
    const regex = new RegExp(regexStr);
    
    return regex.test(eventType);
  }
}
