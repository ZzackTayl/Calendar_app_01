/**
 * Minimal demo store stub to prevent build failures
 * This is a temporary solution to allow deployment after removing demo functionality
 */

export const DemoStore = {
  // Stub methods to prevent build failures
  listRelationships: () => [],
  listEvents: () => [],
  getRelationship: () => null,
  getEvent: () => null,
  addRelationship: () => {},
  addEvent: () => {},
  updateRelationship: () => {},
  updateEvent: () => {},
  deleteRelationship: () => {},
  deleteEvent: () => {},
  reset: () => {},
  seedSampleData: () => {},
};

// Mock data for compatibility
class DemoStoreClass {
  static listRelationships() { return []; }
  static listEvents() { return []; }
  static getRelationship() { return null; }
  static getEvent() { return null; }
}

export default DemoStoreClass;
